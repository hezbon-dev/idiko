/**
 * Mpesa STK Push Callback Handler
 */

const fs = require("fs");
const path = require("path");

// Cleanup rules

const FAILED_RETENTION_MS =
  24 * 60 * 60 * 1000; // 24 hours

const PAID_RETENTION_MS =
  30 * 24 * 60 * 60 * 1000; // 30 days

 function cleanupOldPayments(payments) {

  const now = Date.now();

  return payments.filter(payment => {

    // Remove failed records older than 24 hours

    if (
      payment.status === "failed" &&
      payment.failedAt
    ) {

      const age =
        now - new Date(payment.failedAt).getTime();

      return age < FAILED_RETENTION_MS;
    }

    // Remove paid records older than 30 days

    if (
      payment.status === "paid" &&
      payment.paidAt
    ) {

      const age =
        now - new Date(payment.paidAt).getTime();

      return age < PAID_RETENTION_MS;
    }

    // Keep pending records

    return true;
  });
} 
 
// Helper function to update payment status
async function updatePaymentStatus(
  checkoutRequestID,
  accountReference,
  paymentData
) {
  const FILE_PATH = path.join(__dirname, "payments.json");

  // ✅ ENSURE FILE EXISTS
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, "[]");
    console.log("📂 payments.json created");
  }

  let payments = [];

  try {
    const fileData = fs.readFileSync(FILE_PATH, "utf8");

    payments =
      fileData && fileData.trim() !== ""
        ? JSON.parse(fileData)
        : [];

    if (!Array.isArray(payments)) {
      payments = [];
    }

  } catch (err) {
    console.error("❌ Failed to read payments file", err);
    payments = [];
  }

  console.log("📦 PAYMENTS BEFORE UPDATE:", payments);

  payments = cleanupOldPayments(payments);

console.log(
  "🧹 OLD PAYMENT RECORDS CLEANED"
);

  // Update or add the payment
  const existingIndex = payments.findIndex(
    p => p.checkoutRequestID === checkoutRequestID
  );

  const paymentRecord = {
    checkoutRequestID,
    accountReference,
    status: "paid",
    amount: paymentData.Amount,
    mpesaReceipt: paymentData.MpesaReceiptNumber,
    phone: paymentData.PhoneNumber,
    transactionDate: paymentData.TransactionDate,
    paidAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    payments[existingIndex] = {
      ...payments[existingIndex],
      ...paymentRecord,
    };

    console.log("♻️ Existing payment updated to PAID");

  } else {
    payments.push(paymentRecord);

    console.log("🆕 New PAID payment added");
  }

  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(payments, null, 2));

    console.log("✅ PAYMENT STATUS UPDATED");

    // 🔥 UPDATE FIRESTORE RECORD
    try {
      const admin = require("firebase-admin");

      const db = admin.firestore();

      const normalizedId = String(accountReference).trim();

console.log("🔍 SEARCHING FIRESTORE FOR ID:", normalizedId);

// 🔥 UPDATE records COLLECTION
const recordsSnapshot = await db
  .collection("records")
  .where("idNumber", "==", normalizedId)
  .get();

console.log("📦 RECORDS MATCHES:", recordsSnapshot.size);

if (recordsSnapshot.empty) {
  console.log("❌ NO RECORDS FIRESTORE RECORD FOUND FOR:", normalizedId);
} else {
  for (const firestoreDoc of recordsSnapshot.docs) {

    console.log("✅ MATCHED records DOC:", firestoreDoc.id);

    await firestoreDoc.ref.update({
      status: "Paid",
      paidAt: new Date().toISOString(),
    });

    console.log("🔥 records RECORD UPDATED:", firestoreDoc.id);
  }
}

// 🔥 UPDATE allHistoryRecords COLLECTION
const historySnapshot = await db
  .collection("allHistoryRecords")
  .where("idNumber", "==", normalizedId)
  .get();

console.log("📦 HISTORY MATCHES:", historySnapshot.size);

if (historySnapshot.empty) {
  console.log("❌ NO HISTORY FIRESTORE RECORD FOUND FOR:", normalizedId);
} else {
  for (const firestoreDoc of historySnapshot.docs) {

    console.log("✅ MATCHED history DOC:", firestoreDoc.id);

    await firestoreDoc.ref.update({
      status: "Paid",
      paidAt: new Date().toISOString(),
    });

    console.log("🔥 history RECORD UPDATED:", firestoreDoc.id);
  }
}

// 🔥 UPDATE notify_requests COLLECTION
const notifySnapshot = await db
  .collection("notify_requests")
  .where("idNumber", "==", normalizedId)
  .get();

console.log("📦 NOTIFY REQUEST MATCHES:", notifySnapshot.size);

if (notifySnapshot.empty) {
  console.log(
    "❌ NO notify_requests RECORD FOUND FOR:",
    normalizedId
  );
} else {
  for (const firestoreDoc of notifySnapshot.docs) {

    console.log(
      "✅ MATCHED notify_requests DOC:",
      firestoreDoc.id
    );

    await firestoreDoc.ref.update({
      status: "Paid",
      paidAt: new Date().toISOString(),
    });

    console.log(
      "🔥 notify_requests RECORD UPDATED:",
      firestoreDoc.id
    );
  }
}

    } catch (err) {
      console.error("❌ FIRESTORE PAYMENT UPDATE FAILED", err);
    }

    console.log("📦 UPDATED RECORD:", paymentRecord);
    console.log("📦 PAYMENTS AFTER UPDATE:", payments);

  } catch (err) {
    console.error("❌ Failed to write payments file", err);
  }
}

// Route handler
function mpesaCallback(req, res) {
  console.log("🔥 MPESA CALLBACK RECEIVED");
  console.log("📩 FULL CALLBACK BODY:");
  console.dir(req.body, { depth: null });

  try {
    const callback = req.body?.Body?.stkCallback;

    if (!callback) {
      console.error("❌ Invalid callback structure");
      return res.status(400).json({ ResultCode: 1 });
    }

    const {
      ResultCode,
      ResultDesc,
      CheckoutRequestID,
      CallbackMetadata,
    } = callback;

    console.log("📌 ResultCode:", ResultCode);
    console.log("📌 ResultDesc:", ResultDesc);
    console.log("📌 CheckoutRequestID:", CheckoutRequestID);

    // ❌ Payment cancelled or failed
if (ResultCode !== 0) {

  console.warn("❌ PAYMENT FAILED OR CANCELLED");

  const FILE_PATH = path.join(__dirname, "payments.json");

  try {

    let payments = [];

    if (fs.existsSync(FILE_PATH)) {
      payments = JSON.parse(
        fs.readFileSync(FILE_PATH, "utf8") || "[]"
      );
    }

    payments = cleanupOldPayments(payments);

    const paymentIndex = payments.findIndex(
      p => p.checkoutRequestID === CheckoutRequestID
    );

    if (paymentIndex >= 0) {

      payments[paymentIndex].status = "failed";

      payments[paymentIndex].failedAt =
        new Date().toISOString();

      payments[paymentIndex].failureCode = ResultCode;

      payments[paymentIndex].failureReason = ResultDesc;

      fs.writeFileSync(
        FILE_PATH,
        JSON.stringify(payments, null, 2)
      );

      console.log(
        "❌ PAYMENT MARKED FAILED:",
        CheckoutRequestID
      );
    }

  } catch (err) {
    console.error(
      "❌ FAILED TO UPDATE FAILED PAYMENT",
      err
    );
  }

  return res.status(200).json({ ResultCode: 0 });
}

    // ✅ Payment successful
    console.log("✅ PAYMENT SUCCESSFUL");

    let paymentData = {};

    if (CallbackMetadata && CallbackMetadata.Item) {

      if (CallbackMetadata?.Item) {
        CallbackMetadata.Item.forEach((item) => {
          paymentData[item.Name] =
            item.Value !== undefined ? item.Value : null;
        });
      }

    }

    console.log("💰 PAYMENT DETAILS:");
    console.log("➡️ Amount:", paymentData.Amount);
    console.log("➡️ MpesaReceipt:", paymentData.MpesaReceiptNumber);
    console.log("➡️ Phone:", paymentData.PhoneNumber);
    console.log("➡️ TransactionDate:", paymentData.TransactionDate);

    // ✅ Find existing payment and preserve accountReference
    const FILE_PATH = path.join(__dirname, "payments.json");

    // ✅ ENSURE FILE EXISTS
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, "[]");
      console.log("📂 payments.json created");
    }

    let payments = [];

    try {
      const fileData = fs.readFileSync(FILE_PATH, "utf8");

      payments =
        fileData && fileData.trim() !== ""
          ? JSON.parse(fileData)
          : [];

      if (!Array.isArray(payments)) {
        payments = [];
      }

    } catch (err) {
      console.error("❌ Failed to read payments file", err);
      payments = [];
    }

    console.log("📦 PAYMENTS FOUND:", payments);

    const existingPayment = payments.find(
      p => p.checkoutRequestID === CheckoutRequestID
    );

    console.log("🔍 MATCHED PAYMENT:", existingPayment);

    const accountReference =
      existingPayment?.accountReference || "unknown";

    console.log("📌 ACCOUNT REFERENCE:", accountReference);

    updatePaymentStatus(
      CheckoutRequestID,
      accountReference,
      paymentData
    );

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Success",
    });

  } catch (error) {
    console.error("❌ CALLBACK PROCESSING ERROR");
    console.error(error);

    return res.status(500).json({ ResultCode: 1 });
  }
}

// Extra route to allow frontend polling
function getPaymentStatus(req, res) {
  const { checkoutRequestID } = req.params;

  const FILE_PATH = path.join(__dirname, "payments.json");

  // ✅ ENSURE FILE EXISTS
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, "[]");
    console.log("📂 payments.json created");
  }

  let payments = [];

  try {
    const fileData = fs.readFileSync(FILE_PATH, "utf8");

    payments =
      fileData && fileData.trim() !== ""
        ? JSON.parse(fileData)
        : [];

    if (!Array.isArray(payments)) {
      payments = [];
    }

  } catch (err) {
    console.error("❌ Failed to read payments file", err);
    payments = [];
  }

  payments = cleanupOldPayments(payments);

  fs.writeFileSync(
  FILE_PATH,
  JSON.stringify(payments, null, 2)
);

  const matchingPayments = payments.filter(
  p => p.accountReference === checkoutRequestID
);

const matchingPayments = payments.filter(
  p => p.accountReference === checkoutRequestID
);

console.log("🔥 STATUS REQUEST FOR:", checkoutRequestID);

console.log("🔥 PAYMENTS FILE CONTENT:");
console.log(JSON.stringify(payments, null, 2));

console.log("🔥 MATCHING PAYMENTS:");
console.log(JSON.stringify(matchingPayments, null, 2));

// ✅ PAID HAS HIGHEST PRIORITY

const paidPayment = matchingPayments.find(
  p => p.status === "paid"
);

if (paidPayment) {

  console.log(
    `📡 STATUS CHECK: ${checkoutRequestID} -> paid`
  );

  return res.json({
    status: "paid",
  });
}

// ✅ THEN PENDING

const pendingPayment = matchingPayments.find(
  p => p.status === "pending"
);

if (pendingPayment) {

  console.log(
    `📡 STATUS CHECK: ${checkoutRequestID} -> pending`
  );

  return res.json({
    status: "pending",
  });
}

// ✅ THEN FAILED

const failedPayment = matchingPayments.find(
  p => p.status === "failed"
);

if (failedPayment) {

  console.log(
    `📡 STATUS CHECK: ${checkoutRequestID} -> failed`
  );

  return res.json({
    status: "failed",
  });
}

return res.json({
  status: "pending",
});
}

module.exports = { mpesaCallback, getPaymentStatus };
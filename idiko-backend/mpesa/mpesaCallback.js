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

  // Validate the Firestore document ID first.
  const recordId = String(accountReference || "").trim();

  if (!recordId || recordId === "unknown") {
    throw new Error(
      `Cannot update payment: invalid accountReference "${recordId}"`
    );
  }

  // Read the existing payment records.
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, "[]");
    console.log("📂 payments.json created");
  }

  let payments;

  try {
    const fileData = fs.readFileSync(FILE_PATH, "utf8");
    payments =
      fileData && fileData.trim() !== ""
        ? JSON.parse(fileData)
        : [];

    if (!Array.isArray(payments)) {
      throw new Error("payments.json does not contain a valid array");
    }
  } catch (err) {
    console.error("❌ Failed to read payments file", err);
    throw err;
  }

  payments = cleanupOldPayments(payments);

  // Use one timestamp for the record and payment entry.
  const paidAt = new Date().toISOString();

  // 1. Update the actual record in Firestore FIRST.
  const admin = require("firebase-admin");
  const db = admin.firestore();

  const recordRef = db.collection("records").doc(recordId);
  const recordDoc = await recordRef.get();

  if (!recordDoc.exists) {
    throw new Error(
      `No Firestore record found for record ID: ${recordId}`
    );
  }

  await recordRef.update({
    status: "Paid",
    paidAt,
  });

  console.log("✅ Firestore record marked Paid:", recordId);

  // Update the matching history record if it exists.
  // A history update failure is logged but does not undo the
  // successful update of the main record.
  try {
    const historyRef = db
      .collection("allHistoryRecords")
      .doc(recordId);

    const historyDoc = await historyRef.get();

    if (historyDoc.exists) {
      await historyRef.update({
        status: "Paid",
        paidAt,
      });

      console.log("✅ History record marked Paid:", recordId);
    } else {
      console.log(
        "ℹ️ No history document found for record ID:",
        recordId
      );
    }
  } catch (err) {
    console.error("⚠️ History record update failed:", err);
  }

  // Update notification requests linked to this exact record.
try {
  const notificationSnapshot = await db
    .collection("notify_requests")
    .where("matchedRecordId", "==", recordId)
    .get();

  for (const notificationDoc of notificationSnapshot.docs) {
    await notificationDoc.ref.update({
      status: "Paid",
      paidAt,
    });

    console.log(
      "✅ Notification request marked Paid:",
      notificationDoc.id,
      "for record:",
      recordId
    );
  }

  if (notificationSnapshot.empty) {
    console.log(
      "ℹ️ No notification request linked to record:",
      recordId
    );
  }
} catch (err) {
  console.error(
    "⚠️ Notification request update failed:",
    err
  );
}

  // 2. Only after the main Firestore update succeeds,
  // mark the payment as paid in payments.json.
  const existingIndex = payments.findIndex(
    (p) => p.checkoutRequestID === checkoutRequestID
  );

  const paymentRecord = {
    checkoutRequestID,
    accountReference: recordId,
    status: "paid",
    amount: paymentData.Amount,
    mpesaReceipt: paymentData.MpesaReceiptNumber,
    phone: paymentData.PhoneNumber,
    transactionDate: paymentData.TransactionDate,
    paidAt,
  };

  if (existingIndex >= 0) {
    payments[existingIndex] = {
      ...payments[existingIndex],
      ...paymentRecord,
    };
  } else {
    payments.push(paymentRecord);
  }

  // If this write fails, throw an error rather than pretending
  // the payment-status file was updated successfully.
  fs.writeFileSync(FILE_PATH, JSON.stringify(payments, null, 2));

  console.log("✅ Payment status saved as PAID:", checkoutRequestID);
  console.log("📦 UPDATED PAYMENT:", paymentRecord);
}

// Route handler
  async function mpesaCallback(req, res) {
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
  console.error(
    "❌ Cannot safely process successful callback: payment mapping could not be read",
    err
  );

  // Do not guess which Firestore record received the payment.
  throw err;
}

    console.log("📦 PAYMENTS FOUND:", payments);

    if (!existingPayment?.accountReference) {
  throw new Error(
    `No payment mapping found for CheckoutRequestID: ${CheckoutRequestID}`
  );
}

    const existingPayment = payments.find(
      p => p.checkoutRequestID === CheckoutRequestID
    );

    console.log("🔍 MATCHED PAYMENT:", existingPayment);

    const accountReference =
      existingPayment?.accountReference || "unknown";

    console.log("📌 ACCOUNT REFERENCE:", accountReference);

await updatePaymentStatus(
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

  try {
    if (!fs.existsSync(FILE_PATH)) {
      return res.json({ status: "pending" });
    }

    const fileData = fs.readFileSync(FILE_PATH, "utf8");
    const payments = fileData.trim()
      ? JSON.parse(fileData)
      : [];

    if (!Array.isArray(payments)) {
      throw new Error(
        "payments.json does not contain a valid array"
      );
    }

    const payment = payments.find(
      (p) => p.checkoutRequestID === checkoutRequestID
    );

    if (!payment) {
      return res.json({ status: "pending" });
    }

    return res.json({
      status: payment.status || "pending",
    });
  } catch (err) {
    console.error(
      "❌ Failed to check payment status:",
      err
    );

    return res.status(500).json({
      status: "error",
      error: "Unable to check payment status",
    });
  }
}

module.exports = { mpesaCallback, getPaymentStatus };
/**
 * M-Pesa STK Push Callback Handler
 *
 * payments.json stores the checkout-to-claim mapping.

 *
 * Supported document types:
 *   - national_id
 *   - driving_license
 *   - birth_certificate
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const db = admin.firestore();

const FILE_PATH = path.join(__dirname, "payments.json");

const FAILED_RETENTION_MS = 24 * 60 * 60 * 1000;
const PAID_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeDocumentType(value) {
  const type = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    type === "driving_licence" ||
    type === "driving_license" ||
    type === "licence" ||
    type === "license"
  ) {
    return "driving_license";
  }

  if (
    type === "birth_certificate" ||
    type === "birth_cert"
  ) {
    return "birth_certificate";
  }

  if (
    type === "national_id" ||
    type === "national" ||
    type === "id"
  ) {
    return "national_id";
  }

  // Older records without documentType are treated as National IDs.
  return type || "national_id";
}

function cleanupOldPayments(payments) {
  const now = Date.now();

  return payments.filter((payment) => {
    if (payment.status === "failed" && payment.failedAt) {
      const age = now - new Date(payment.failedAt).getTime();
      return age < FAILED_RETENTION_MS;
    }

    if (payment.status === "paid" && payment.paidAt) {
      const age = now - new Date(payment.paidAt).getTime();
      return age < PAID_RETENTION_MS;
    }

    // Pending, processing and unknown outcomes are retained.
    return true;
  });
}

function readPaymentsFile() {
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, "[]");
    return [];
  }

  const contents = fs.readFileSync(FILE_PATH, "utf8");
  const payments = contents.trim() ? JSON.parse(contents) : [];

  if (!Array.isArray(payments)) {
    throw new Error("payments.json must contain a JSON array");
  }

  return payments;
}

function writePaymentsFile(payments) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(payments, null, 2));
}

function updatePaymentInFile(checkoutRequestID, updates) {
  let payments = cleanupOldPayments(readPaymentsFile());

  const index = payments.findIndex(
    (payment) =>
      payment.checkoutRequestID === checkoutRequestID
  );

  if (index === -1) {
    throw new Error(
      `No payments.json entry found for ${checkoutRequestID}`
    );
  }

  const existing = payments[index];

  // Never let a later failure callback downgrade a confirmed payment.
  if (
    String(existing.status || "").toLowerCase() === "paid" &&
    String(updates.status || "").toLowerCase() === "failed"
  ) {
    return existing;
  }

  payments[index] = {
    ...existing,
    ...updates,
  };

  writePaymentsFile(payments);

  return payments[index];
}

function findPaymentByCheckoutId(payments, checkoutRequestID) {
  const matches = payments.filter(
    (payment) =>
      payment.checkoutRequestID === checkoutRequestID
  );

  if (matches.length !== 1) {
    if (matches.length > 1) {
      console.error(
        "❌ Duplicate checkout IDs found in payments.json:",
        checkoutRequestID
      );
    }

    return null;
  }

  return matches[0];
}

async function updateFirestoreClaimAsPaid(payment, paymentData) {
  const recordId = String(payment.recordId || "").trim();

  if (!recordId) {
    throw new Error(
      "Payment mapping has no recordId; refusing to guess the claim"
    );
  }

  const documentType = normalizeDocumentType(
    payment.documentType
  );

  const paidAt = new Date().toISOString();
  const recordRef = db.collection("records").doc(recordId);
  const historyRef = db
    .collection("allHistoryRecords")
    .doc(recordId);

  const recordSnapshot = await recordRef.get();

  if (!recordSnapshot.exists) {
    throw new Error(
      `Claim record not found in records: ${recordId}`
    );
  }

  const record = recordSnapshot.data() || {};
  const actualType = normalizeDocumentType(
    record.documentType
  );

  // Check the stored payment mapping against the current record.
  if (
    payment.documentType &&
    actualType !== documentType
  ) {
    throw new Error(
      `Document type mismatch for record ${recordId}`
    );
  }

  if (
    payment.fullName &&
    String(record.fullName || "").trim().toLowerCase() !==
      String(payment.fullName).trim().toLowerCase()
  ) {
    throw new Error(
      `Claim name mismatch for record ${recordId}`
    );
  }

  // If the record is already paid, keep that status and do not downgrade it.
  const alreadyPaid =
    String(record.status || "").trim().toLowerCase() === "paid" ||
    String(record.paymentStatus || "").trim().toLowerCase() === "paid";

  if (!alreadyPaid) {
    await recordRef.update({
      status: "Paid",
      paidAt,
      mpesaReceipt: paymentData.MpesaReceiptNumber,
    });
  }

  // The upload flow stores the same record key in allHistoryRecords.
  try {
    const historySnapshot = await historyRef.get();

    if (historySnapshot.exists) {
      const historyData = historySnapshot.data() || {};
      const historyType = normalizeDocumentType(
        historyData.documentType
      );

      if (
        historyData.documentType &&
        historyType !== documentType
      ) {
        console.warn(
          "⚠️ History document type differs; leaving history unchanged:",
          recordId
        );
      } else {
        await historyRef.update({
          status: "Paid",
          paidAt,
        });
      }
    } else {
      console.log(
        "ℹ️ No allHistoryRecords document found for:",
        recordId
      );
    }
  } catch (error) {
    // Keep the main record paid even if the history update fails.
    console.error("⚠️ History record update failed:", error.message);
  }

  // Preferred notification linkage: exact record ID.
  try {
    const updatedNotificationIds = new Set();

    const linkedSnapshot = await db
      .collection("notify_requests")
      .where("matchedRecordId", "==", recordId)
      .get();

    for (const notificationDoc of linkedSnapshot.docs) {
      await notificationDoc.ref.update({
        status: "Paid",
        paidAt,
      });

      updatedNotificationIds.add(notificationDoc.id);
    }

    // Compatibility for older notification requests that were linked
    // by ID number instead of matchedRecordId.
    //
    // This fallback is only applicable when an ID number exists.
    // Document type and name are checked before changing any request.
    const idNumber = String(
      payment.idNumber || record.idNumber || ""
    ).trim();

    if (idNumber) {
      const legacySnapshot = await db
        .collection("notify_requests")
        .where("idNumber", "==", idNumber)
        .get();

      for (const notificationDoc of legacySnapshot.docs) {
        if (updatedNotificationIds.has(notificationDoc.id)) {
          continue;
        }

        const notification = notificationDoc.data() || {};

        const notificationType = normalizeDocumentType(
          notification.documentType
        );

        const typeMatches =
          !notification.documentType ||
          notificationType === documentType;

        const nameMatches =
          !notification.fullName ||
          String(notification.fullName).trim().toLowerCase() ===
            String(payment.fullName || record.fullName || "")
              .trim()
              .toLowerCase();

        if (typeMatches && nameMatches) {
          await notificationDoc.ref.update({
            status: "Paid",
            paidAt,
          });
        }
      }
    }
  } catch (error) {
    // A notification update failure must not undo the confirmed payment.
    console.error(
      "⚠️ Notification request update failed:",
      error.message
    );
  }

  console.log("✅ Firestore claim marked paid:", {
    recordId,
    documentType,
    fullName: payment.fullName || record.fullName || "",
  });

  return {
    recordId,
    documentType,
    fullName: payment.fullName || record.fullName || "",
    paidAt,
    alreadyPaid,
  };
}

async function markPaymentFailed(
  checkoutRequestID,
  resultCode,
  resultDescription
) {
  const payments = cleanupOldPayments(readPaymentsFile());
  const payment = findPaymentByCheckoutId(
    payments,
    checkoutRequestID
  );

  if (!payment) {
    throw new Error(
      `No unique payment mapping found for ${checkoutRequestID}`
    );
  }

  // Do not change an already-paid payment to failed.
  if (String(payment.status || "").toLowerCase() === "paid") {
    console.warn(
      "ℹ️ Ignoring failure callback for an already-paid payment:",
      checkoutRequestID
    );
    return;
  }

  updatePaymentInFile(checkoutRequestID, {
    status: "failed",
    failedAt: new Date().toISOString(),
    failureCode: resultCode,
    failureReason: resultDescription || "Payment failed",
  });

  console.log("❌ Payment marked failed:", checkoutRequestID);
}

async function markPaymentSuccessful(
  checkoutRequestID,
  paymentData
) {
  const payments = cleanupOldPayments(readPaymentsFile());
  const payment = findPaymentByCheckoutId(
    payments,
    checkoutRequestID
  );

  if (!payment) {
    throw new Error(
      `No unique payment mapping found for ${checkoutRequestID}`
    );
  }

  if (
    paymentData.Amount === undefined ||
    paymentData.Amount === null ||
    !paymentData.MpesaReceiptNumber
  ) {
    throw new Error(
      "Successful callback is missing Amount or MpesaReceiptNumber"
    );
  }

  // Validate the callback amount against the amount saved when the
  // STK Push was started.
  if (
    payment.amount !== undefined &&
    Number(payment.amount) !== Number(paymentData.Amount)
  ) {
    throw new Error(
      `Payment amount mismatch for ${checkoutRequestID}`
    );
  }

  // If the callback is a duplicate, keep the confirmed payment status.
  if (String(payment.status || "").toLowerCase() === "paid") {
    console.log(
      "ℹ️ Duplicate success callback; payment is already paid:",
      checkoutRequestID
    );
    return;
  }

  // Update Firestore using the exact saved recordId.
  const result = await updateFirestoreClaimAsPaid(
    payment,
    paymentData
  );

  // Update payments.json after the Firestore claim has been updated.
  updatePaymentInFile(checkoutRequestID, {
    status: "paid",
    amount: paymentData.Amount,
    mpesaReceipt: paymentData.MpesaReceiptNumber,
    phone: paymentData.PhoneNumber || payment.phone || null,
    transactionDate: paymentData.TransactionDate || null,
    paidAt: result.paidAt,
  });

  console.log("✅ Payment marked paid:", {
    checkoutRequestID,
    recordId: result.recordId,
    documentType: result.documentType,
  });
}

async function mpesaCallback(req, res) {
  console.log("🔥 MPESA CALLBACK RECEIVED");

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

    if (
      !CheckoutRequestID ||
      ResultCode === undefined ||
      ResultCode === null
    ) {
      console.error(
        "❌ Callback missing ResultCode or CheckoutRequestID"
      );

      return res.status(400).json({ ResultCode: 1 });
    }

    console.log("📌 ResultCode:", ResultCode);
    console.log("📌 ResultDesc:", ResultDesc);
    console.log("📌 CheckoutRequestID:", CheckoutRequestID);

    if (Number(ResultCode) !== 0) {
      await markPaymentFailed(
        CheckoutRequestID,
        ResultCode,
        ResultDesc
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Failure callback processed",
      });
    }

    const paymentData = {};
    const items = CallbackMetadata?.Item;

    if (Array.isArray(items)) {
      for (const item of items) {
        paymentData[item.Name] =
          item.Value !== undefined ? item.Value : null;
      }
    }

    console.log("💰 PAYMENT DETAILS:", {
      amount: paymentData.Amount,
      receipt: paymentData.MpesaReceiptNumber,
      phone: paymentData.PhoneNumber,
      transactionDate: paymentData.TransactionDate,
    });

    await markPaymentSuccessful(
      CheckoutRequestID,
      paymentData
    );

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Success",
    });
  } catch (error) {
    console.error("❌ CALLBACK PROCESSING ERROR:", error);

    // A mapping or Firestore failure must not be reported as processed.
    return res.status(500).json({
      ResultCode: 1,
      ResultDesc: "Callback processing failed",
    });
  }
}

/**
 * Poll using the actual CheckoutRequestID returned by the STK Push.
 * Example route: /mpesa/status/:checkoutRequestID
 */
function getPaymentStatus(req, res) {
  const checkoutRequestID = String(
    req.params.checkoutRequestID || ""
  ).trim();

  if (!checkoutRequestID) {
    return res.status(400).json({
      status: "error",
      error: "checkoutRequestID is required",
    });
  }

  try {
    const payments = cleanupOldPayments(readPaymentsFile());
    const payment = findPaymentByCheckoutId(
      payments,
      checkoutRequestID
    );

    if (!payment) {
      return res.json({ status: "pending" });
    }

    return res.json({
      status: payment.status || "pending",
      checkoutRequestID: payment.checkoutRequestID,
      recordId: payment.recordId || null,
      documentType: payment.documentType || "national_id",
      fullName: payment.fullName || null,
    });
  } catch (error) {
    console.error("❌ Failed to check payment status:", error.message);

    return res.status(500).json({
      status: "error",
      error: "Unable to check payment status",
    });
  }
}

module.exports = {
  mpesaCallback,
  getPaymentStatus,
};
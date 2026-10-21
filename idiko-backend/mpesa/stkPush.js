
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const { getMpesaAccessToken } = require("./mpesaAuth");
const { generateTimestamp, generatePassword } = require("./mpesaUtils");
const { reconcileSavedCallback } = require("./mpesaCallback");
const db = admin.firestore();

/**
 * Send STK Push with a Firestore payment lock.
 *
 * IMPORTANT:
 * - records/{recordId} is the claim document.
 * - paymentAttempts/{attemptId} stores each individual attempt.
 * - Only the callback should release a lock after confirmed failure.
 */
async function stkPush(req, res) {
  console.log("🔥 STK PUSH ROUTE HIT");

  const { phone, amount, accountReference } = req.body || {};
  const recordId = String(accountReference || "").trim();

  if (!phone || !amount || !recordId) {
    return res.status(400).json({
      success: false,
      error: "phone, amount and accountReference are required",
    });
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: "amount must be a valid positive number",
    });
  }

const rawPhone = String(phone ?? "").trim();

const normalizedPhone = rawPhone.startsWith("0")
  ? `254${rawPhone.slice(1)}`
  : rawPhone;

if (!/^254\d{9}$/.test(normalizedPhone)) {
  return res.status(400).json({
    success: false,
    error: "Enter a valid Kenyan phone number",
  });
}

  const recordRef = db.collection("records").doc(recordId);
  const attemptRef = db.collection("paymentAttempts").doc();

  let lockAcquired = false;
  let requestSentToSafaricom = false;

  try {
    // Get credentials before reserving the claim.
    const accessToken = await getMpesaAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(timestamp);

    // Reserve the claim atomically before sending an STK Push.
    await db.runTransaction(async (transaction) => {
      const recordSnapshot = await transaction.get(recordRef);

      if (!recordSnapshot.exists) {
        const error = new Error("Claim record was not found");
        error.statusCode = 404;
        throw error;
      }

      const record = recordSnapshot.data() || {};
      const currentStatus = String(record.status || "").toLowerCase();

      if (
        currentStatus === "paid" ||
        record.paymentStatus === "paid"
      ) {
        const error = new Error("This claim has already been paid");
        error.statusCode = 409;
        throw error;
      }

      // Do not allow a second attempt while the previous one is unresolved.
      if (
        record.paymentLockStatus === "pending" ||
        record.paymentLockStatus === "unknown" ||
        record.paymentLockStatus === "processing" ||
        (
          record.activePaymentAttemptId &&
          record.paymentLockStatus !== "failed"
        )
      ) {
        const error = new Error(
          "A previous payment is still being confirmed. Please wait before trying again."
        );
        error.statusCode = 409;
        throw error;
      }

      transaction.update(recordRef, {
        paymentLockStatus: "pending",
        activePaymentAttemptId: attemptRef.id,
        activeCheckoutRequestID: null,
        paymentLockUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.set(attemptRef, {
        attemptId: attemptRef.id,
        recordId,
        accountReference: recordId,
        phone: normalizedPhone,
        amount: numericAmount,
        status: "pending",
        checkoutRequestID: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    lockAcquired = true;

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: numericAmount,
      PartyA: normalizedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: recordId,
      TransactionDesc: "ID Claim Payment",
    };

    console.log("📤 Sending STK Push for claim:", recordId);

    requestSentToSafaricom = true;

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("✅ STK PUSH RESPONSE:", response.data);

    const checkoutRequestID = response.data?.CheckoutRequestID;
    const responseCode = String(response.data?.ResponseCode ?? "");

// Only an explicit nonzero response code confirms rejection.
// A missing checkout ID after an accepted response is ambiguous.
if (responseCode !== "0") {
  await db.runTransaction(async (transaction) => {
    const recordSnapshot = await transaction.get(recordRef);
    const attemptSnapshot = await transaction.get(attemptRef);

    if (!attemptSnapshot.exists) {
      throw new Error(
        "Cannot safely release payment lock: attempt not found"
      );
    }

    const attempt = attemptSnapshot.data() || {};

    if (attempt.status === "paid") {
      throw new Error(
        "Payment attempt is already paid; refusing to mark it failed"
      );
    }

    if (attempt.status !== "failed") {
      transaction.update(attemptRef, {
        status: "failed",
        failureReason:
          response.data?.ResponseDescription ||
          "Safaricom rejected the STK Push",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }


if (recordSnapshot.exists) {
  const record = recordSnapshot.data() || {};

  const recordIsPaid =
    String(record.status || "").toLowerCase() === "paid" ||
    String(record.paymentStatus || "").toLowerCase() === "paid" ||
    String(record.paymentLockStatus || "").toLowerCase() === "paid";

  if (recordIsPaid) {
    throw new Error(
      "Claim is already paid; refusing to change payment state"
    );
  }

  // Release only this attempt's lock, never another attempt's lock.
  if (record.activePaymentAttemptId === attemptRef.id) {
    transaction.update(recordRef, {
      paymentLockStatus: "failed",
      activePaymentAttemptId: null,
      activeCheckoutRequestID: null,
      paymentLockUpdatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

  });

  return res.status(502).json({
    success: false,
    error:
      response.data?.ResponseDescription ||
      "Safaricom rejected the payment request",
  });
}

if (!checkoutRequestID) {
  // Safaricom reported acceptance, but we cannot identify the transaction.
  // Keep the lock; never treat this as a confirmed failure.
  await db.runTransaction(async (transaction) => {
    const recordSnapshot = await transaction.get(recordRef);
    const attemptSnapshot = await transaction.get(attemptRef);

    if (attemptSnapshot.exists) {
      transaction.update(attemptRef, {
        status: "unknown",
        responseCode,
        responseDescription:
          response.data?.ResponseDescription || null,
        failureReason: "Accepted response did not include a checkout ID",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    if (
      recordSnapshot.exists &&
      recordSnapshot.data()?.activePaymentAttemptId === attemptRef.id
    ) {
      transaction.update(recordRef, {
        paymentLockStatus: "unknown",
        paymentLockUpdatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  return res.status(503).json({
    success: false,
    status: "unknown",
    error:
      "Safaricom may have accepted the request, but its transaction ID could not be confirmed. Do not retry; the payment needs reconciliation.",
  });
}

    // Attach the exact Safaricom checkout ID to the durable attempt.
    await db.runTransaction(async (transaction) => {
      const recordSnapshot = await transaction.get(recordRef);
      const attemptSnapshot = await transaction.get(attemptRef);

      if (!recordSnapshot.exists || !attemptSnapshot.exists) {
        throw new Error("Payment reservation could not be found");
      }

      const record = recordSnapshot.data() || {};

      if (record.activePaymentAttemptId !== attemptRef.id) {
        throw new Error(
          "Payment reservation changed unexpectedly; manual reconciliation required"
        );
      }

      transaction.update(attemptRef, {
        checkoutRequestID,
        merchantRequestID: response.data?.MerchantRequestID || null,
        responseCode,
        responseDescription: response.data?.ResponseDescription || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(recordRef, {
        activeCheckoutRequestID: checkoutRequestID,
        paymentLockUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // The checkout ID is now saved. Reconcile any callback that arrived early.
try {
  await reconcileSavedCallback(checkoutRequestID);
} catch (reconciliationError) {
  console.error(
    "⚠️ Saved callback reconciliation needs recovery:",
    checkoutRequestID,
    reconciliationError.message
  );
}

    // Temporary compatibility copy for the existing callback/status code.
    // Firestore remains authoritative for the lock and attempt record.
    const FILE_PATH = path.join(__dirname, "payments.json");

    try {
      let payments = [];

      if (fs.existsSync(FILE_PATH)) {
        const fileData = fs.readFileSync(FILE_PATH, "utf8");
        const parsed = fileData.trim() ? JSON.parse(fileData) : [];
        payments = Array.isArray(parsed) ? parsed : [];
      }

      const paymentRecord = {
        checkoutRequestID,
        accountReference: recordId,
        status: "pending",
      };

      const existingIndex = payments.findIndex(
        (payment) => payment.checkoutRequestID === checkoutRequestID
      );

      if (existingIndex >= 0) {
        payments[existingIndex] = {
          ...payments[existingIndex],
          ...paymentRecord,
        };
      } else {
        payments.push(paymentRecord);
      }

      fs.writeFileSync(FILE_PATH, JSON.stringify(payments, null, 2));
      console.log("✅ Temporary payments.json compatibility copy saved");
    } catch (fileError) {
      // Do not unlock: Safaricom has accepted the request and Firestore
      // already has its checkout ID. The JSON copy is no longer authoritative.
      console.error(
        "⚠️ Could not update payments.json compatibility copy:",
        fileError.message
      );
    }

    return res.json({
      success: true,
      message: "STK Push sent successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("❌ STK PUSH FAILED:", error.message);

    /*
     * If we reserved the claim but had not yet sent the request to Safaricom,
     * it is safe to release our reservation.
     *
     * Once the request may have reached Safaricom, keep the lock. A network
     * timeout does not prove that Safaricom rejected the payment.
     */
    if (lockAcquired && !requestSentToSafaricom) {
      try {
        await db.runTransaction(async (transaction) => {
          const recordSnapshot = await transaction.get(recordRef);
          const attemptSnapshot = await transaction.get(attemptRef);

if (recordSnapshot.exists) {
  const record = recordSnapshot.data() || {};

  const recordIsPaid =
    String(record.status || "").toLowerCase() === "paid" ||
    String(record.paymentStatus || "").toLowerCase() === "paid" ||
    String(record.paymentLockStatus || "").toLowerCase() === "paid";

  if (
    !recordIsPaid &&
    record.activePaymentAttemptId === attemptRef.id
  ) {
    transaction.update(recordRef, {
      paymentLockStatus: "failed",
      activePaymentAttemptId: null,
      activeCheckoutRequestID: null,
      paymentLockUpdatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

if (
  attemptSnapshot.exists &&
  String(attemptSnapshot.data()?.status || "").toLowerCase() !== "paid"
) {
  transaction.update(attemptRef, {
    status: "failed",
    failureReason: error.message,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

        });
      } catch (releaseError) {
        console.error(
          "❌ Could not release pre-request reservation:",
          releaseError.message
        );
      }
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    if (error.response) {
      console.error("🔴 Safaricom/HTTP error:", error.response.data);
    }

    if (requestSentToSafaricom) {
      return res.status(503).json({
        success: false,
        status: "unknown",
        error:
          "We could not confirm the STK Push response. Do not retry yet; the payment is being held for confirmation.",
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || "STK Push failed",
    });
  }
}

module.exports = { stkPush };

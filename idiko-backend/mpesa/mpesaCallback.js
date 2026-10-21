
/**
 * M-Pesa STK Push Callback Handler
 *
 * Firestore is authoritative for payment attempts and claim locks.
 * payments.json is retained only as a compatibility/status-polling copy.
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const db = admin.firestore();

const FAILED_RETENTION_MS = 24 * 60 * 60 * 1000;
const PAID_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const FILE_PATH = path.join(__dirname, "payments.json");

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

    // Keep pending and unknown outcomes.
    return true;
  });
}

function readPaymentsFile() {
  if (!fs.existsSync(FILE_PATH)) {
    return [];
  }

  const contents = fs.readFileSync(FILE_PATH, "utf8");
  const payments = contents.trim() ? JSON.parse(contents) : [];

  if (!Array.isArray(payments)) {
    throw new Error("payments.json does not contain a valid array");
  }

  return payments;
}

function writeCompatibilityPayment(paymentRecord) {
  try {
    let payments = readPaymentsFile();
    payments = cleanupOldPayments(payments);

    const index = payments.findIndex(
      (payment) =>
        payment.checkoutRequestID === paymentRecord.checkoutRequestID
    );

    if (index >= 0) {
      payments[index] = { ...payments[index], ...paymentRecord };
    } else {
      payments.push(paymentRecord);
    }

    fs.writeFileSync(FILE_PATH, JSON.stringify(payments, null, 2));
  } catch (error) {
    // Firestore remains authoritative; a local-file failure must not
    // undo a confirmed payment or a Firestore lock transition.
    console.error("⚠️ Could not update payments.json:", error.message);
  }
}


async function recordCallbackConflict({
  checkoutRequestID,
  attemptId,
  recordId,
  existingStatus,
  incomingStatus,
  resultCode = null,
  resultDescription = null,
  reason,
}) {
  const conflictRef = db
    .collection("mpesaCallbackConflicts")
    .doc(checkoutRequestID);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(conflictRef);
    const now = admin.firestore.FieldValue.serverTimestamp();

    const conflict = {
      checkoutRequestID,
      attemptId,
      recordId,
      existingStatus,
      incomingStatus,
      resultCode,
      resultDescription,
      reason,
      updatedAt: now,
    };

    if (!snapshot.exists) {
      transaction.set(conflictRef, {
        ...conflict,
        createdAt: now,
        resolved: false,
        occurrences: 1,
      });
    } else {
      transaction.update(conflictRef, {
        ...conflict,
        resolved: false,
        occurrences:
          Number(snapshot.data()?.occurrences || 0) + 1,
      });
    }
  });

  console.error(
    "🚨 M-Pesa callback conflict recorded:",
    checkoutRequestID,
    reason
  );
}


/**
 * Locate the attempt using the exact CheckoutRequestID.
 * Never infer a record ID from an unverified callback payload.
 */
async function findPaymentAttempt(checkoutRequestID) {
  if (!checkoutRequestID) {
    return null;
  }

  const snapshot = await db
    .collection("paymentAttempts")
    .where("checkoutRequestID", "==", checkoutRequestID)
    .limit(2)
    .get();

  // Multiple matches are ambiguous, so do not update anything.
  if (snapshot.size !== 1) {
    if (snapshot.size > 1) {
      console.error(
        "❌ Multiple payment attempts match CheckoutRequestID:",
        checkoutRequestID
      );
    }

    return null;
  }

  const doc = snapshot.docs[0];

  return {
    ref: doc.ref,
    id: doc.id,
    data: doc.data(),
  };
}

async function markPaymentFailed(
  checkoutRequestID,
  resultCode,
  resultDescription
) {
  const attempt = await findPaymentAttempt(checkoutRequestID);

  if (!attempt) {
    // The callback may arrive before stkPush.js saves the checkout ID.
    // Return an error so this callback is not treated as safely processed.
    throw new Error(
      `No unique Firestore payment attempt found for ${checkoutRequestID}`
    );
  }

  const recordId = String(attempt.data.recordId || "").trim();

  if (!recordId) {
    throw new Error(
      `Payment attempt ${attempt.id} has no recordId`
    );
  }

  const recordRef = db.collection("records").doc(recordId);
  const now = new Date().toISOString();

  const outcome = await db.runTransaction(async (transaction) => {
    const attemptDoc = await transaction.get(attempt.ref);
    const recordDoc = await transaction.get(recordRef);

    if (!attemptDoc.exists) {
      throw new Error("Payment attempt disappeared during callback");
    }

    if (!recordDoc.exists) {
      throw new Error(`Claim record not found: ${recordId}`);
    }

    const currentAttempt = attemptDoc.data();
    const record = recordDoc.data();



const attemptStatus = String(
  currentAttempt.status || "pending"
).toLowerCase();

const recordStatus = String(
  record.status || ""
).toLowerCase();

const paymentStatus = String(
  record.paymentStatus || ""
).toLowerCase();

const paymentLockStatus = String(
  record.paymentLockStatus || ""
).toLowerCase();

const claimIsPaid =
  attemptStatus === "paid" ||
  recordStatus === "paid" ||
  paymentStatus === "paid" ||
  paymentLockStatus === "paid";

if (claimIsPaid) {
  return {
    alreadyPaid: true,
    released: false,
    conflict: true,
    existingStatus:
      attemptStatus === "paid"
        ? "paid"
        : recordStatus === "paid"
        ? "paid"
        : paymentStatus === "paid"
        ? "paid"
        : paymentLockStatus,
  };
}


if (attemptStatus === "failed") {
  return {
    alreadyFailed: true,
    released: false,
  };
}


    // Do not overwrite a different, terminal attempt.
    if (
      currentAttempt.checkoutRequestID !== checkoutRequestID
    ) {
      throw new Error("CheckoutRequestID does not match the attempt");
    }

    transaction.update(attempt.ref, {
      status: "failed",
      failureCode: resultCode,
      failureReason: resultDescription || "Payment failed",
      failedAt: now,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Release only if this exact attempt still owns the active lock.
    const isActiveAttempt =
      record.activePaymentAttemptId === attempt.id &&
      record.activeCheckoutRequestID === checkoutRequestID;

    if (
      isActiveAttempt &&
      record.paymentLockStatus !== "paid" &&
      String(record.status || "").toLowerCase() !== "paid"
    ) {
      transaction.update(recordRef, {
        paymentLockStatus: "failed",
        activePaymentAttemptId: null,
        activeCheckoutRequestID: null,
        paymentLockUpdatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });

      return { alreadyPaid: false, released: true };
    }

    return { alreadyPaid: false, released: false };
  });

if (outcome.alreadyPaid) {
  await recordCallbackConflict({
    checkoutRequestID,
    attemptId: attempt.id,
    recordId,
    existingStatus: outcome.existingStatus || "paid",
    incomingStatus: "failed",
    resultCode,
    resultDescription,
    reason: "Failure callback received for an already-paid payment",
  });

  console.log(
    "⚠️ Failure callback conflicts with an already-paid claim:",
    checkoutRequestID
  );

  return {
    alreadyPaid: true,
    conflict: true,
    reason: "failure_callback_after_payment",
  };
}

if (outcome.alreadyFailed) {
  console.log(
    "ℹ️ Duplicate failure callback ignored:",
    checkoutRequestID
  );
  return { alreadyFailed: true };
}

  writeCompatibilityPayment({
    checkoutRequestID,
    accountReference: recordId,
    status: "failed",
    failedAt: now,
    failureCode: resultCode,
    failureReason: resultDescription || "Payment failed",
  });

  console.log(
    outcome.released
      ? "✅ Failed attempt recorded; its active lock was released:"
      : "ℹ️ Failed attempt recorded; active lock was not changed:",
    checkoutRequestID
  );

  return {
    alreadyPaid: false,
    alreadyFailed: false,
    conflict: false,
    released: Boolean(outcome.released),
  };
}

async function markPaymentSuccessful(checkoutRequestID, paymentData) {
  const attempt = await findPaymentAttempt(checkoutRequestID);

  if (!attempt) {
    throw new Error(
      `No unique Firestore payment attempt found for ${checkoutRequestID}`
    );
  }

  const recordId = String(attempt.data.recordId || "").trim();

  if (!recordId || recordId === "unknown") {
    throw new Error(
      `Invalid recordId on payment attempt ${attempt.id}`
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

  const recordRef = db.collection("records").doc(recordId);
  const paidAt = new Date().toISOString();

  // Mark the payment attempt and main record together.
  const outcome = await db.runTransaction(async (transaction) => {
    const attemptDoc = await transaction.get(attempt.ref);
    const recordDoc = await transaction.get(recordRef);

    if (!attemptDoc.exists) {
      throw new Error("Payment attempt disappeared during callback");
    }

    if (!recordDoc.exists) {
      throw new Error(`No Firestore record found for ${recordId}`);
    }

    const currentAttempt = attemptDoc.data();
    const record = recordDoc.data();

    if (currentAttempt.checkoutRequestID !== checkoutRequestID) {
      throw new Error("CheckoutRequestID does not match the attempt");
    }

    // Idempotency: a duplicate success callback must not redo the payment.
  
const attemptStatus = String(
  currentAttempt.status || "pending"
).toLowerCase();

const recordStatus = String(record.status || "").toLowerCase();

const recordPaymentStatus = String(
  record.paymentStatus || ""
).toLowerCase();

const recordPaymentLockStatus = String(
  record.paymentLockStatus || ""
).toLowerCase();

const callbackAmount = Number(paymentData.Amount);
const expectedAmount = Number(currentAttempt.amount);

if (
  !Number.isFinite(callbackAmount) ||
  !Number.isFinite(expectedAmount) ||
  callbackAmount <= 0 ||
  callbackAmount !== expectedAmount
) {
  // Do not mark an amount-mismatched payment as paid.
  // Preserve a paid claim as paid; otherwise freeze this active attempt.
  if (
    recordStatus !== "paid" &&
    record.activePaymentAttemptId === attempt.id
  ) {
    transaction.update(recordRef, {
      paymentLockStatus: "unknown",
      activeCheckoutRequestID: checkoutRequestID,
      paymentLockUpdatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return {
    alreadyPaid: false,
    conflict: true,
    existingStatus:
      attemptStatus === "paid" ? "paid" : recordStatus || attemptStatus,
    reason: "callback_amount_mismatch",
    expectedAmount,
    callbackAmount,
  };
}

if (
  attemptStatus === "paid" &&
  recordStatus === "paid"
) {
  return { alreadyPaid: true };
}

if (attemptStatus === "failed") {
  // A late success conflicts with the recorded failure.
  // Never overwrite a different active attempt's identifiers.
  const activeAttemptId = record.activePaymentAttemptId || null;
  const activeCheckoutId = record.activeCheckoutRequestID || null;

  if (
    recordStatus !== "paid" &&
    (!activeAttemptId || activeAttemptId === attempt.id)
  ) {
    transaction.update(recordRef, {
      paymentLockStatus: "unknown",
      activePaymentAttemptId: attempt.id,
      activeCheckoutRequestID: checkoutRequestID,
      paymentLockUpdatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    });
  } else if (
    recordStatus !== "paid" &&
    activeAttemptId === attempt.id &&
    activeCheckoutId !== checkoutRequestID
  ) {
    // The same attempt's identifiers disagree. Freeze without guessing.
    transaction.update(recordRef, {
      paymentLockStatus: "unknown",
      paymentLockUpdatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return {
    alreadyPaid: false,
    conflict: true,
    existingStatus: "failed",
    reason: "success_callback_after_failed_attempt",
  };
}

const claimAlreadyPaid =
  recordStatus === "paid" ||
  recordPaymentStatus === "paid" ||
  recordPaymentLockStatus === "paid";

if (claimAlreadyPaid && attemptStatus !== "paid") {
  return {
    alreadyPaid: false,
    conflict: true,
    existingStatus: "paid",
    reason: "claim_already_paid_by_another_payment_state",
  };
}


    transaction.update(attempt.ref, {
      status: "paid",
      amount: paymentData.Amount,
      mpesaReceipt: paymentData.MpesaReceiptNumber,
      phone: paymentData.PhoneNumber || null,
      transactionDate: paymentData.TransactionDate || null,
      paidAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // A confirmed successful payment closes the claim to further attempts.
    transaction.update(recordRef, {
      status: "Paid",
      paidAt,
      paymentLockStatus: "paid",
      activePaymentAttemptId: attempt.id,
      activeCheckoutRequestID: checkoutRequestID,
      paymentLockUpdatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
      mpesaReceipt: paymentData.MpesaReceiptNumber,
    });

    return { alreadyPaid: false };
  });

  
if (outcome.conflict) {
  await recordCallbackConflict({
    checkoutRequestID,
    attemptId: attempt.id,
    recordId,
    existingStatus: outcome.existingStatus,
    incomingStatus: "paid",
    resultCode: 0,
    reason:
      outcome.reason ||
      "Success callback conflicts with an existing terminal payment state",
  });

  console.error(
    "⚠️ Success callback needs investigation:",
    checkoutRequestID,
    outcome.reason || "terminal payment state conflict"
  );

  return {
    conflict: true,
    reason: outcome.reason || "terminal_payment_state_conflict",
  };
}


if (outcome.alreadyPaid) {
  console.log(
    "ℹ️ Duplicate success callback; payment already recorded:",
    checkoutRequestID
  );

  return {
    alreadyPaid: true,
    conflict: false,
    duplicate: true,
  };
}

  // Keep the existing history-record behavior.
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
  } catch (error) {
    console.error("⚠️ History record update failed:", error);
  }

  // Keep the existing notification-request behavior.
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
    }

    if (notificationSnapshot.empty) {
      console.log(
        "ℹ️ No notification request linked to record:",
        recordId
      );
    }
  } catch (error) {
    console.error("⚠️ Notification request update failed:", error);
  }

  writeCompatibilityPayment({
    checkoutRequestID,
    accountReference: recordId,
    status: "paid",
    amount: paymentData.Amount,
    mpesaReceipt: paymentData.MpesaReceiptNumber,
    phone: paymentData.PhoneNumber || null,
    transactionDate: paymentData.TransactionDate || null,
    paidAt,
  });

  console.log(
    "✅ Payment marked PAID in Firestore:",
    checkoutRequestID,
    recordId
  );
}


/**
 * Reconcile a callback that arrived before its payment attempt
 * had its CheckoutRequestID saved.
 *
 * The callback is marked processed only after the existing payment
 * handler finishes successfully.
 */
async function reconcileSavedCallback(checkoutRequestID) {
  const callbackRef = db
    .collection("unmatchedMpesaCallbacks")
    .doc(checkoutRequestID);

  const savedSnapshot = await callbackRef.get();

  if (!savedSnapshot.exists) {
    return { reconciled: false, reason: "no_saved_callback" };
  }

  const saved = savedSnapshot.data() || {};

  if (saved.processed === true) {
    return { reconciled: true, alreadyProcessed: true };
  }

  const callback = saved.callback;

  if (!callback || callback.CheckoutRequestID !== checkoutRequestID) {
    throw new Error("Saved callback checkout ID does not match its document");
  }

  // Do not process until the exact attempt can be found.
  const attempt = await findPaymentAttempt(checkoutRequestID);

  if (!attempt) {
    return { reconciled: false, reason: "attempt_not_found" };
  }

  const resultCode = Number(callback.ResultCode);

  if (!Number.isFinite(resultCode)) {
    throw new Error("Saved callback has an invalid ResultCode");
  }

let processingResult;

if (resultCode !== 0) {
  processingResult = await markPaymentFailed(
    checkoutRequestID,
    callback.ResultCode,
    callback.ResultDesc
  );
} else {
  const paymentData = {};
  const items = callback.CallbackMetadata?.Item;

  if (Array.isArray(items)) {
    for (const item of items) {
      if (item?.Name) {
        paymentData[item.Name] =
          item.Value !== undefined ? item.Value : null;
      }
    }
  }

  processingResult = await markPaymentSuccessful(
    checkoutRequestID,
    paymentData
  );
}

if (processingResult?.conflict) {
  console.error(
    "⚠️ Saved callback remains unresolved due to a payment conflict:",
    checkoutRequestID
  );

  return {
    reconciled: false,
    reason: processingResult.reason || "payment_conflict",
  };
}

  // Mark the stored callback processed only after the handler succeeds.
  // This update is idempotent, so duplicate reconciliation calls are safe.
  await db.runTransaction(async (transaction) => {
    const latestSnapshot = await transaction.get(callbackRef);

    if (!latestSnapshot.exists) {
      throw new Error("Saved callback disappeared during reconciliation");
    }

    const latest = latestSnapshot.data() || {};

    if (latest.processed === true) {
      return;
    }

    if (
      latest.callback?.CheckoutRequestID !== checkoutRequestID
    ) {
      throw new Error("Saved callback changed during reconciliation");
    }

    transaction.update(callbackRef, {
      processed: true,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  console.log(
    "✅ Saved M-Pesa callback reconciled:",
    checkoutRequestID
  );

  return { reconciled: true };
}


async function saveUnmatchedCallback(checkoutRequestID, callback) {
  const callbackRef = db
    .collection("unmatchedMpesaCallbacks")
    .doc(checkoutRequestID);

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(callbackRef);

    // Preserve the first callback. Do not overwrite a previously
    // stored callback with a potentially conflicting result.
    if (!existing.exists) {
      transaction.set(callbackRef, {
        checkoutRequestID,
        callback,
        processed: false,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  console.warn(
    "⚠️ Callback saved for reconciliation; no matching attempt yet:",
    checkoutRequestID
  );
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

    if (!CheckoutRequestID || ResultCode === undefined) {
      console.error("❌ Callback missing result code or checkout ID");
      return res.status(400).json({ ResultCode: 1 });
    }

    console.log("📌 Callback result:", ResultCode, ResultDesc);
    console.log("📌 CheckoutRequestID:", CheckoutRequestID);


if (Number(ResultCode) !== 0) {
  const attempt = await findPaymentAttempt(CheckoutRequestID);

  if (!attempt) {
    await saveUnmatchedCallback(CheckoutRequestID, callback);

    // The callback is safely stored for reconciliation.
    // Do not change the payment lock here.
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Callback stored for reconciliation",
    });
  }

const failureResult = await markPaymentFailed(
  CheckoutRequestID,
  ResultCode,
  ResultDesc
);

return res.status(200).json({
  ResultCode: 0,
  ResultDesc: failureResult?.conflict
    ? "Callback received; payment conflict requires reconciliation"
    : "Failure callback processed",
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

   
const attempt = await findPaymentAttempt(CheckoutRequestID);

if (!attempt) {
  await saveUnmatchedCallback(CheckoutRequestID, callback);

  // Do not guess the claim or mark it paid until reconciliation
  // connects this callback to its exact payment attempt.
  return res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Callback stored for reconciliation",
  });
}

const processingResult = await markPaymentSuccessful(
  CheckoutRequestID,
  paymentData
);

return res.status(200).json({
  ResultCode: 0,
  ResultDesc: processingResult?.conflict
    ? "Callback received; payment conflict requires reconciliation"
    : "Success",
});

  } catch (error) {
    console.error("❌ CALLBACK PROCESSING ERROR:", error);

    // Do not acknowledge an unprocessed callback as successful.
    return res.status(500).json({ ResultCode: 1 });
  }
}

/**
 * Compatibility polling endpoint.
 * The frontend should eventually poll a Firestore-backed status endpoint,
 * not rely on this local file as the authoritative status.
 */

async function getPaymentStatus(req, res) {
  const checkoutRequestID = String(
    req.params.checkoutRequestID || ""
  ).trim();

  if (!checkoutRequestID) {
    return res.status(400).json({
      status: "error",
      error: "CheckoutRequestID is required",
    });
  }

  try {
    const snapshot = await db
      .collection("paymentAttempts")
      .where("checkoutRequestID", "==", checkoutRequestID)
      .limit(2)
      .get();

    // Do not guess if the checkout ID is unknown or ambiguous.
    if (snapshot.empty) {
      return res.json({ status: "unknown" });
    }

    if (snapshot.size !== 1) {
      console.error(
        "Multiple payment attempts found for checkout ID:",
        checkoutRequestID
      );

      return res.status(409).json({
        status: "error",
        error: "Ambiguous payment attempt",
      });
    }

    const attempt = snapshot.docs[0].data();

    return res.json({
      status: attempt.status || "unknown",
    });
  } catch (error) {
    console.error(
      "Failed to read payment status from Firestore:",
      error
    );

    return res.status(500).json({
      status: "error",
      error: "Unable to check payment status",
    });
  }
}


/**
 * Admin-only recovery report.
 * Read-only: this function never changes attempts or claim locks.
 * Protect its route with verifyAdminToken in server.js.
 */
async function getUnresolvedPaymentAttempts(req, res) {
  try {
    const snapshot = await db
      .collection("paymentAttempts")
      .where("status", "in", ["pending", "unknown"])
      .limit(100)
      .get();

    const attempts = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        attemptId: doc.id,
        recordId: data.recordId || null,
        checkoutRequestID: data.checkoutRequestID || null,
        status: data.status || "unknown",
        amount: data.amount ?? null,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
      };
    });

    return res.json({
      success: true,
      count: attempts.length,
      attempts,
      limit: 100,
    });
  } catch (error) {
    console.error(
      "Failed to read unresolved M-Pesa attempts:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to retrieve unresolved payment attempts",
    });
  }
}

module.exports = {
  mpesaCallback,
  getPaymentStatus,
  reconcileSavedCallback,
  getUnresolvedPaymentAttempts,
};



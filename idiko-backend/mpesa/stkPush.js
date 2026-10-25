// mpesa/stkPush.js

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const { getMpesaAccessToken } = require("./mpesaAuth");
const { generateTimestamp, generatePassword } = require("./mpesaUtils");

const FILE_PATH = path.join(__dirname, "payments.json");

const ALLOWED_DOCUMENT_TYPES = [
  "national_id",
  "driving_license",
  "birth_certificate",
];

// Allow a little longer than the frontend's 60-second polling window.
// This expires the blocking state; it does not prove that payment failed.
const UNRESOLVED_PAYMENT_TIMEOUT_MS = 90 * 1000;

const FAILED_RETENTION_MS = 24 * 60 * 60 * 1000;
const PAID_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const EXPIRED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

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

  return type;
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

/**
 * Expire unresolved attempts that have exceeded the allowed waiting period.
 *
 * Keep their checkout mappings so that a delayed Safaricom callback can
 * still be matched to the correct claim.
 *
 * Old unresolved entries with no valid createdAt are expired as a
 * compatibility measure so they cannot block retries forever.
 */
function cleanupOldPayments(payments) {
  const now = Date.now();
  let changed = false;

  const cleanedPayments = payments.map((payment) => {
    const status = String(payment.status || "").toLowerCase();

    if (
      ["pending", "unknown", "processing"].includes(status)
    ) {
      const createdAt = new Date(payment.createdAt).getTime();

      const isStale =
        !Number.isFinite(createdAt) ||
        now - createdAt >= UNRESOLVED_PAYMENT_TIMEOUT_MS;

      if (isStale) {
        changed = true;

        return {
          ...payment,
          status: "expired",
          expiredAt: payment.expiredAt || new Date(now).toISOString(),
          expiryReason:
            payment.expiryReason ||
            "No confirmed payment result within the allowed waiting period",
        };
      }
    }

    return payment;
  });

  const retainedPayments = cleanedPayments.filter((payment) => {
    const status = String(payment.status || "").toLowerCase();

    if (status === "failed" && payment.failedAt) {
      const age = now - new Date(payment.failedAt).getTime();
      return age < FAILED_RETENTION_MS;
    }

    if (status === "paid" && payment.paidAt) {
      const age = now - new Date(payment.paidAt).getTime();
      return age < PAID_RETENTION_MS;
    }

    if (status === "expired" && payment.expiredAt) {
      const age = now - new Date(payment.expiredAt).getTime();
      return age < EXPIRED_RETENTION_MS;
    }

    // Keep unresolved attempts that are still within their waiting period.
    // Also preserve entries whose terminal timestamp is missing.
    return true;
  });

  if (retainedPayments.length !== payments.length) {
    changed = true;
  }

  return {
    payments: retainedPayments,
    changed,
  };
}

/**
 * Find the exact claim record in records.
 *
 * Preferred input:
 *   recordId: the Firestore document ID
 *
 * Compatibility:
 *   accountReference can still identify older National ID records.
 *   documentType and fullName help distinguish document types.
 */
async function resolveClaim({
  recordId,
  accountReference,
  documentType,
  fullName,
}) {
  const admin = require("firebase-admin");
  const db = admin.firestore();

  const suppliedRecordId = String(
    recordId || accountReference || ""
  ).trim();

  const suppliedType = normalizeDocumentType(documentType);
  const suppliedName = String(fullName || "").trim();

  if (
    suppliedType &&
    !ALLOWED_DOCUMENT_TYPES.includes(suppliedType)
  ) {
    const error = new Error("Invalid documentType");
    error.statusCode = 400;
    throw error;
  }

  // First, try the actual Firestore document key.
  if (suppliedRecordId) {
    const directSnapshot = await db
      .collection("records")
      .doc(suppliedRecordId)
      .get();

    if (directSnapshot.exists) {
      const data = directSnapshot.data() || {};
      const actualType = normalizeDocumentType(
        data.documentType || "national_id"
      );

      if (suppliedType && actualType !== suppliedType) {
        const error = new Error(
          "The supplied documentType does not match this claim"
        );
        error.statusCode = 409;
        throw error;
      }

      if (
        suppliedName &&
        String(data.fullName || "").trim().toLowerCase() !==
          suppliedName.toLowerCase()
      ) {
        const error = new Error(
          "The supplied fullName does not match this claim"
        );
        error.statusCode = 409;
        throw error;
      }

      return {
        recordId: directSnapshot.id,
        documentType: actualType,
        fullName: String(data.fullName || "").trim(),
        idNumber: String(data.idNumber || "").trim(),
        record: data,
      };
    }
  }

  // Compatibility lookup for records where accountReference is an
  // ID number rather than the Firestore document key.
  const legacyId = String(accountReference || "").trim();

  if (!legacyId) {
    const error = new Error(
      "recordId or accountReference is required"
    );
    error.statusCode = 400;
    throw error;
  }

  let query = db
    .collection("records")
    .where("idNumber", "==", legacyId);

  if (suppliedType) {
    query = query.where("documentType", "==", suppliedType);
  } else {
    // Older clients do not send documentType. Preserve the old
    // National ID behavior instead of accidentally selecting a licence.
    query = query.where("documentType", "==", "national_id");
  }

  const snapshot = await query.get();

  let matches = snapshot.docs;

  if (suppliedName) {
    matches = matches.filter(
      (doc) =>
        String(doc.data()?.fullName || "")
          .trim()
          .toLowerCase() === suppliedName.toLowerCase()
    );
  }

  if (matches.length === 0) {
    const error = new Error(
      "Claim record not found. Pass the correct recordId and documentType."
    );
    error.statusCode = 404;
    throw error;
  }

  if (matches.length > 1) {
    const error = new Error(
      "More than one claim matched. Pass the exact recordId."
    );
    error.statusCode = 409;
    throw error;
  }

  const doc = matches[0];
  const data = doc.data() || {};

  return {
    recordId: doc.id,
    documentType: normalizeDocumentType(
      data.documentType || "national_id"
    ),
    fullName: String(data.fullName || "").trim(),
    idNumber: String(data.idNumber || "").trim(),
    record: data,
  };
}

async function stkPush(req, res) {
  console.log("🔥 STK PUSH ROUTE HIT");

  const {
    phone,
    amount,
    accountReference,
    recordId,
    documentType,
    fullName,
  } = req.body || {};

  if (!phone || amount === undefined || amount === null) {
    return res.status(400).json({
      success: false,
      error: "phone and amount are required",
    });
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: "amount must be a valid positive number",
    });
  }

  let formattedPhone = String(phone).trim();

  if (formattedPhone.startsWith("0")) {
    formattedPhone = `254${formattedPhone.slice(1)}`;
  }

  if (!/^254\d{9}$/.test(formattedPhone)) {
    return res.status(400).json({
      success: false,
      error: "Enter a valid Kenyan phone number",
    });
  }

  let claim;

  try {
    claim = await resolveClaim({
      recordId,
      accountReference,
      documentType,
      fullName,
    });
  } catch (error) {
    console.error("❌ Could not resolve claim:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Could not find claim record",
    });
  }

  const claimStatus = String(claim.record.status || "")
    .trim()
    .toLowerCase();

  if (
    claimStatus === "paid" ||
    String(claim.record.paymentStatus || "").toLowerCase() === "paid"
  ) {
    return res.status(409).json({
      success: false,
      error: "This claim has already been paid",
    });
  }

  let payments;

  try {
    const existingPayments = readPaymentsFile();
    const cleanupResult = cleanupOldPayments(existingPayments);

    payments = cleanupResult.payments;

    // Persist expired attempts and retention cleanup before checking
    // whether a previous attempt is blocking this claim.
    if (cleanupResult.changed) {
      writePaymentsFile(payments);
    }
  } catch (error) {
    console.error("❌ Could not read payments.json:", error.message);

    return res.status(500).json({
      success: false,
      error: "Could not read payment records",
    });
  }

  // Block only while a previous attempt is still within its
  // unresolved waiting period.
  const unresolvedPayment = payments.find(
    (payment) =>
      payment.recordId === claim.recordId &&
      ["pending", "unknown", "processing"].includes(
        String(payment.status || "").toLowerCase()
      )
  );

  if (unresolvedPayment) {
    return res.status(409).json({
      success: false,
      status: unresolvedPayment.status,
      error:
        "A previous payment is still being confirmed. Please wait before trying again.",
      checkoutRequestID: unresolvedPayment.checkoutRequestID || null,
    });
  }

  try {
    const accessToken = await getMpesaAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(timestamp);

    const mpesaAccountReference = String(
      accountReference || claim.recordId
    ).trim();

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: numericAmount,
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: mpesaAccountReference,
      TransactionDesc: "ID Claim Payment",
    };

    console.log("📤 Sending STK Push:", {
      recordId: claim.recordId,
      documentType: claim.documentType,
      fullName: claim.fullName,
    });

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

    if (responseCode !== "0" || !checkoutRequestID) {
      return res.status(502).json({
        success: false,
        error:
          response.data?.ResponseDescription ||
          "Safaricom did not accept the STK Push",
      });
    }

    // Save the checkout-to-record mapping so the callback can identify
    // the exact record without needing paymentAttempts in Firestore.
    const paymentRecord = {
      checkoutRequestID,
      accountReference: mpesaAccountReference,
      recordId: claim.recordId,
      documentType: claim.documentType,
      fullName: claim.fullName,
      idNumber: claim.idNumber,
      phone: formattedPhone,
      amount: numericAmount,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const existingIndex = payments.findIndex(
      (payment) =>
        payment.checkoutRequestID === checkoutRequestID
    );

    if (existingIndex >= 0) {
      payments[existingIndex] = {
        ...payments[existingIndex],
        ...paymentRecord,
      };
    } else {
      payments.push(paymentRecord);
    }

    try {
      writePaymentsFile(payments);
    } catch (fileError) {
      // Safaricom has accepted the request, but without this mapping
      // the callback cannot safely determine which claim to update.
      console.error(
        "❌ Safaricom accepted the request but payments.json could not be saved:",
        fileError.message
      );

      return res.status(503).json({
        success: false,
        status: "unknown",
        checkoutRequestID,
        error:
          "Safaricom accepted the payment request, but its local payment mapping could not be saved. Do not retry yet; check the payment status.",
      });
    }

    return res.json({
      success: true,
      message: "STK Push sent successfully",
      data: response.data,
      record: {
        recordId: claim.recordId,
        documentType: claim.documentType,
        fullName: claim.fullName,
      },
    });
  } catch (error) {
    console.error("❌ STK PUSH FAILED:", error.message);

    if (error.response) {
      console.error("🔴 Safaricom response:", error.response.data);
    }

    return res.status(error.response ? 502 : 500).json({
      success: false,
      error:
        error.response?.data?.errorMessage ||
        error.response?.data?.ResponseDescription ||
        error.message ||
        "STK Push failed",
    });
  }
}

module.exports = { stkPush };
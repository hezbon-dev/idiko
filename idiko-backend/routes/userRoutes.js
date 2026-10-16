
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

// =======================================
// NORMALIZATION HELPERS
// =======================================

function normalizeText(value = "") {
  return String(value).trim().toLowerCase();
}

function normalizeId(value = "") {
  return String(value)
    .replace(/[\s_-]+/g, "")
    .trim()
    .toLowerCase();
}

// Normalize dates for comparison only.
// The original DOB is preserved when saved.
function normalizeDate(dob = "") {
  const value = String(dob).trim();

  if (!value) {
    return "";
  }

  const parts = value.split(/\D+/);

  if (parts.length !== 3 || parts.some(part => !part)) {
    return "";
  }

  let day;
  let month;
  let year;

  if (parts[0].length === 4) {
    [year, month, day] = parts;
  } else {
    [day, month, year] = parts;
  }

  if (
    year.length !== 4 ||
    Number(month) < 1 ||
    Number(month) > 12 ||
    Number(day) < 1 ||
    Number(day) > 31
  ) {
    return "";
  }

  return `${year.padStart(4, "0")}-${month.padStart(
    2,
    "0"
  )}-${day.padStart(2, "0")}`;
}

function normalizeSex(value = "") {
  const v = normalizeText(value);

  if (v === "m" || v === "male") {
    return "male";
  }

  if (v === "f" || v === "female") {
    return "female";
  }

  return v;
}

// =======================================
// MAP FRONTEND TYPES TO STORED TYPES
// =======================================

const DOCUMENT_TYPE_MAP = {
  id: "national_id",
  drivingLicence: "driving_license",
  birthCertificate: "birth_certificate",
};

function getStoredDocumentType(documentType = "") {
  return DOCUMENT_TYPE_MAP[documentType] || "";
}

// =======================================
// CREATE DOCUMENT-AWARE MATCH KEY
// =======================================

// All three document types include document type,
// full name, ID number where applicable, DOB, and sex.
//
// National ID: location is its district/place of birth.
// Driving licence: location is not part of the key.
// Birth certificate: location is its place of birth.

function createMatchKey({
  documentType = "",
  fullName = "",
  idNumber = "",
  dob = "",
  sex = "",
  placeOfBirth = "",
} = {}) {
  const storedType = getStoredDocumentType(documentType);

  const location =
    storedType === "national_id" ||
    storedType === "birth_certificate"
      ? normalizeText(placeOfBirth)
      : "";

  return [
    storedType,
    normalizeText(fullName),
    normalizeId(idNumber),
    normalizeDate(dob),
    normalizeSex(sex),
    location,
  ].join("|");
}

// =======================================
// CREATE NOTIFICATION REQUEST
// =======================================

router.post("/notify-request", async (req, res) => {
  try {
    const {
      id,
      documentType,
      fullName,
      idNumber,
      dob,
      sex,
      district,
      placeOfBirth,
      primaryPhone,
      secondaryPhone,
      email,
    } = req.body;

    const storedDocumentType =
      getStoredDocumentType(documentType);

    if (!storedDocumentType) {
      return res.status(400).json({
        success: false,
        error: "Invalid document type",
      });
    }

    const normalizedName = normalizeText(fullName);
    const normalizedId = normalizeId(idNumber);
    const normalizedDob = normalizeDate(dob);
    const normalizedSex = normalizeSex(sex);

    // Canonical location field:
    // National ID supports legacy district submissions.
    // Birth certificate supports legacy district submissions
    // temporarily, but saves the value as placeOfBirth.
    const effectivePlaceOfBirth = String(
      placeOfBirth ||
        (
          documentType === "id" ||
          documentType === "birthCertificate"
            ? district
            : ""
        ) ||
        ""
    ).trim();

    const normalizedPlaceOfBirth =
      normalizeText(effectivePlaceOfBirth);

    // ---------------------------------------
    // VALIDATE REQUIRED FIELDS
    // ---------------------------------------

    if (
      !normalizedName ||
      !dob ||
      !normalizedDob ||
      !normalizedSex ||
      !primaryPhone
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Full name, valid date of birth, sex and primary phone are required",
      });
    }


if (
  documentType === "drivingLicence" &&
  !normalizedId
) {
  return res.status(400).json({
    success: false,
    error: "ID number is required for a driving licence",
  });
}


    if (
      (
        documentType === "id" ||
        documentType === "birthCertificate"
      ) &&
      !normalizedPlaceOfBirth
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Place of birth is required for this document type",
      });
    }

    const db = admin.firestore();
    const requestsRef = db.collection("notify_requests");

    // ---------------------------------------
    // CHECK FOR DUPLICATE REQUESTS
    // ---------------------------------------

    // Search requests of the same frontend type.
    // Compare normalized values so formatting differences
    // do not bypass duplicate detection.
    const existingSnapshot = await requestsRef
      .where("documentType", "==", documentType)
      .get();

    const duplicateExists = existingSnapshot.docs.some(
      doc => {
        const request = doc.data();

        if (
          request.matched === true ||
          request.expired === true
        ) {
          return false;
        }

        const sameIdentity =
          normalizeText(
            request.normalizedFullName ||
              request.fullName
          ) === normalizedName &&
          normalizeDate(
            request.normalizedDob || request.dob
          ) === normalizedDob &&
          normalizeSex(
            request.normalizedSex || request.sex
          ) === normalizedSex;

        if (!sameIdentity) {
          return false;
        }

        // National ID: match the ID number and place/district.
        if (documentType === "id") {
          return (
            normalizeId(request.idNumber) === normalizedId &&
            normalizeText(
              request.placeOfBirth || request.district
            ) === normalizedPlaceOfBirth
          );
        }

        // Driving licence: ID number is the holder's
        // National ID number. No location is required.
        if (documentType === "drivingLicence") {
          return (
            normalizeId(request.idNumber) === normalizedId
          );
        }

        // Birth certificate: no ID number is required.
        // Place of birth is the distinguishing location.
        if (documentType === "birthCertificate") {
          return (
            !normalizeId(request.idNumber) &&
            normalizeText(
              request.placeOfBirth || request.district
            ) === normalizedPlaceOfBirth
          );
        }

        return false;
      }
    );

    if (duplicateExists) {
      const duplicateMessage =
        documentType === "drivingLicence"
          ? "You already have a pending notification request for this driving licence."
          : documentType === "birthCertificate"
            ? "You already have a pending notification request for this birth certificate."
            : "You already have a pending notification request for this National ID.";

      return res.status(409).json({
        success: false,
        error: duplicateMessage,
      });
    }

    // ---------------------------------------
    // SAVE NOTIFICATION REQUEST
    // ---------------------------------------

    // Continue using the frontend-provided document type
    // in documentType for compatibility with existing clients.
    // normalizedDocumentType provides the canonical backend type.

    const requestData = {
      id: id || db.collection("notify_requests").doc().id,

      documentType,
      normalizedDocumentType: storedDocumentType,

      fullName: String(fullName).trim(),
      idNumber:
        documentType === "birthCertificate"
          ? ""
          : String(idNumber || "").trim(),

      // Preserve the submitted DOB exactly.
      dob: String(dob).trim(),

      sex: String(sex).trim(),

      // Canonical location field used for matching.
      placeOfBirth: effectivePlaceOfBirth,

      // Retain district for existing National ID consumers.
      // Other document types do not use district for matching.
      district:
        documentType === "id"
          ? effectivePlaceOfBirth
          : "",

      primaryPhone: String(primaryPhone).trim(),
      secondaryPhone: String(secondaryPhone || "").trim(),
      email: String(email || "").trim(),

      normalizedFullName: normalizedName,
      normalizedIdNumber: normalizedId,
      normalizedDob,
      normalizedSex,
      normalizedPlaceOfBirth,

      matchKey: createMatchKey({
        documentType,
        fullName: normalizedName,
        idNumber: normalizedId,
        dob: normalizedDob,
        sex: normalizedSex,
        placeOfBirth: normalizedPlaceOfBirth,
      }),

      // These are server-controlled notification states.
      createdAt: new Date().toISOString(),
      matched: false,
      expired: false,
      sentCount: 0,
      status: "pending",
    };

    await requestsRef
      .doc(requestData.id)
      .set(requestData);

    return res.json({
      success: true,
      id: requestData.id,
    });
  } catch (err) {
    console.error("Notify request error:", err);

    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

module.exports = router;

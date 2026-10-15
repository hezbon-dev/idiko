// idiko-backend/routes/staffAuth.js

const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const verifyStaffToken = require("../middleware/verifyStaffToken");


function normalizeText(value = "") {
  return String(value).trim().toLowerCase();
}

// Preserve the existing ID format used for Firestore record keys.
// This helper is only for comparing ID numbers in matching logic.
function normalizeMatchId(value = "") {
  return String(value)
    .replace(/[\s_-]+/g, "")
    .trim()
    .toLowerCase();
}

function normalizeDate(dob = "") {
  const value = String(dob).trim();

  if (!value) return "";

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

  if (v === "m" || v === "male") return "male";
  if (v === "f" || v === "female") return "female";

  return v;
}

function getFrontendDocumentType(storedType = "") {
  const mapping = {
    national_id: "id",
    driving_license: "drivingLicence",
    birth_certificate: "birthCertificate",
  };

  return mapping[storedType] || "";
}

function createMatchKey({
  documentType = "",
  fullName = "",
  idNumber = "",
  dob = "",
  sex = "",
  placeOfBirth = "",
} = {}) {
  const location =
    documentType === "national_id" ||
    documentType === "birth_certificate"
      ? normalizeText(placeOfBirth)
      : "";

  return [
    documentType,
    normalizeText(fullName),
    normalizeMatchId(idNumber),
    normalizeDate(dob),
    normalizeSex(sex),
    location,
  ].join("|");
}


router.post("/login", async (req, res) => {

  try {

    const { stationName, password } = req.body;

    if (!stationName || !password) {
      return res.status(400).json({
        success: false,
        error: "Station name and password required"
      });
    }

    const db = admin.firestore();

    const storageDoc = await db
      .collection("appStorage")
      .doc("pickupStations")
      .get();

    if (!storageDoc.exists) {
      return res.status(500).json({
        success: false,
        error: "Pickup stations not found"
      });
    }

    const stations =
      storageDoc.data()?.value || [];

    const station = stations.find(
      s =>
        s.stationName?.toLowerCase() ===
        stationName.toLowerCase()
    );

    if (!station) {
      return res.status(401).json({
        success: false,
        error: "Invalid station"
      });
    }

// =========================
// PASSWORD MIGRATION LOGIC
// =========================

if (station.passwordHash) {

  const passwordValid =
    await bcrypt.compare(
      password,
      station.passwordHash
    );

  if (!passwordValid) {

    return res.status(401).json({
      success: false,
      error: "Invalid password",
    });
  }

} else if (station.password) {

  if (station.password !== password) {

    return res.status(401).json({
      success: false,
      error: "Invalid password",
    });
  }

  console.log(
    "🔄 Migrating station password:",
    station.stationName
  );

  const passwordHash =
    await bcrypt.hash(password, 10);

  station.passwordHash = passwordHash;

  delete station.password;

  await storageDoc.ref.update({
    value: stations,
  });

  console.log(
    "✅ Password migrated:",
    station.stationName
  );

} else {

  return res.status(500).json({
    success: false,
    error: "Station password not configured",
  });
}

    if (!station.enabled) {
      return res.status(403).json({
        success: false,
        error: "Station disabled"
      });
    }


const token = jwt.sign(
  {
    stationId: station.id,
    stationName: station.stationName,
    stationNumber: station.stationNumber,
    role: "staff"
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "12h"
  }
);

 return res.json({
  success: true,
  token,
  station: {
    id: station.id,
    stationName: station.stationName,
    stationNumber: station.stationNumber,
    enabled: station.enabled
  }
});

  } catch (err) {

    console.error(
      "❌ Staff login error:",
      err
    );

    return res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});

// =========================
// 🔒 VERIFY STAFF TOKEN
// =========================

router.get(
  "/verify",
  verifyStaffToken,
  async (req, res) => {

    return res.json({
      success: true,
      staff: req.staff,
    });

  }
);

// =========================
// 🚪 STAFF LOGOUT
// =========================

router.post(
  "/logout",
  verifyStaffToken,
  async (req, res) => {

    try {

      const { sessionId } = req.body;

if (sessionId) {

  await admin
    .firestore()
    .collection("staffSessions")
    .doc(sessionId)
    .delete();

  console.log(
    "🗑 Deleted staff session:",
    sessionId
  );

}

      console.log(
        "🚪 Staff logout:",
        req.staff.stationName
      );

      return res.json({
        success: true,
        message: "Logged out",
      });

    } catch (err) {

      console.error(
        "Staff logout failed:",
        err
      );

      return res.status(500).json({
        success: false,
      });

    }

  }
);

// =========================
// STAFF HEARTBEAT
// =========================

router.post(
  "/heartbeat",
  verifyStaffToken,
  async (req, res) => {

    try {

      const {
        sessionId,
        staffId,
        stationName,
      } = req.body;

      if (
        !sessionId ||
        !staffId
      ) {

        return res.status(400).json({
          success: false,
          error: "Missing session data",
        });

      }

      await admin
        .firestore()
        .collection("staffSessions")
        .doc(sessionId)
        .set(
          {
            sessionId,
            staffId,
            stationName:
              stationName || "",
            lastActive:
              admin.firestore.FieldValue.serverTimestamp(),
            createdAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

      return res.json({
        success: true,
      });

    } catch (err) {

      console.error(
        "Heartbeat failed",
        err
      );

      return res.status(500).json({
        success: false,
      });

    }

  }
);


router.post(
  "/upload-record",
  verifyStaffToken,
  async (req, res) => {
    try {
      const {
        frontImage,
        backImage,
        fullName,
        idNumber,
        dob,
        sex,
        district,
      } = req.body;

      // Support older clients that don't send documentType.
      // Older uploads continue to behave as National ID uploads.
      const documentType =
        req.body.documentType || "national_id";

      const allowedDocumentTypes = [
        "national_id",
        "driving_license",
        "birth_certificate",
      ];

      if (!allowedDocumentTypes.includes(documentType)) {
        return res.status(400).json({
          success: false,
          error: "Invalid document type",
        });
      }

    
const normalizedName = normalizeText(fullName);

// Preserve the uploaded DOB exactly as entered.
const normalizedDob = String(dob || "").trim();

const normalizedSex = normalizeSex(sex);

// Keep the existing record-key behavior unchanged.
const normalizedId = String(idNumber || "")
  .replace(/\s+/g, "")
  .trim();

// Birth certificates should submit placeOfBirth.
// district remains a compatibility fallback for older clients.
const normalizedPlaceOfBirth = normalizeText(
  req.body.placeOfBirth ||
    (
      documentType === "birth_certificate"
        ? district
        : documentType === "national_id"
          ? district
          : ""
    ) ||
    ""
);

const normalizedDistrict =
  documentType === "national_id"
    ? normalizeText(district)
    : "";


      // -------------------------------
      // VALIDATE REQUIRED FIELDS
      // -------------------------------

      if (
        !frontImage ||
        !normalizedName ||
        !normalizedDob ||
        !normalizedSex
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Front image, full name, date of birth and sex are required",
        });
      }

      if (
        documentType === "national_id" &&
        (!backImage || !normalizedId || !normalizedDistrict)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "National ID requires front and back images, ID number and district/place of birth",
        });
      }

      if (
        documentType === "driving_license" &&
        (!backImage || !normalizedId)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Driving licence requires front and back images and the holder's National ID number",
        });
      }

      if (
        documentType === "birth_certificate" &&
        !normalizedPlaceOfBirth
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Birth certificate requires place of birth",
        });
      }

      const db = admin.firestore();


      // -------------------------------
      // SELECT FIRESTORE DOCUMENT KEY
      // -------------------------------

      let recordRef;

      if (documentType === "national_id") {
        // National ID records keep their existing document key.
        recordRef = db
          .collection("records")
          .doc(normalizedId);

        // Prevent duplicate National ID records.
        const existing = await recordRef.get();

        if (existing.exists) {
          return res.status(409).json({
            success: false,
            error: "ID already exists",
          });
        }
      } else if (documentType === "driving_license") {
        // Prefix the holder's National ID to prevent collisions
        // with National ID records in the same collection.
        const drivingLicenseKey =
          `driving_license_${normalizedId}`;

        recordRef = db
          .collection("records")
          .doc(drivingLicenseKey);

        // Prevent duplicate active driving licence records
        // for the same holder while the record exists.
        const existing = await recordRef.get();

        if (existing.exists) {
          return res.status(409).json({
            success: false,
            error:
              "A driving licence record already exists for this National ID number",
          });
        }
      } else {
        // Birth certificates continue using auto-generated keys.
        recordRef = db.collection("records").doc();
      }

      const recordId = recordRef.id;


      // -------------------------------
      // BUILD RECORD
      // -------------------------------

      const record = {
        recordId,

        documentType,

        stationId: req.staff.stationId,

        uploadDate: new Date().toISOString(),

        fullName: normalizedName,

        // For driving licences, this is the HOLDER'S NATIONAL
        // ID number, not the driving licence number.
        // Birth certificates have no ID number.
        idNumber:
          documentType === "birth_certificate"
            ? ""
            : normalizedId,

        dob: normalizedDob,

        sex: normalizedSex,

        // Preserve the existing district field for National IDs.
        // Do not require or populate it for other document types.
        district: normalizedDistrict,

        // Keep an explicit placeOfBirth field for birth certificates.
        // National IDs retain their existing district value here too.
        placeOfBirth:
          documentType === "birth_certificate"
            ? normalizedPlaceOfBirth
            : documentType === "national_id"
              ? normalizedDistrict
              : "",

        status: "Pending",

        frontImage,

        // Birth certificates only need a front image.
        backImage:
          documentType === "birth_certificate"
            ? null
            : backImage,

        pickupStation: String(
          req.staff.stationName || ""
        )
          .trim()
          .toLowerCase(),
      };

      // -------------------------------
      // SAVE TO BOTH FIRESTORE COLLECTIONS
      // -------------------------------

      // Use the SAME document key in records and allHistoryRecords.
      // Keep the existing National ID key unchanged.
      await Promise.all([
        recordRef.set(record),

        db
          .collection("allHistoryRecords")
          .doc(recordId)
          .set(record),
      ]);


      // ==================================================
      // DOCUMENT-AWARE NOTIFICATION MATCHING
      // ==================================================

      // Use the same canonical document type and six-part
      // match key that routes/userRoutes.js saves.
      const recordMatchKey = createMatchKey({
        documentType: record.documentType,
        fullName: record.fullName,
        idNumber: record.idNumber,
        dob: record.dob,
        sex: record.sex,
        placeOfBirth: record.placeOfBirth,
      });

      console.log("🔑 Upload record matchKey:", {
        documentType: record.documentType,
        recordMatchKey,
      });

      const notifyRef = db.collection("notify_requests");

      // Exact key lookup prevents cross-document-type matches.
      const candidatesSnapshot = await notifyRef
        .where("matchKey", "==", recordMatchKey)
        .get();

      // Verify the actual fields too; never trust the key alone.
      function isCorrectPendingRequest(request) {
        const expectedFrontendType =
          getFrontendDocumentType(record.documentType);

        const requestStoredType =
          request.normalizedDocumentType ||
          (
            {
              id: "national_id",
              drivingLicence: "driving_license",
              birthCertificate: "birth_certificate",
            }[request.documentType] || ""
          );

        if (
          !expectedFrontendType ||
          requestStoredType !== record.documentType ||
          request.documentType !== expectedFrontendType
        ) {
          return false;
        }

        // Do not reuse a request already matched or expired.
        if (
          request.matched === true ||
          request.expired === true
        ) {
          return false;
        }

        const status = normalizeText(request.status);

        if (
          status === "paid" ||
          status === "expired" ||
          status === "completed"
        ) {
          return false;
        }

        const sameCoreIdentity =
          normalizeText(
            request.normalizedFullName || request.fullName
          ) === normalizeText(record.fullName) &&
          normalizeDate(
            request.normalizedDob || request.dob
          ) === normalizeDate(record.dob) &&
          normalizeSex(
            request.normalizedSex || request.sex
          ) === normalizeSex(record.sex);

        if (!sameCoreIdentity) {
          return false;
        }

        // National ID: type, name, ID number, DOB, sex,
        // and place of birth (stored as district on old records).
        if (record.documentType === "national_id") {
          return (
            normalizeMatchId(request.idNumber) ===
              normalizeMatchId(record.idNumber) &&
            normalizeText(
              request.placeOfBirth || request.district
            ) === normalizeText(record.placeOfBirth)
          );
        }

        // Driving licence: the ID number is the holder's
        // National ID number. No location is required.
        if (record.documentType === "driving_license") {
          return (
            normalizeMatchId(request.idNumber) ===
            normalizeMatchId(record.idNumber)
          );
        }

        // Birth certificate: no ID number is required.
        if (record.documentType === "birth_certificate") {
          return (
            !normalizeMatchId(request.idNumber) &&
            normalizeText(
              request.placeOfBirth || request.district
            ) === normalizeText(record.placeOfBirth)
          );
        }

        return false;
      }

      // Sort candidates oldest-first so legacy duplicates
      // do not cause an arbitrary newer request to be selected.
      const candidates = candidatesSnapshot.docs
        .filter(doc => isCorrectPendingRequest(doc.data()))
        .sort((a, b) => {
          const dateA = String(a.data().createdAt || "");
          const dateB = String(b.data().createdAt || "");
          return dateA.localeCompare(dateB);
        });

      let matchingNotifyDoc = null;

      // Transactionally recheck the chosen request before marking
      // it matched. This prevents two concurrent uploads from
      // claiming the same notification request.
      for (const candidate of candidates) {
        const matched = await db.runTransaction(async transaction => {
          const latestSnapshot = await transaction.get(
            candidate.ref
          );

          if (!latestSnapshot.exists) {
            return false;
          }

          const latestRequest = latestSnapshot.data();

          if (!isCorrectPendingRequest(latestRequest)) {
            return false;
          }

          const matchedAt = new Date().toISOString();

          transaction.update(candidate.ref, {
            matched: true,
            normalizedDocumentType: record.documentType,
            matchedRecordId: record.recordId,
            matchedAt,
            startedAt: matchedAt,
            nextNotificationAt: matchedAt,
            sentCount: 0,
            status: "pending",

            // Store the canonical place of birth.
            placeOfBirth: record.placeOfBirth || "",

            // Only records with an ID number populate this field.
            idNumber: record.idNumber || "",
          });

          return true;
        });

        if (matched) {
          matchingNotifyDoc = candidate;
          break;
        }
      }

      if (matchingNotifyDoc) {
        console.log("✅ Notification request matched:", {
          requestId: matchingNotifyDoc.id,
          recordId: record.recordId,
          documentType: record.documentType,
          matchKey: recordMatchKey,
        });

        console.log(
          "📅 Notification schedule initialized:",
          matchingNotifyDoc.id
        );
      } else {
        console.log("ℹ️ No eligible notification request found:", {
          recordId: record.recordId,
          documentType: record.documentType,
          matchKey: recordMatchKey,
        });
      }


      // -------------------------------
      // SUCCESS RESPONSE
      // -------------------------------

      return res.json({
        success: true,
        record,
      });
    } catch (err) {
      console.error(
        "Upload record error:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);



// =========================
// GET STAFF RECORDS
// =========================

router.get(
  "/records",
  verifyStaffToken,
  async (req, res) => {

    try {

      const snapshot =
        await admin
          .firestore()
          .collection("records")
          .where(
            "stationId",
            "==",
            req.staff.stationId
          )
          .get();

      const records =
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

      return res.json({
      success: true,
      records,
      });

    } catch (err) {

      console.error(
        "Load staff records failed:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Failed to load records",
      });

    }

  }
);

// =========================
// MOVE RECORD TO TRASH
// =========================

router.post(
  "/move-to-trash",
  verifyStaffToken,
  async (req, res) => {
    try {
      const { record } = req.body;

      if (!record) {
        return res.status(400).json({
          success: false,
          error: "Record missing",
        });
      }

      // Prefer the actual Firestore document key.
      // record.id is populated by GET /records.
      // record.recordId is saved during upload.
      // Fall back to legacy keys for older records.
      const recordKey =
        record.id ||
        record.recordId ||
        (
          record.documentType === "driving_license"
            ? `driving_license_${String(record.idNumber || "").replace(/\s+/g, "")}`
            : record.idNumber
        );

      if (!recordKey) {
        return res.status(400).json({
          success: false,
          error: "Record document key missing",
        });
      }

      const db = admin.firestore();

      const recordRef = db
        .collection("records")
        .doc(recordKey);

      const recordSnap = await recordRef.get();

      if (!recordSnap.exists) {
        return res.status(404).json({
          success: false,
          error: "Record not found",
        });
      }

      const existingRecord = recordSnap.data();

      // Enforce station-level authorization.
      if (
        existingRecord.stationId !==
        req.staff.stationId
      ) {
        return res.status(403).json({
          success: false,
          error:
            "You are not authorized to modify this record",
        });
      }

      const trashRef = db
        .collection("trash")
        .doc(recordKey);


    // Find notification requests using the full document-aware match key.
    // This prevents a driving licence from deleting a National ID request
    // belonging to the same person and supports birth certificates.
    const normalizeTrashText = (value = "") =>
      String(value).trim().toLowerCase();

    const normalizeTrashId = (value = "") =>
      String(value)
        .replace(/[\s\_-]+/g, "")
        .trim()
        .toLowerCase();

    // Keep the same date-normalization rules used by userRoutes.js
    // and the existing helper in this file.
    const normalizeTrashDate = (dob = "") => {
      const value = String(dob).trim();

      if (!value) return "";

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
    };

    const normalizeTrashSex = (value = "") => {
      const v = normalizeTrashText(value);

      if (v === "m" || v === "male") return "male";
      if (v === "f" || v === "female") return "female";

      return v;
    };

    // Older records without a documentType continue to be treated
    // as National IDs, matching the existing upload compatibility rule.
    const trashDocumentType =
      existingRecord.documentType || "national_id";

    const trashLocation =
      trashDocumentType === "national_id" ||
      trashDocumentType === "birth_certificate"
        ? normalizeTrashText(
            existingRecord.placeOfBirth ||
              existingRecord.district ||
              ""
          )
        : "";

    const expectedMatchKey = [
      trashDocumentType,
      normalizeTrashText(existingRecord.fullName),
      normalizeTrashId(existingRecord.idNumber || ""),
      normalizeTrashDate(existingRecord.dob),
      normalizeTrashSex(existingRecord.sex),
      trashLocation,
    ].join("|");

    const notifySnapshot = await db
      .collection("notify_requests")
      .where("matchKey", "==", expectedMatchKey)
      .get();


      // Move the record and delete it from active records
      // atomically. allHistoryRecords is intentionally untouched.
      const batch = db.batch();

      batch.set(trashRef, {
        ...existingRecord,
        originalRecordKey: recordKey,
        trashedAt: new Date().toISOString(),
      });

      batch.delete(recordRef);

notifySnapshot.docs.forEach((docSnap) => {
  batch.delete(docSnap.ref);
});

      await batch.commit();

      return res.json({
        success: true,
        record: {
          ...existingRecord,
          id: recordKey,
          originalRecordKey: recordKey,
        },
      });
    } catch (err) {
      console.error(
        "❌ Staff Move To Trash Failed:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Move to trash failed",
      });
    }
  }
);

// =========================
// GET STAFF TRASH
// =========================

router.get(
  "/trash",
  verifyStaffToken,
  async (req, res) => {

    try {

      const snapshot =
        await admin
          .firestore()
          .collection("trash")
          .where(
            "stationId",
            "==",
            req.staff.stationId
          )
          .get();

const trash = snapshot.docs.map(doc => ({
  ...doc.data(),
  id: doc.id,
}));


      return res.json({
        success: true,
        trash,
      });

    } catch (err) {

      console.error(
        "Load staff trash failed:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Failed to load staff trash",
      });

    }

  }
);

// =========================
// RESTORE STAFF RECORD
// =========================

router.post(
  "/trash/restore",
  verifyStaffToken,
  async (req, res) => {
    try {
      const { record } = req.body;

      if (!record) {
        return res.status(400).json({
          success: false,
          error: "Record missing",
        });
      }

      // Use the original Firestore key.
      // The fallbacks support older trash records.
      const recordKey =
        record.originalRecordKey ||
        record.id ||
        record.recordId ||
        (
          record.documentType === "driving_license"
            ? `driving_license_${String(record.idNumber || "").replace(/\s+/g, "")}`
            : record.idNumber
        );

      if (!recordKey) {
        return res.status(400).json({
          success: false,
          error: "Record document key missing",
        });
      }

      const db = admin.firestore();

      const trashRef = db
        .collection("trash")
        .doc(recordKey);

      const trashSnap = await trashRef.get();

      if (!trashSnap.exists) {
        return res.status(404).json({
          success: false,
          error: "Trash record not found",
        });
      }

      const existingRecord = trashSnap.data();

      // Enforce station-level authorization.
      if (
        existingRecord.stationId !==
        req.staff.stationId
      ) {
        return res.status(403).json({
          success: false,
          error:
            "You are not authorized to restore this record",
        });
      }

      const recordRef = db
        .collection("records")
        .doc(recordKey);

      // Avoid silently overwriting a different active record.
      const activeSnap = await recordRef.get();

      if (activeSnap.exists) {
        return res.status(409).json({
          success: false,
          error:
            "An active record already exists with this document key",
        });
      }

      // Remove trash-only metadata from the active record.
      const {
        trashedAt,
        originalRecordKey,
        ...restoredRecord
      } = existingRecord;

      const batch = db.batch();

      // Restore using the SAME key it had before trashing.
      batch.set(recordRef, restoredRecord);

      // Keep allHistoryRecords untouched; it already contains
      // the record from the original upload.
      batch.delete(trashRef);

      await batch.commit();

      return res.json({
        success: true,
        record: {
          ...restoredRecord,
          id: recordKey,
        },
      });
    } catch (err) {
      console.error(
        "❌ Staff Restore Failed:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Restore failed",
      });
    }
  }
);



// =========================
// GET STAFF PICKUP STATION
// =========================

router.get(
  "/pickup-stations",
  verifyStaffToken,
  async (req, res) => {

    try {

      const db = admin.firestore();

      const docSnap = await db
        .collection("appStorage")
        .doc("pickupStations")
        .get();

      if (!docSnap.exists) {

        return res.json({
          success: true,
          stations: [],
        });

      }

      const stations =
        docSnap.data()?.value || [];

      // Return ONLY the logged-in staff station
      const station = stations.find(
        s =>
          s.id === req.staff.stationId
      );

      if (!station) {

        return res.json({
          success: true,
          stations: [],
        });

      }

      return res.json({
        success: true,
        stations: [station],
      });

    } catch (err) {

      console.error(
        "Load staff pickup station failed:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Failed to load pickup station",
      });

    }

  }
);

module.exports = router;
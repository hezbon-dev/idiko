
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const verifyStaffToken = require("../middleware/verifyStaffToken");

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

      const normalizedName = String(fullName || "")
        .trim()
        .toLowerCase();

      const normalizedDob = String(dob || "").trim();

      const normalizedSex = String(sex || "")
        .trim()
        .toLowerCase();

      const normalizedId = String(idNumber || "")
        .replace(/\s+/g, "")
        .trim();

      // The frontend currently sends the birth-certificate
      // place of birth through the "district" field.
      // Accept "placeOfBirth" too for future compatibility.
      const normalizedPlaceOfBirth = String(
        req.body.placeOfBirth || district || ""
      )
        .trim()
        .toLowerCase();

      const normalizedDistrict =
        documentType === "national_id"
          ? String(district || "").trim().toLowerCase()
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
      // NATIONAL ID NOTIFICATION MATCHING
      // PRESERVED FROM YOUR EXISTING IMPLEMENTATION
      // ==================================================

      // Do not run the current ID-based matching algorithm for
      // driving licences or birth certificates. Their matching
      // strategy can be added separately without changing ID logic.

      if (documentType === "national_id") {
        const normalizeText = (value = "") =>
          String(value).trim().toLowerCase();

        const normalizeId = (value = "") =>
          String(value)
            .replace(/\s+/g, "")
            .trim();

        const normalizeDate = (value = "") => {
          const parts = String(value)
            .trim()
            .split(/\D+/);

          if (parts.length !== 3) {
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

          return `${year.padStart(4, "0")}-${month.padStart(
            2,
            "0"
          )}-${day.padStart(2, "0")}`;
        };

        const normalizeSex = (value = "") => {
          const v = String(value)
            .trim()
            .toLowerCase();

          if (v === "m" || v === "male") {
            return "male";
          }

          if (v === "f" || v === "female") {
            return "female";
          }

          return v;
        };

        const createMatchKey = (
          fullName = "",
          dob = "",
          sex = "",
          district = ""
        ) => {
          return [
            normalizeText(fullName),
            normalizeDate(dob),
            normalizeSex(sex),
            normalizeText(district),
          ].join("|");
        };

        const recordMatchKey = createMatchKey(
          record.fullName,
          record.dob,
          record.sex,
          record.district
        );

        console.log(
          "🔑 Upload record matchKey:",
          recordMatchKey
        );

        // Look up matching pending notification requests.
        const matchKeySnapshot = await db
          .collection("notify_requests")
          .where("matchKey", "==", recordMatchKey)
          .get();

        const matchingNotifyDoc =
          matchKeySnapshot.docs.find((doc) => {
            const request = doc.data();

            // Skip requests already matched.
            if (request.matched === true) {
              return false;
            }

            // Skip expired requests.
            if (request.expired === true) {
              return false;
            }

            // If a request has an ID number, it must match.
            if (
              request.idNumber &&
              normalizeId(request.idNumber) !== ""
            ) {
              return (
                normalizeId(request.idNumber) ===
                normalizedId
              );
            }

            // Preserve existing behavior for ID-less requests.
            return true;
          });

        console.log(
          "🔎 TARGETED NOTIFY LOOKUP:",
          {
            uploadedId: normalizedId,
            matchKey: recordMatchKey,
            matchedRequest:
              matchingNotifyDoc?.id || null,
          }
        );

        if (matchingNotifyDoc) {
          const matchedAt = new Date().toISOString();

          await matchingNotifyDoc.ref.update({
            idNumber: normalizedId,
            matched: true,
            startedAt: matchedAt,
            nextNotificationAt: matchedAt,
            sentCount: 0,
            status: "pending",
          });

          console.log(
            "✅ Notify request matched:",
            matchingNotifyDoc.id,
            "→",
            normalizedId
          );

          console.log(
            "📅 Notification schedule initialized:",
            normalizedId
          );
        } else {
          console.log(
            "ℹ️ No matching notify request found for:",
            normalizedId
          );
        }
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

      if (!record || !record.idNumber) {

        return res.status(400).json({
          success: false,
          error: "Record missing",
        });

      }

      const db = admin.firestore();

      // Get the real record from Firestore
      const recordRef = db
        .collection("records")
        .doc(record.idNumber);

      const recordSnap =
        await recordRef.get();

      if (!recordSnap.exists) {

        return res.status(404).json({
          success: false,
          error: "Record not found",
        });

      }

      // Use the database record as the source of truth
      const existingRecord =
        recordSnap.data();

      // Make sure this record belongs
      // to the logged-in staff station
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

      // Move the actual Firestore record to trash
      await db
        .collection("trash")
        .doc(record.idNumber)
        .set({
          ...existingRecord,
          trashedAt:
            new Date().toISOString(),
        });

      // Remove it from active records
      await recordRef.delete();

      // Remove notify requests
      const notifySnapshot =
        await db
          .collection("notify_requests")
          .where(
            "idNumber",
            "==",
            record.idNumber
          )
          .get();

      for (
        const docSnap
        of notifySnapshot.docs
      ) {

        await docSnap.ref.delete();

      }

      return res.json({
        success: true,
        record: existingRecord,
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

      const trash =
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
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

      if (!record || !record.idNumber) {

        return res.status(400).json({
          success: false,
          error: "Record missing",
        });

      }

      const db = admin.firestore();

      // Get the real record from trash
      const trashRef = db
        .collection("trash")
        .doc(record.idNumber);

      const trashSnap =
        await trashRef.get();

      if (!trashSnap.exists) {

        return res.status(404).json({
          success: false,
          error: "Trash record not found",
        });

      }

      // Use the database record as the source of truth
      const existingRecord =
        trashSnap.data();

      // Make sure this record belongs
      // to the logged-in staff station
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

      // Restore to active records
      await db
        .collection("records")
        .doc(record.idNumber)
        .set(existingRecord);

      // Restore/update permanent history
      await db
        .collection("allHistoryRecords")
        .doc(record.idNumber)
        .set(existingRecord);

      // Remove from trash
      await trashRef.delete();

      return res.json({
        success: true,
        record: existingRecord,
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
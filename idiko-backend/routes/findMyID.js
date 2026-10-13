// routes/findMyID.js

const express = require("express");
const admin = require("firebase-admin");

const router = express.Router();

let db;

try {
  db = admin.firestore();
} catch (err) {
  console.error(
    "Firestore unavailable:",
    err
  );
}

function normalizeText(s = "") {
  return String(s).trim().toLowerCase();
}

function normalizeId(s = "") {
  return String(s)
    .replace(/[\s\-_]/g, "")
    .toLowerCase();
}

function normalizeDate(dob = "") {
  dob = String(dob).trim();

  const parts = dob.split(/\D+/);

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
}

function normalizeSex(value = "") {
  const v = value.trim().toLowerCase();

  if (v === "m" || v === "male") {
    return "male";
  }

  if (v === "f" || v === "female") {
    return "female";
  }

  return v;
}

router.post("/find-id", async (req, res) => {
  try {
    const {
      documentType,
      fullName,
      idNumber,
      dob,
      sex,
      district,
      placeOfBirth,
    } = req.body;

    const allowedDocumentTypes = [
      "id",
      "drivingLicence",
      "birthCertificate",
    ];

    if (!allowedDocumentTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid document type",
      });
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Database unavailable",
      });
    }

    const requestedName = normalizeText(fullName);
    const requestedDob = normalizeDate(dob);
    const requestedSex = normalizeSex(sex);
    const requestedId = normalizeId(idNumber);
    const requestedDistrict = normalizeText(district);

    // Birth certificates use place of birth.
    // The frontend may send it in either placeOfBirth or district.
    const requestedPlaceOfBirth = normalizeText(
      placeOfBirth || district || ""
    );

    // Common identity fields required for every document type.
    if (!requestedName || !requestedDob || !requestedSex) {
      return res.status(400).json({
        success: false,
        error: "Full name, date of birth and sex are required",
      });
    }

    // National ID and driving licence require the holder's ID number.
    if (
      (documentType === "id" ||
        documentType === "drivingLicence") &&
      !requestedId
    ) {
      return res.status(400).json({
        success: false,
        found: false,
        error: "ID number is required",
      });
    }

    // National ID requires district.
    if (documentType === "id" && !requestedDistrict) {
      return res.status(400).json({
        success: false,
        error: "District is required for National ID lookup",
      });
    }

    // Birth certificate requires place of birth, not an ID number.
    if (
      documentType === "birthCertificate" &&
      !requestedPlaceOfBirth
    ) {
      return res.status(400).json({
        success: false,
        error: "Place of birth is required",
      });
    }

    // ================================================
    // 1. NATIONAL ID LOOKUP
    // Keep the existing direct ID-number document lookup.
    // Stored type: national_id
    // ================================================
    if (documentType === "id") {
      const recordDoc = await db
        .collection("records")
        .doc(requestedId)
        .get();

      if (!recordDoc.exists) {
        return res.json({
          success: true,
          found: false,
        });
      }

      const record = recordDoc.data();

      const found =
        record.documentType === "national_id" &&
        normalizeText(record.fullName) === requestedName &&
        normalizeId(record.idNumber) === requestedId &&
        normalizeDate(record.dob) === requestedDob &&
        normalizeSex(record.sex) === requestedSex &&
        normalizeText(record.district) === requestedDistrict;

      if (!found) {
        return res.json({
          success: true,
          found: false,
        });
      }

return res.json({
  success: true,
  found: true,
  recordId: recordDoc.id,
  documentType: record.documentType,
  idNumber: record.idNumber || "",
  status: record.status,
});
    }

    // ================================================
    // 2. DRIVING LICENCE LOOKUP
    // Stored type: driving_license
    // Does not compare place of birth or district.
    // ================================================
    if (documentType === "drivingLicence") {
      const recordsRef = db.collection("records");

      const drivingLicenseKey = `driving_license_${requestedId}`;

      const recordDoc = await recordsRef
        .doc(drivingLicenseKey)
        .get();

      let record = recordDoc.exists
        ? recordDoc.data()
        : null;

      // If the prefixed key is not suitable, search existing
      // driving licence records by their stored identity details.
      if (
        !record ||
        record.documentType !== "driving_license" ||
        normalizeId(record.idNumber) !== requestedId
      ) {
        const snapshot = await recordsRef
          .where("documentType", "==", "driving_license")
          .get();

        const matchingDoc = snapshot.docs.find((doc) => {
          const candidate = doc.data();

          return (
            normalizeId(candidate.idNumber) === requestedId &&
            normalizeText(candidate.fullName) === requestedName &&
            normalizeDate(candidate.dob) === requestedDob &&
            normalizeSex(candidate.sex) === requestedSex
          );
        });

        if (!matchingDoc) {
          return res.json({
            success: true,
            found: false,
          });
        }

       record = {...matchingDoc.data(),recordId: matchingDoc.id,};
      }

      const found =
        record.documentType === "driving_license" &&
        normalizeText(record.fullName) === requestedName &&
        normalizeId(record.idNumber) === requestedId &&
        normalizeDate(record.dob) === requestedDob &&
        normalizeSex(record.sex) === requestedSex;

      if (!found) {
        return res.json({
          success: true,
          found: false,
        });
      }

return res.json({
  success: true,
  found: true,
  recordId: record.recordId || drivingLicenseKey,
  documentType: record.documentType,
  idNumber: record.idNumber || "",
  status: record.status,
});
    }

    // ================================================
    // 3. BIRTH CERTIFICATE LOOKUP
    // Stored type: birth_certificate
    // Does not require or compare an ID number.
    // Matches using place of birth instead of district.
    // ================================================
    if (documentType === "birthCertificate") {
      const snapshot = await db
        .collection("records")
        .where("documentType", "==", "birth_certificate")
        .get();

      const matchingDoc = snapshot.docs.find((doc) => {
        const record = doc.data();

        return (
          normalizeText(record.fullName) === requestedName &&
          normalizeDate(record.dob) === requestedDob &&
          normalizeSex(record.sex) === requestedSex &&
          normalizeText(
            record.placeOfBirth || record.district || ""
          ) === requestedPlaceOfBirth
        );
      });

      if (!matchingDoc) {
        return res.json({
          success: true,
          found: false,
        });
      }

      const record = matchingDoc.data();

return res.json({
  success: true,
  found: true,
  recordId: matchingDoc.id,
  documentType: record.documentType,
  idNumber: "",
  status: record.status,
});
    }

    return res.json({
      success: true,
      found: false,
    });
  } catch (err) {
    console.error("find-id error:", err);

    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

router.get("/record/:idNumber", async (req, res) => {

  if (!db) {
    return res.status(500).json({
      success: false,
      error: "Database unavailable",
    });

  }

  try {

    const requestedId =
      normalizeId(req.params.idNumber);

    const docSnap =
      await db
        .collection("records")
        .doc(requestedId)
        .get();

    if (!docSnap.exists) {

      return res.json({
        success: false,
        found: false,
      });

    }

    const record = docSnap.data();

    // Safety check:
    // Make sure the stored ID actually matches
    // the normalized ID requested by the user.
    if (
      normalizeId(record.idNumber) !==
      requestedId
    ) {

      return res.json({
        success: false,
        found: false,
      });

    }

    return res.json({
      success: true,
      found: true,
      record,
    });

  } catch (err) {

    console.error(
      "record lookup error:",
      err
    );

    return res.status(500).json({
      success: false,
    });

  }

});

// Fetch a record by its unique Firestore document ID
router.get("/record-by-id/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;

    if (!recordId) {
      return res.status(400).json({
        success: false,
        found: false,
        message: "Record ID is required",
      });
    }

    const recordDoc = await db
      .collection("records")
      .doc(recordId)
      .get();

    if (!recordDoc.exists) {
      return res.status(404).json({
        success: true,
        found: false,
      });
    }

    return res.json({
      success: true,
      found: true,
      record: {
        ...recordDoc.data(),
        recordId: recordDoc.id,
      },
    });
  } catch (error) {
    console.error("Failed to fetch record by ID:", error);

    return res.status(500).json({
      success: false,
      found: false,
      message: "Failed to fetch record",
    });
  }
});

// =========================
// PUBLIC PICKUP STATION LOOKUP
// =========================

router.get(
  "/public-pickup-station/:stationName",
  async (req, res) => {

    if (!db) {

      return res.status(500).json({
        success: false,
        error: "Database unavailable",
      });

    }

    try {

      const stationName =
        decodeURIComponent(req.params.stationName)
          .trim()
          .toLowerCase();

      const docSnap =
        await db
          .collection("appStorage")
          .doc("pickupStations")
          .get();

      if (!docSnap.exists) {

        return res.status(404).json({
          success: false,
          error: "Pickup stations not found",
        });

      }

      const stations =
        docSnap.data()?.value || [];

      const station =
        stations.find(
          s =>
            (s.stationName || "")
              .trim()
              .toLowerCase() === stationName
        );

      if (!station) {

        return res.status(404).json({
          success: false,
          error: "Pickup station not found",
        });

      }

      return res.json({

        success: true,

        station: {

          stationName: station.stationName,

          location: station.location,

          phone1: station.phone1,

          phone2: station.phone2,

          gps: station.gps,

          enabled: station.enabled,

        },

      });

    } catch (err) {

      console.error(
        "Public pickup station lookup failed:",
        err
      );

      return res.status(500).json({
        success: false,
      });

    }

  }
);

module.exports = router;
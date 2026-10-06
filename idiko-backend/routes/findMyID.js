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
    } = req.body;

    if (
  !["id", "drivingLicence", "birthCertificate"].includes(
    documentType
  )
) {
  return res.status(400).json({
    success: false,
    error: "Invalid document type",
  });
}

// =======================================
// BIRTH CERTIFICATE LOOKUP
// =======================================

if (documentType === "birthCertificate") {

  const snapshot =
    await db
      .collection("records")
      .where("documentType", "==", "birthCertificate")
      .where(
        "normalizedFullName",
        "==",
        normalizeText(fullName)
      )
      .where(
        "normalizedDob",
        "==",
        normalizeDate(dob)
      )
      .where(
        "normalizedSex",
        "==",
        normalizeSex(sex)
      )
      .where(
        "normalizedDistrict",
        "==",
        normalizeText(district)
      )
      .limit(1)
      .get();

  if (snapshot.empty) {
    return res.json({
      success: false,
      found: false,
    });
  }

  const record =
    snapshot.docs[0].data();

  return res.json({
    success: true,
    found: true,
    idNumber: record.idNumber || "",
    status: record.status,
  });
}

// =======================================
// ID / DRIVING LICENCE LOOKUP
// =======================================

const normalizedRequestedId =
  normalizeId(idNumber);

if (!normalizedRequestedId) {
  return res.json({
    success: false,
    found: false,
  });
}

// Look up ONLY the record belonging to this ID.
const recordDoc =
  await db
    .collection("records")
    .doc(normalizedRequestedId)
    .get();

if (!recordDoc.exists) {
  return res.json({
    success: false,
    found: false,
  });
}

const record =
  recordDoc.data();

// =======================================
// DOCUMENT TYPE + IDENTITY MATCH
// =======================================

const found =
  normalizeText(record.documentType) ===
    normalizeText(documentType) &&

  normalizeText(record.fullName) ===
    normalizeText(fullName) &&

  normalizeId(record.idNumber) ===
    normalizedRequestedId &&

  normalizeDate(record.dob) ===
    normalizeDate(dob) &&

  normalizeSex(record.sex) ===
    normalizeSex(sex) &&

  normalizeText(record.district) ===
    normalizeText(district);

if (!found) {
  return res.json({
    success: false,
    found: false,
  });
}

return res.json({
  success: true,
  found: true,
  idNumber: record.idNumber,
  status: record.status,
});

  } catch (err) {

    console.error(
      "find-id error:",
      err
    );

    return res.status(500).json({
      success: false,
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
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
      fullName,
      idNumber,
      dob,
      sex,
      district,
    } = req.body;

    const snapshot =
      await db.collection("records").get();

    const records =
      snapshot.docs.map(doc => doc.data());

    const found = records.find(record =>
      normalizeText(record.fullName) ===
        normalizeText(fullName) &&
      normalizeId(record.idNumber) ===
        normalizeId(idNumber) &&
      normalizeDate(record.dob) ===
        normalizeDate(dob) &&
      normalizeSex(record.sex) ===
        normalizeSex(sex) &&
      normalizeText(record.district) ===
        normalizeText(district)
    );

    if (!found) {
      return res.json({
        success: false,
        found: false,
      });
    }

    return res.json({
      success: true,
      found: true,
      idNumber: found.idNumber,
      status: found.status,
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

    const snapshot =
      await db.collection("records").get();

    const records =
      snapshot.docs.map(doc => doc.data());

    const record =
      records.find(r =>
        normalizeId(r.idNumber) ===
        requestedId
      );

    if (!record) {

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

module.exports = router;
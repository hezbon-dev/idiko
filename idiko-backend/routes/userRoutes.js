// routes/userRoutes.js

const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

function normalizeText(value = "") {
  return String(value).trim().toLowerCase();
}

function normalizeDate(dob = "") {
  const value = String(dob).trim();

  if (!value) {
    return "";
  }

  const parts = value.split(/\D+/);

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
  const v = String(value).trim().toLowerCase();

  if (v === "m" || v === "male") {
    return "male";
  }

  if (v === "f" || v === "female") {
    return "female";
  }

  return v;
}

router.post(
  "/notify-request",
  async (req, res) => {

    try {

      const {
        id,
        createdAt,
        matched,
        status,
        fullName,
        idNumber,
        dob,
        sex,
        district,
        primaryPhone,
        secondaryPhone,
        email,
      } = req.body;

      if (
        !fullName ||
        !dob ||
        !sex ||
        !district ||
        !primaryPhone
      ) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
        });
      }

      const db = admin.firestore();

if (idNumber) {
  const existing =
    await db
      .collection("notify_requests")
      .where("idNumber", "==", idNumber)
      .limit(1)
      .get();

  if (!existing.empty) {
    return res.status(409).json({
      success: false,
      error:
        "You already requested notification for this ID.",
    });
  }
}

if (!idNumber) {
  const existing =
    await db
      .collection("notify_requests")
      .where(
        "fullName",
        "==",
        normalizeText(fullName)
      )
      .get();

  const duplicateIdentity =
    existing.docs.some(doc => {
      const request = doc.data();

      return (
        !request.idNumber &&
        normalizeText(request.fullName) ===
          normalizeText(fullName) &&
        normalizeDate(request.dob) ===
          normalizeDate(dob) &&
        normalizeSex(request.sex) ===
          normalizeSex(sex) &&
        normalizeText(request.district) ===
          normalizeText(district)
      );
    });

  if (duplicateIdentity) {
    return res.status(409).json({
      success: false,
      error:
        "You already requested notification for this identity.",
    });
  }
}

      await db
        .collection("notify_requests")
        .doc(id)
        .set({
          id,
          createdAt,
          matched,
          status,

          fullName,
          idNumber,
          dob,
          sex,
          district,

          primaryPhone,
          secondaryPhone,
          email,
        });

      return res.json({
        success: true,
      });

    } catch (err) {

      console.error(
        "Notify request error:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Server error",
      });

    }

  }
);

module.exports = router;
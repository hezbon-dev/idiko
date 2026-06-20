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

    console.log(
  "🚪 Staff logout:",
  req.staff.stationName
);

    return res.json({
      success: true,
      message: "Logged out",
    });

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
        district
      } = req.body;

      if (
        !frontImage ||
        !backImage ||
        !fullName ||
        !idNumber ||
        !dob ||
        !sex ||
        !district
      ) {

        return res.status(400).json({
          success: false,
          error: "Missing required fields"
        });

      }

      const normalizedId =
        String(idNumber)
          .replace(/\s+/g, "");

      const db =
        admin.firestore();

      const existing =
        await db
          .collection("records")
          .doc(normalizedId)
          .get();

      if (existing.exists) {

        return res.status(409).json({
          success: false,
          error: "ID already exists"
        });

      }

      const record = {

        stationId:
          req.staff.stationId,

        uploadDate:
          new Date().toISOString(),

        fullName:
          fullName
            .trim()
            .toLowerCase(),

        idNumber:
          normalizedId,

        dob,

        sex:
          sex
            .trim()
            .toLowerCase(),

        district:
          district
            .trim()
            .toLowerCase(),

        status: "Pending",

        frontImage,

        backImage,

        pickupStation:
          req.staff.stationName
            .trim()
            .toLowerCase()

      };

      await db
        .collection("records")
        .doc(normalizedId)
        .set(record);

      await db
        .collection(
          "allHistoryRecords"
        )
        .doc(normalizedId)
        .set(record);

      return res.json({
        success: true
      });

    } catch (err) {

      console.error(
        "Upload record error:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Server error"
      });

    }

  }
);


module.exports = router;
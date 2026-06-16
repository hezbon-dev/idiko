const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
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

    if (station.password !== password) {
      return res.status(401).json({
        success: false,
        error: "Invalid password"
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

module.exports = router;
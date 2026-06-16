const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

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

      console.log(
  "📦 Pickup Stations:",
  JSON.stringify(stations, null, 2)
);

    const station = stations.find(
      s =>
        s.stationName?.toLowerCase() ===
        stationName.toLowerCase()
    );

    console.log(
  "🔍 Station Found:",
  station
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

    return res.json({
      success: true,
      station: {
        id: station.id,
        stationName: station.stationName,
        stationNumber: station.stationNumber
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

module.exports = router;
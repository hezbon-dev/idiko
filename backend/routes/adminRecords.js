const express = require("express");
const router = express.Router();

const admin = require("firebase-admin");
const verifyAdminToken = require("../middleware/verifyAdminToken");

// =========================
// GET ALL RECORDS
// =========================

router.get(
  "/records",
  verifyAdminToken,
  async (req, res) => {

    try {

      const db = admin.firestore();

      const snapshot =
        await db.collection("records").get();

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
        "❌ Failed to load records:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Failed to load records",
      });
    }

  }
);

module.exports = router;
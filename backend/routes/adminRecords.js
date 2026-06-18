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

// =========================
// MOVE RECORD TO TRASH
// =========================

router.post(
  "/move-to-trash",
  verifyAdminToken,
  async (req, res) => {

    try {

      const { record } = req.body;

      if (!record) {

        return res.status(400).json({
          success: false,
          error: "Record missing",
        });

      }

      const db = admin.firestore();

      // Move record to trash

      await db
        .collection("trash")
        .doc(record.id)
        .set(record);

      // Remove from records

      await db
        .collection("records")
        .doc(record.id)
        .delete();

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

      for (const docSnap of notifySnapshot.docs) {

        await docSnap.ref.delete();

      }

      return res.json({
        success: true,
      });

    } catch (err) {

      console.error(
        "❌ Move To Trash Failed:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Move to trash failed",
      });

    }

  }
);

module.exports = router;
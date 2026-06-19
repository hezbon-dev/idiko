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

// =========================
// GET ALL TRASH
// =========================

router.get(
  "/trash",
  verifyAdminToken,
  async (req, res) => {

    try {

      const db =
        admin.firestore();

      const snapshot =
        await db
          .collection("trash")
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
        "❌ Failed to load trash:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Failed to load trash",
      });
    }

  }
);

// =========================
// RESTORE RECORD
// =========================

router.post(
  "/trash/restore",
  verifyAdminToken,
  async (req, res) => {

    try {

      const db =
        admin.firestore();

      const { record } =
        req.body;

      await db
        .collection("records")
        .doc(record.idNumber)
        .set(record);

      await db
        .collection("allHistoryRecords")
        .doc(record.idNumber)
        .set(record);

      await db
        .collection("trash")
        .doc(record.idNumber)
        .delete();

      return res.json({
        success: true,
      });

    } catch (err) {

      console.error(
        "❌ Restore failed:",
        err
      );

      return res.status(500).json({
        success: false,
      });

    }

  }
);

// =========================
// DELETE TRASH RECORD
// =========================

router.delete(
  "/trash/:idNumber",
  verifyAdminToken,
  async (req, res) => {

    try {

      const db =
        admin.firestore();

      const { idNumber } =
        req.params;

      await db
        .collection("trash")
        .doc(idNumber)
        .delete();

      return res.json({
        success: true,
      });

    } catch (err) {

      console.error(
        "❌ Delete failed:",
        err
      );

      return res.status(500).json({
        success: false,
      });

    }

  }
);

module.exports = router;
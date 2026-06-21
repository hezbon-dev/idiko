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


// =========================
// DASHBOARD STATS
// =========================

router.get(
  "/dashboard-stats",
  verifyAdminToken,
  async (req, res) => {

    try {

      const db =
        admin.firestore();

      const recordsSnap =
        await db
          .collection("records")
          .get();

      const historySnap =
        await db
          .collection("allHistoryRecords")
          .get();

      const notifySnap =
        await db
          .collection("notify_requests")
          .get();

      const records =
        recordsSnap.docs.map(
          doc => doc.data()
        );

      const history =
        historySnap.docs.map(
          doc => doc.data()
        );

      const notify =
        notifySnap.docs.map(
          doc => doc.data()
        );

      const merged =
        [...records, ...history];

      const unique =
        Array.from(
          new Map(
            merged.map(
              r => [
                r.idNumber,
                r,
              ]
            )
          ).values()
        );

      return res.json({

        success: true,

        totalUploaded:
          unique.length,

        pending:
          unique.filter(
            r =>
              r.status ===
              "Pending"
          ).length,

        paid:
          unique.filter(
            r =>
              r.status ===
              "Paid"
          ).length,

        awaiting:
          notify.filter(
            n =>
              !n.matched
          ).length,

        matched:
          notify.filter(
            n =>
              n.matched
          ).length,

      });

    } catch (err) {

      console.error(
        "Dashboard stats failed:",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

          error:
            "Failed to load dashboard stats",

        });

    }

  }
);

// =========================
// GET NOTIFY REQUESTS
// =========================

router.get(
  "/notify-requests",
  verifyAdminToken,
  async (req, res) => {

    try {

      const db =
        admin.firestore();

      const snapshot =
        await db
          .collection(
            "notify_requests"
          )
          .get();

      const requests =
        snapshot.docs.map(
          doc => ({
            id: doc.id,
            ...doc.data(),
          })
        );

      return res.json({

        success: true,

        requests,

      });

    } catch (err) {

      console.error(
        "Failed to load notify requests",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

          error:
            "Failed to load notify requests",

        });

    }

  }
);

// =========================
// PUBLIC PICKUP STATIONS
// =========================

router.get(
  "/public-pickup-stations",
  async (req, res) => {

    try {

      const db =
        admin.firestore();

      const docSnap =
        await db
          .collection("appStorage")
          .doc("pickupStations")
          .get();

      const stations =
        docSnap.exists
          ? docSnap.data().value || []
          : [];

      const publicStations =
        stations.map(station => ({

          stationName:
            station.stationName,

          location:
            station.location,

          phone1:
            station.phone1,

          phone2:
            station.phone2,

          gps:
            station.gps,

          enabled:
            station.enabled,

        }));

      return res.json({

        success: true,

        stations:
          publicStations,

      });

    } catch (err) {

      console.error(
        "Public stations failed",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

        });

    }

  }
);

// =========================
// GET PICKUP STATIONS
// =========================

router.get(
  "/pickup-stations",
  verifyAdminToken,
  async (req, res) => {

    try {

      const db =
        admin.firestore();

      const docSnap =
        await db
          .collection("appStorage")
          .doc("pickupStations")
          .get();

      const stations =
        docSnap.exists
          ? docSnap.data().value || []
          : [];

      return res.json({

        success: true,

        stations,

      });

    } catch (err) {

      console.error(
        "Load stations failed",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

        });

    }

  }
);

// =========================
// CREATE PICKUP STATION
// =========================

router.post(
  "/pickup-stations",
  verifyAdminToken,
  async (req, res) => {

    try {

      const db =
        admin.firestore();

      const { station } =
        req.body;

      if (!station) {

        return res.status(400).json({

          success: false,

          error:
            "Station missing",

        });

      }

      const docRef =
        db
          .collection("appStorage")
          .doc("pickupStations");

      const docSnap =
        await docRef.get();

      const stations =
        docSnap.exists
          ? docSnap.data().value || []
          : [];

      stations.push(station);

      await docRef.set({
        value: stations,
      });

      return res.json({

        success: true,

      });

    } catch (err) {

      console.error(
        "Create station failed",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

        });

    }

  }
);

// =========================
// UPDATE PICKUP STATIONS
// =========================

router.put(
  "/pickup-stations",
  verifyAdminToken,
  async (req, res) => {

    try {

      const db =
        admin.firestore();

      const { stations } =
        req.body;

      await db
        .collection("appStorage")
        .doc("pickupStations")
        .set({
          value: stations,
        });

      return res.json({

        success: true,

      });

    } catch (err) {

      console.error(
        "Update stations failed",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

        });

    }

  }
);


// =========================
// GET MAINTENANCE STATUS
// =========================

router.get(
  "/maintenance-status",
  async (req, res) => {

    try {

      const db =
        admin.firestore();

      const docSnap =
        await db
          .collection("system")
          .doc("settings")
          .get();

      const maintenanceMode =
        docSnap.exists
          ? docSnap.data()
              .maintenanceMode === true
          : false;

      return res.json({

        success: true,

        maintenanceMode,

      });

    } catch (err) {

      console.error(
        "Maintenance status failed",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

          maintenanceMode: false,

        });

    }

  }
);

// =========================
// UPDATE MAINTENANCE STATUS
// =========================

router.put(
  "/maintenance-status",
  verifyAdminToken,
  async (req, res) => {

    try {

      const {
        maintenanceMode,
      } = req.body;

      await admin
        .firestore()
        .collection("system")
        .doc("settings")
        .set(
          {
            maintenanceMode,
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
        "Update maintenance failed",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

        });

    }

  }
);

// =========================
// GET ACTIVE STAFF SESSIONS
// =========================

router.get(
  "/staff-sessions",
  verifyAdminToken,
  async (req, res) => {

    try {

      const snapshot =
        await admin
          .firestore()
          .collection(
            "staffSessions"
          )
          .get();

      const now =
        Date.now();

      const tenSecondsAgo =
        now - 10000;

      const active =
        snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter(session => {

            if (
              !session.lastActive
            ) {
              return false;
            }

            const lastActive =
              session
                .lastActive
                .toDate()
                .getTime();

            return (
              lastActive >
              tenSecondsAgo
            );

          })
          .map(
            session =>
              session.stationName ||
              session.staffId
          );

      return res.json({

        success: true,

        active,

      });

    } catch (err) {

      console.error(
        "Load staff sessions failed",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

        });

    }

  }
);


module.exports = router;
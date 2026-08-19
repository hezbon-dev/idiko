// routes/adminRecord.js

const express = require("express");
const router = express.Router();

const admin = require("firebase-admin");
const verifyAdminToken = require("../middleware/verifyAdminToken");

// =========================
// DASHBOARD PERIOD HELPERS
// =========================

const DASHBOARD_TIME_ZONE = "Africa/Nairobi";

const getDatePartsInNairobi = (date = new Date()) => {

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          DASHBOARD_TIME_ZONE,

        year: "numeric",

        month: "2-digit",

        day: "2-digit",
      }
    );

  const parts =
    formatter.formatToParts(date);

  const values = {};

  for (const part of parts) {

    if (
      part.type !== "literal"
    ) {

      values[part.type] =
        part.value;

    }

  }

  return values;

};

const getNairobiDateString = (
  date = new Date()
) => {

  const {
    year,
    month,
    day,
  } =
    getDatePartsInNairobi(
      date
    );

  return `${year}-${month}-${day}`;

};

const getNairobiDateRange = (
  period,
  from,
  to
) => {

  const now =
    new Date();

  const todayString =
    getNairobiDateString(
      now
    );

  if (
    period === "All"
  ) {

    return null;

  }

  if (
    period === "Custom"
  ) {

    if (
      !from ||
      !to ||
      from > to
    ) {

      return null;

    }

    return {
      from,
      to,
    };

  }

  if (
    period === "Yesterday"
  ) {

    const todayParts =
      getDatePartsInNairobi(
        now
      );

    const todayAtMidnightUTC =
      new Date(
        Date.UTC(
          Number(todayParts.year),
          Number(todayParts.month) - 1,
          Number(todayParts.day)
        )
      );

    todayAtMidnightUTC.setUTCDate(
      todayAtMidnightUTC.getUTCDate() - 1
    );

    const yesterday =
      todayAtMidnightUTC
        .toISOString()
        .slice(0, 10);

    return {
      from: yesterday,
      to: yesterday,
    };

  }

  if (
    period === "LastMonth"
  ) {

    const todayParts =
      getDatePartsInNairobi(
        now
      );

    const year =
      Number(todayParts.year);

    const month =
      Number(todayParts.month);

    const firstDayCurrentMonth =
      new Date(
        Date.UTC(
          year,
          month - 1,
          1
        )
      );

    const lastMonthDate =
      new Date(
        firstDayCurrentMonth
      );

    lastMonthDate.setUTCMonth(
      lastMonthDate.getUTCMonth() - 1
    );

    const firstDayLastMonth =
      new Date(
        Date.UTC(
          lastMonthDate.getUTCFullYear(),
          lastMonthDate.getUTCMonth(),
          1
        )
      );

    const lastDayLastMonth =
      new Date(
        Date.UTC(
          year,
          month - 1,
          0
        )
      );

    return {
      from:
        firstDayLastMonth
          .toISOString()
          .slice(0, 10),

      to:
        lastDayLastMonth
          .toISOString()
          .slice(0, 10),
    };

  }

  if (
    period === "LastYear"
  ) {

    const todayParts =
      getDatePartsInNairobi(
        now
      );

    const year =
      Number(todayParts.year);

    return {
      from:
        `${year - 1}-01-01`,

      to:
        `${year - 1}-12-31`,
    };

  }

  return null;

};

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
// GET HISTORY RECORDS
// =========================

router.get(
  "/history-records",
  verifyAdminToken,
  async (req, res) => {

    try {

      const db =
        admin.firestore();

      const snapshot =
        await db
          .collection("allHistoryRecords")
          .get();

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
        "Failed to load history records",
        err
      );

      return res
        .status(500)
        .json({

          success: false,

          error:
            "Failed to load history records",

        });

    }

  }
);

// =========================
// CREATE RECORD
// =========================

router.post(
  "/records",
  verifyAdminToken,
  async (req, res) => {

    try {

      const db = admin.firestore();

      const { record } = req.body;

      if (!record) {

        return res.status(400).json({
          success: false,
          error: "Record missing",
        });

      }

      await db
        .collection("records")
        .doc(record.idNumber)
        .set(record);

      await db
        .collection("allHistoryRecords")
        .doc(record.idNumber)
        .set(record);

      return res.json({
        success: true,
      });

    } catch (err) {

      console.error(
        "Create record failed:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Failed to create record",
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
        .doc(record.idNumber)
        .set(record);

      // Remove from records

      await db
        .collection("records")
        .doc(record.idNumber)
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

      // =========================
      // READ PERIOD PARAMETERS
      // =========================

      const {
        period = "All",
        from,
        to,
      } = req.query;

      const dateRange =
        getNairobiDateRange(
          period,
          from,
          to
        );

      // =========================
      // LOAD PERMANENT HISTORY
      // =========================

      const historySnap =
        await db
          .collection(
            "allHistoryRecords"
          )
          .get();

      const history =
        historySnap.docs.map(
          doc => ({
            id: doc.id,
            ...doc.data(),
          })
        );

      // =========================
      // UPLOADED IDs
      // =========================

      let uploadedRecords =
        history;

      if (dateRange) {

        uploadedRecords =
          history.filter(
            record => {

              if (
                !record.uploadDate
              ) {

                return false;

              }

              const uploadDate =
                record.uploadDate
                  .toDate
                  ? record.uploadDate.toDate()
                  : new Date(
                      record.uploadDate
                    );

              if (
                Number.isNaN(
                  uploadDate.getTime()
                )
              ) {

                return false;

              }

              const uploadDateString =
                getNairobiDateString(
                  uploadDate
                );

              return (
                uploadDateString >=
                  dateRange.from &&
                uploadDateString <=
                  dateRange.to
              );

            }
          );

      }

      // =========================
      // PAID IDs
      // =========================

      let paidRecords =
        history.filter(
          record =>
            record.status ===
            "Paid"
        );

      if (dateRange) {

        paidRecords =
          paidRecords.filter(
            record => {

              if (
                !record.paidAt
              ) {

                return false;

              }

              const paidDate =
                record.paidAt
                  .toDate
                  ? record.paidAt.toDate()
                  : new Date(
                      record.paidAt
                    );

              if (
                Number.isNaN(
                  paidDate.getTime()
                )
              ) {

                return false;

              }

              const paidDateString =
                getNairobiDateString(
                  paidDate
                );

              return (
                paidDateString >=
                  dateRange.from &&
                paidDateString <=
                  dateRange.to
              );

            }
          );

      }

      // =========================
      // PENDING IDs
      // =========================
      
      const pending =
        history.filter(
          record =>
            record.status ===
            "Pending"
        ).length;

      // =========================
      // NOTIFY REQUESTS
      // =========================
      
      const notifySnap =
        await db
          .collection(
            "notify_requests"
          )
          .get();

      const notify =
        notifySnap.docs.map(
          doc => doc.data()
        );

      const awaiting =
        notify.filter(
          request =>
            !request.matched
        ).length;

      const matched =
        notify.filter(
          request =>
            request.matched
        ).length;

      // =========================
      // RESPONSE
      // =========================

      return res.json({

        success: true,

        totalUploaded:
          uploadedRecords.length,

        pending,

        paid:
          paidRecords.length,

        awaiting,

        matched,

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
// GET SINGLE PUBLIC PICKUP STATION
// =========================

router.get(
  "/public-pickup-station/:stationName",
  async (req, res) => {

    try {

      const { stationName } = req.params;

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

      const station =
        stations.find(
          s =>
            (s.stationName || "")
              .trim()
              .toLowerCase() ===
            stationName
              .trim()
              .toLowerCase()
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

        },

      });

    } catch (err) {

      console.error(
        "Load single pickup station failed",
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

// =========================
// UPDATE RECORD STATUS
// =========================

router.put(
  "/records/status",
  verifyAdminToken,
  async(req,res)=>{

    try{

      const {idNumber,status}=req.body;

      await admin
        .firestore()
        .collection("records")
        .doc(idNumber)
        .set(
          {
            status,
          },
          {
            merge:true,
          }
        );

      return res.json({
        success:true,
      });

    }

    catch(err){

      console.error(err);

      return res.status(500).json({
        success:false,
      });

    }

  }
);

// =========================
// CREATE NOTIFY REQUEST
// =========================

router.post(
  "/notify-requests",
  async(req,res)=>{

    try{

      const request=req.body.request;

      if(!request){

        return res.status(400).json({
          success:false,
        });

      }

      await admin
        .firestore()
        .collection("notify_requests")
        .doc(request.id || request.idNumber)
        .set(request);

      return res.json({
        success:true,
      });

    }

    catch(err){

      console.error(err);

      return res.status(500).json({
        success:false,
      });

    }

  }
);

// =========================
// UPDATE NOTIFY REQUEST
// =========================

router.put(
  "/notify-requests/:id",
  async(req,res)=>{

    try{

      const {id}=req.params;

      await admin
        .firestore()
        .collection("notify_requests")
        .doc(id)
        .set(
          req.body,
          {
            merge:true,
          }
        );

      return res.json({
        success:true,
      });

    }

    catch(err){

      console.error(err);

      return res.status(500).json({
        success:false,
      });

    }

  }
);

module.exports = router;
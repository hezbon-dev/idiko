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
    ...doc.data(),
    id: doc.id,
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

      // Resolve the original Firestore document key.
      const recordKey =
        record.id ||
        record.recordId ||
        (
          record.documentType === "driving_license"
            ? `driving_license_${String(record.idNumber || "").replace(/\s+/g, "")}`
            : record.idNumber
        );

      if (!recordKey) {
        return res.status(400).json({
          success: false,
          error: "Record document key missing",
        });
      }

      const db = admin.firestore();

      const recordRef = db
        .collection("records")
        .doc(recordKey);

      const recordSnap = await recordRef.get();

      if (!recordSnap.exists) {
        return res.status(404).json({
          success: false,
          error: "Record not found",
        });
      }

      // Use the Firestore record as the source of truth.
      const existingRecord = recordSnap.data();

      const trashRef = db
        .collection("trash")
        .doc(recordKey);

      // Preserve the existing National ID notification cleanup.
      // Driving licence and birth certificate matching will be
      // handled separately.
      let notifySnapshot = null;

      if (
        !existingRecord.documentType ||
        existingRecord.documentType === "national_id"
      ) {
        notifySnapshot = await db
          .collection("notify_requests")
          .where(
            "idNumber",
            "==",
            existingRecord.idNumber
          )
          .get();
      }

      // Move the record atomically between collections.
      // Permanent history remains untouched.
      const batch = db.batch();

      batch.set(trashRef, {
        ...existingRecord,
        originalRecordKey: recordKey,
        trashedAt: new Date().toISOString(),
      });

      batch.delete(recordRef);

      if (notifySnapshot) {
        notifySnapshot.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
      }

      await batch.commit();

      return res.json({
        success: true,
        record: {
          ...existingRecord,
          id: recordKey,
          originalRecordKey: recordKey,
        },
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
    ...doc.data(),
    id: doc.id,
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
      const { record } = req.body;

      if (!record) {
        return res.status(400).json({
          success: false,
          error: "Record missing",
        });
      }

      const db = admin.firestore();

      // The trash document key and the original active record key
      // can differ for records trashed by the older implementation.
      const trashKey =
        record.id ||
        record.originalRecordKey ||
        record.recordId ||
        record.idNumber;

      if (!trashKey) {
        return res.status(400).json({
          success: false,
          error: "Trash document key missing",
        });
      }

      const trashRef = db
        .collection("trash")
        .doc(trashKey);

      const trashSnap = await trashRef.get();

      if (!trashSnap.exists) {
        return res.status(404).json({
          success: false,
          error: "Trash record not found",
        });
      }

      const existingRecord = trashSnap.data();

      // Prefer the original key saved during the new trash operation.
      // recordId also supports records uploaded with generated keys.
      const recordKey =
        existingRecord.originalRecordKey ||
        existingRecord.recordId ||
        (
          existingRecord.documentType === "driving_license"
            ? `driving_license_${String(existingRecord.idNumber || "").replace(/\s+/g, "")}`
            : trashKey
        );

      const recordRef = db
        .collection("records")
        .doc(recordKey);

      const activeSnap = await recordRef.get();

      if (activeSnap.exists) {
        return res.status(409).json({
          success: false,
          error:
            "An active record already exists with this document key",
        });
      }

      // Do not carry trash-only metadata back into records.
      const {
        trashedAt,
        originalRecordKey,
        ...restoredRecord
      } = existingRecord;

      const batch = db.batch();

      batch.set(recordRef, restoredRecord);
      batch.delete(trashRef);

      // allHistoryRecords already retains the original record.
      // Do not modify it during restore.
      await batch.commit();

      return res.json({
        success: true,
        record: {
          ...restoredRecord,
          id: recordKey,
        },
      });
    } catch (err) {
      console.error(
        "❌ Restore failed:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Restore failed",
      });
    }
  }
);


// ================================
// PERMANENTLY DELETE TRASH RECORD
// ================================

router.delete(
  "/trash/:idNumber",
  verifyAdminToken,
  async (req, res) => {
    try {
      const db = admin.firestore();

      // Despite the route parameter name, this must be the
      // actual Firestore document key, not necessarily idNumber.
      const trashKey = req.params.idNumber;

      if (!trashKey) {
        return res.status(400).json({
          success: false,
          error: "Trash document key missing",
        });
      }

      const trashRef = db
        .collection("trash")
        .doc(trashKey);

      const trashSnap = await trashRef.get();

      if (!trashSnap.exists) {
        return res.status(404).json({
          success: false,
          error: "Trash record not found",
        });
      }

      await trashRef.delete();

      return res.json({
        success: true,
        message: "Trash record permanently deleted",
      });
    } catch (err) {
      console.error(
        "❌ Permanent trash deletion failed:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Failed to permanently delete trash record",
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
      const db = admin.firestore();

      // Read the existing period parameters.
      const {
        period = "All",
        from,
        to,
      } = req.query;

      const dateRange = getNairobiDateRange(
        period,
        from,
        to
      );

      // Normalize both stored and frontend document-type values.
      // Unknown or missing types are not assigned to a section.
      const normalizeDocumentType = (value) => {
        const mapping = {
          national_id: "national_id",
          id: "national_id",

          driving_license: "driving_license",
          drivingLicence: "driving_license",

          birth_certificate: "birth_certificate",
          birthCertificate: "birth_certificate",
        };

        return mapping[value] || "";
      };

      // Preserve the existing Nairobi date filtering behavior.
      const isWithinDateRange = (value) => {
        if (!dateRange) {
          return true;
        }

        if (!value) {
          return false;
        }

        const date = value.toDate
          ? value.toDate()
          : new Date(value);

        if (Number.isNaN(date.getTime())) {
          return false;
        }

        const dateString = getNairobiDateString(date);

        return (
          dateString >= dateRange.from &&
          dateString <= dateRange.to
        );
      };

      // Load permanent record history.
      const historySnap = await db
        .collection("allHistoryRecords")
        .get();

      const history = historySnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Load notification requests.
      const notifySnap = await db
        .collection("notify_requests")
        .get();

      const notify = notifySnap.docs.map((doc) => doc.data());

      // Keep the existing overall statistics and their behavior.
      const uploadedRecords = history.filter((record) =>
        isWithinDateRange(record.uploadDate)
      );

      const paidRecords = history.filter(
        (record) =>
          record.status === "Paid" &&
          isWithinDateRange(record.paidAt)
      );

      const pending = history.filter(
        (record) => record.status === "Pending"
      ).length;

      const awaiting = notify.filter(
        (request) => !request.matched
      ).length;

      const matched = notify.filter(
        (request) => request.matched
      ).length;

      // Calculate statistics independently for each document type.
      const getDocumentTypeStats = (documentType) => {
        const typeRecords = history.filter(
          (record) =>
            normalizeDocumentType(record.documentType) ===
            documentType
        );

        const typeRequests = notify.filter((request) => {
          const requestType = normalizeDocumentType(
            request.normalizedDocumentType ||
              request.documentType
          );

          return requestType === documentType;
        });

        return {
          uploaded: typeRecords.filter((record) =>
            isWithinDateRange(record.uploadDate)
          ).length,

          pending: typeRecords.filter(
            (record) => record.status === "Pending"
          ).length,

          paid: typeRecords.filter(
            (record) =>
              record.status === "Paid" &&
              isWithinDateRange(record.paidAt)
          ).length,

          unmatched: typeRequests.filter(
            (request) => !request.matched
          ).length,

          matched: typeRequests.filter(
            (request) => request.matched
          ).length,
        };
      };

      const byDocumentType = {
        idCards: getDocumentTypeStats("national_id"),

        drivingLicences: getDocumentTypeStats(
          "driving_license"
        ),

        birthCertificates: getDocumentTypeStats(
          "birth_certificate"
        ),
      };

      return res.json({
        success: true,

        // Existing fields retained for compatibility.
        totalUploaded: uploadedRecords.length,
        pending,
        paid: paidRecords.length,
        awaiting,
        matched,

        // New document-specific statistics.
        byDocumentType,
      });
    } catch (err) {
      console.error("Dashboard stats failed:", err);

      return res.status(500).json({
        success: false,
        error: "Failed to load dashboard stats",
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

      const now =
        Date.now();

      const oneMinutesAgo =
        new Date(
          now - 60000
        );

      const snapshot =
        await admin
          .firestore()
          .collection(
            "staffSessions"
          )
          .where(
            "lastActive",
            ">",
            oneMinutesAgo
          )
          .get();

      const active =
        snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
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
require("dotenv").config();

const requiredEnvVars = [
  "JWT_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
  "FIREBASE_SERVICE_ACCOUNT",
];

for (const envVar of requiredEnvVars) {

  if (!process.env[envVar]) {

    console.error(
      `❌ Missing required environment variable: ${envVar}`
    );

    process.exit(1);
  }
}

console.log("🔥 SERVER.JS FILE LOADED");

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet");

console.log("🔥 Express and CORS loaded");

const { sendSMS } = require("./services/africasTalkingSMS");

// 🔥 ✅ ADD FIREBASE ADMIN (NEW)
const admin = require("firebase-admin");

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.log("🔥 Using Firebase from ENV");

  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
} else {
  console.warn("⚠️ Firebase not configured — skipping init");
}

let db = null;

try {
  db = admin.firestore();
} catch (e) {
  console.warn("⚠️ Firestore not available");
}

// 🔵 MPESA (Daraja) integration
const { stkPush } = require("./mpesa/stkPush");
const { mpesaCallback, getPaymentStatus } = require("./mpesa/mpesaCallback");

console.log("🔥 AfricaTalking service imported");

// ✅ ADD OCR ROUTE IMPORT
const ocrRoutes = require("./routes/ocr");
const adminAuthRoutes = require("./routes/adminAuth");
const staffAuthRoutes = require("./routes/staffAuth");
const adminRecordsRoutes = require("./routes/adminRecords");
const userRoutes = require("./routes/userRoutes");

// ✅ NEW
const findMyIDRoutes = require("./routes/findMyID");

const app = express();

// ✅ REQUIRED FOR RENDER + EXPRESS-RATE-LIMIT
app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: [
      "https://idiko.co.ke",
      "https://idiko-81906.web.app",
      "https://www.idiko.co.ke"
    ],
    credentials: true,
  })
);


// Allow larger payloads (50MB should be more than enough for ID images)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ✅ REGISTER OCR ROUTE
app.use("/api/ocr", ocrRoutes);

// ✅ NEW FIND MY ID API
app.use("/api", findMyIDRoutes);

// 🔐 ADMIN AUTH ROUTES
app.use("/admin", adminAuthRoutes);
app.use("/staff", staffAuthRoutes);
app.use("/user", userRoutes);
app.use("/admin", adminRecordsRoutes);

// Root route
app.get("/", (req, res) => {
  console.log("✅ ROOT ROUTE HIT");
  res.json({ message: "IDiko backend is live" });
});


// ✅ TRACK CURRENTLY PROCESSING IDS
const processingMatches = new Set();

// ✅ NORMALIZE ID NUMBERS
function normalizeId(id) {
  if (!id) return "";
  return String(id).replace(/\s+/g, "").trim();
}

// ✅ SEND SMS SAFELY (NO DUPLICATES)
async function sendSMSNotification(req) {
  try {
    const phones = [
      ...new Set(
        [req.primaryPhone, req.secondaryPhone].filter(Boolean)
      ),
    ];

    if (!phones.length) {
      console.warn("⚠️ No phones found");
      return;
    }

    const firstName = req.fullName
  ? req.fullName.split(" ")[0]
  : "Customer";

const safeName =
  firstName && firstName.trim().length > 0
    ? firstName.trim()
    : "there";

const message = `Good news ${safeName}, your ID is ready for collection.Visit idiko.co.ke under(Search ID)to confirm,then visit Huduma Centre for collection.Thank you.`;

    console.log("📤 Sending SMS to:", phones);

    for (const phone of phones) {
      await sendSMS(phone, message);
    }

    console.log("✅ SMS SENT SUCCESSFULLY:", req.idNumber);

  } catch (err) {
    console.error("❌ sendSMSNotification FAILED:", err);
  }
}

// 🔥 ✅ NEW ROUTE (FIXED)
app.post("/start-notification", async (req, res) => {
  console.log("🚀 START NOTIFICATION TRIGGERED");

  // ✅ FIX: guard BEFORE using db
  if (!db) {
    return res.status(500).json({
      success: false,
      error: "Database not configured",
    });
  }

  const { idNumber, fullName, primaryPhone, secondaryPhone } = req.body;

  console.log("📌 DATA:", { idNumber, fullName, primaryPhone, secondaryPhone });

  try {
    // ✅ FIX: update EXISTING notify request instead of creating new document
    const snapshot = await db
      .collection("notify_requests")
      .where("idNumber", "==", idNumber)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "Notify request not found",
      });
    }

    const docRef = snapshot.docs[0].ref;

    await docRef.update({
      matched: true,
      startedAt: new Date().toISOString(),
      primaryPhone,
      secondaryPhone,
    });

    console.log("✅ Notification schedule started for:", idNumber);

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Failed to start notification:", err);
    res.status(500).json({ success: false });
  }
});

// 🔵 MPESA STK PUSH
app.post("/mpesa/stkpush", stkPush);

// 🔵 MPESA CALLBACK
app.post("/mpesa/callback", mpesaCallback);

// 🔵 MPESA PAYMENT STATUS
app.get("/mpesa/status/:checkoutRequestID", getPaymentStatus);

// 🔥 STATUS SYNC ROUTE
let lastLoggedPaid = "";

function handleStatusSync(req, res) {
  const FILE_PATH = path.join(__dirname, "mpesa", "payments.json");

  let payments = [];

  try {
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, "utf8");
      payments = data && data.trim() !== "" ? JSON.parse(data) : [];
    }
  } catch (err) {
    console.error("❌ Failed to read payments file", err);
    payments = [];
  }

  if (!Array.isArray(payments)) payments = [];

  const paid = payments
    .filter(p => p.status === "paid")
    .map(p => p.accountReference)
    .filter(Boolean);

  const current = JSON.stringify(paid);

  if (paid.length > 0 && current !== lastLoggedPaid) {
    console.log("📡 STATUS SYNC CALLED → Paid IDs:", paid);
    lastLoggedPaid = current;
  }

  res.json({ paid });
}

app.get("/mpesa/status-sync", handleStatusSync);
app.post("/mpesa/status-sync", handleStatusSync);

// 🔥 MATCHING ENGINE + SMS ENGINE
console.log("🧠 Starting Backend Matching & Notification Engine...");

let schedulerRunning = false;
let lastSchedulerLog = 0;
let lastRunningLog = 0;

// =======================================
// NOTIFY REQUEST CLEANUP SETTINGS
// =======================================

const NOTIFY_REQUEST_RETENTION_DAYS = 364;

const NOTIFY_REQUEST_CLEANUP_INTERVAL =
   180 * 24 * 60 * 60 * 1000; // every 6 months

let lastNotifyCleanupRun = 0;


// =======================================
// RECORD CLEANUP SETTINGS
// =======================================

const RECORD_RETENTION_DAYS = 364;

const RECORD_CLEANUP_INTERVAL =
  180 * 24 * 60 * 60 * 1000; // every 6 months

let lastRecordCleanupRun = 0;

// =======================================
// PAID RECORD CLEANUP SETTINGS
// =======================================

const PAID_RECORD_RETENTION_DAYS = 364;

const PAID_RECORD_CLEANUP_INTERVAL =
  180 * 24 * 60 * 60 * 1000; // every 6 months

let lastPaidRecordCleanupRun = 0;

// =======================================
// TRASH RECORD CLEANUP SETTINGS
// =======================================

const TRASH_RECORD_RETENTION_DAYS = 364;

const TRASH_RECORD_CLEANUP_INTERVAL =
  180 * 24 * 60 * 60 * 1000; // every 6 months

let lastTrashRecordCleanupRun = 0;

// =======================================
// PHASE 4 — NEXT NOTIFICATION SCHEDULING
// =======================================

const getNextNotificationAt = (
  date = new Date()
) => {

  return new Date(
    date.getTime() + 24 * 60 * 60 * 1000
  ).toISOString();

};

setInterval(async () => {

  if (schedulerRunning) {
    if (Date.now() - lastRunningLog > 60 * 60 * 1000) {
      console.log("⏭ Scheduler already running...");
      lastRunningLog = Date.now();
    }
    return;
  }

  schedulerRunning = true;

  // =======================================
  // FIRESTORE AVAILABILITY CHECK
  // =======================================

  if (!db) {
    console.warn("⚠️ Scheduler skipped — DB not available");
    schedulerRunning = false;
    return;
  }

  const kenyaHour = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Africa/Nairobi",
    })
  ).getHours();

  const now = Date.now();

// =======================================
// CLEAN OLD UNPAID RECORDS
// Runs once every 6 months
// =======================================

if (
  Date.now() - lastRecordCleanupRun >=
  RECORD_CLEANUP_INTERVAL
) {

  lastRecordCleanupRun = Date.now();

  try {

    console.log(
      "🧹 Running pending record cleanup..."
    );

      const expirationCutoff =
      new Date(
        Date.now() -
        RECORD_RETENTION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

    const cleanupSnapshot =
      await db
        .collection("records")
        .where("uploadDate", "<=", expirationCutoff)
        .get();

    const now = Date.now();

    for (const docSnap of cleanupSnapshot.docs) {

      const record = docSnap.data();

      // Keep paid records forever
      if (
        record.status === "Paid" ||
        record.status === "paid"
      ) {
        continue;
      }

      // Ignore records without upload date
      if (!record.uploadDate) {
        continue;
      }

      const uploadedAt =
        new Date(record.uploadDate).getTime();

      const daysSinceUploaded =
        Math.floor(
          (now - uploadedAt) /
          (1000 * 60 * 60 * 24)
        );

      if (
        daysSinceUploaded >=
        RECORD_RETENTION_DAYS
      ) {

        await Promise.all([

          db
            .collection("records")
            .doc(docSnap.id)
            .delete(),

          db
            .collection("allHistoryRecords")
            .doc(docSnap.id)
            .delete(),

        ]);

        console.log(
          `🧹 Deleted expired pending record: ${record.idNumber}`
        );

      }

    }

  } catch (err) {

    console.error(
      "❌ Pending record cleanup failed:",
      err
    );

  }

}

// =======================================
// CLEAN OLD TRASH RECORDS
// Runs once every 6 months
// Deletes permanently from trash
// =======================================

if (
  Date.now() - lastTrashRecordCleanupRun >=
  TRASH_RECORD_CLEANUP_INTERVAL
) {

  lastTrashRecordCleanupRun = Date.now();

  try {

    console.log(
      "🧹 Running trash record cleanup..."
    );

      const expirationCutoff =
      new Date(
        Date.now() -
        TRASH_RECORD_RETENTION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

    const cleanupSnapshot =
      await db
        .collection("trash")
        .where("trashedAt", "<=", expirationCutoff)
        .get();

    const now = Date.now();

    for (const docSnap of cleanupSnapshot.docs) {

      const record = docSnap.data();

      // DO NOT DELETE legacy Trash records
      // that do not have a trashedAt date
      if (!record.trashedAt) {
        continue;
      }

      const trashedAt =
        new Date(record.trashedAt).getTime();

      // Ignore invalid trashedAt values
      if (Number.isNaN(trashedAt)) {
        continue;
      }

      const daysSinceTrashed =
        Math.floor(
          (now - trashedAt) /
          (1000 * 60 * 60 * 24)
        );

      if (
        daysSinceTrashed >=
        TRASH_RECORD_RETENTION_DAYS
      ) {

        await db
          .collection("trash")
          .doc(docSnap.id)
          .delete();

        console.log(
          `🧹 Permanently deleted expired Trash record: ${record.idNumber}`
        );

      }

    }

  } catch (err) {

    console.error(
      "❌ Trash record cleanup failed:",
      err
    );

  }

}

// Run only between 6AM and 8PM Kenya time
if (kenyaHour < 6 || kenyaHour >= 20) {

  // Log sleeping status only once every 2 hours
  if (now - lastSchedulerLog > 2 * 60 * 60 * 1000) {
    console.log("🌙 Outside working hours — scheduler sleeping");
    lastSchedulerLog = now;
  }

  schedulerRunning = false;
  return;
}

// Log active status only once every 30 minutes
if (now - lastSchedulerLog > 30 * 60 * 1000) {
  console.log("🟢 Scheduler active");
  lastSchedulerLog = now;
}

// =======================================
// CLEAN OLD PAID RECORDS
// Runs once every 6 months
// Deletes from records + notify_requests ONLY
// =======================================

if (
  Date.now() - lastPaidRecordCleanupRun >=
  PAID_RECORD_CLEANUP_INTERVAL
) {

  lastPaidRecordCleanupRun = Date.now();

  try {

    console.log(
      "🧹 Running paid record cleanup..."
    );

      const expirationCutoff =
      new Date(
        Date.now() -
        PAID_RECORD_RETENTION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

    const cleanupSnapshot =
      await db
        .collection("records")
        .where("paidAt", "<=", expirationCutoff)
        .get();

    const now = Date.now();

    for (const docSnap of cleanupSnapshot.docs) {

      const record = docSnap.data();

      // Only process PAID records
      if (
        record.status !== "Paid" &&
        record.status !== "paid"
      ) {
        continue;
      }

      // Do not delete anything without a valid paidAt date
      if (!record.paidAt) {
        continue;
      }

      const paidAt =
        new Date(record.paidAt).getTime();

      // Ignore invalid paidAt values
      if (Number.isNaN(paidAt)) {
        continue;
      }

      const daysSincePaid =
        Math.floor(
          (now - paidAt) /
          (1000 * 60 * 60 * 24)
        );

      if (
        daysSincePaid >=
        PAID_RECORD_RETENTION_DAYS
      ) {

        // =======================================
        // DELETE FROM records
        // =======================================

        await db
          .collection("records")
          .doc(docSnap.id)
          .delete();

        console.log(
          `🧹 Deleted expired PAID record: ${record.idNumber}`
        );


        // =======================================
        // DELETE CORRESPONDING NOTIFY REQUEST(S)
        // =======================================

        if (record.idNumber) {

          const notifySnapshot =
            await db
              .collection("notify_requests")
              .where(
                "idNumber",
                "==",
                record.idNumber
              )
              .get();

          for (
            const notifyDoc
            of notifySnapshot.docs
          ) {

            await notifyDoc.ref.delete();

            console.log(
              `🧹 Deleted corresponding notify request: ${record.idNumber}`
            );

          }

        }
      }

    }

  } catch (err) {

    console.error(
      "❌ Paid record cleanup failed:",
      err
    );

  }

}

// =======================================
// CLEAN OLD UNMATCHED NOTIFY REQUESTS
// Runs once every 24 hours
// =======================================

if (
  Date.now() - lastNotifyCleanupRun >=
  NOTIFY_REQUEST_CLEANUP_INTERVAL
) {

  lastNotifyCleanupRun = Date.now();

  try {

    console.log(
      "🧹 Running notify request cleanup..."
    );

      const expirationCutoff =
      new Date(
        Date.now() -
        NOTIFY_REQUEST_RETENTION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

    const cleanupSnapshot =
      await db
        .collection("notify_requests")
        .where("createdAt", "<=", expirationCutoff)
        .get();

    const now = Date.now();

    for (const docSnap of cleanupSnapshot.docs) {

      const req = docSnap.data();

      if (req.matched === true) {
        continue;
      }

      if (req.expired === true) {
        continue;
      }

      if (!req.createdAt) {
        continue;
      }

      const createdAt =
        new Date(req.createdAt).getTime();

      const daysSinceCreated =
        Math.floor(
          (now - createdAt) /
          (1000 * 60 * 60 * 24)
        );

 if (
  daysSinceCreated >=
  NOTIFY_REQUEST_RETENTION_DAYS
){

        await docSnap.ref.delete();

        console.log(
          `🧹 Deleted expired notify request: ${req.idNumber}`
        );

      }

    }

  } catch (err) {

    console.error(
      "❌ Notify request cleanup failed:",
      err
    );

  }

}


  try {
   const notifySnapshot = await db
  .collection("notify_requests")
  .get();

    const notifyRequests = notifySnapshot.docs;

    const now = Date.now();

    for (const docSnap of notifyRequests) {
      const req = docSnap.data();
      const docRef = db.collection("notify_requests").doc(docSnap.id);

      // Skip already completed notification requests
        if (req.expired === true) {
        continue;
}

      // ✅ prevent concurrent duplicate processing
      if (processingMatches.has(docSnap.id)) {
        continue;
      }

      processingMatches.add(docSnap.id);

      try {

        // =========================
        // ✅ MATCHING ENGINE
        // =========================

         if (!req.matched || !req.lastSentAt) {

          const normalizedRequestId = normalizeId(req.idNumber);

          const recordsSnapshot = await db
            .collection("records")
            .where("idNumber", "==", normalizedRequestId)
            .limit(1)
            .get();

          const found = recordsSnapshot.empty
            ? null
            : recordsSnapshot.docs[0].data();

if (found) {
  console.log(`✅ MATCH FOUND → ${req.idNumber}`);

  const matchedDate = new Date().toISOString();

  // =======================================
  // MARK REQUEST AS MATCHED
  // =======================================

  await docRef.update({
    matched: true,
    matchedID: found.idNumber,
    matchedDate,
    startedAt: matchedDate,
  });

  // =======================================
  // SEND FIRST SMS IMMEDIATELY
  // =======================================

  await sendSMSNotification({
    ...req,
    matched: true,
  });

  // =======================================
  // INITIALIZE NOTIFICATION SCHEDULE
  // =======================================

  const firstSmsSentAt = new Date().toISOString();

  await docRef.update({
    lastSentAt: firstSmsSentAt,

    nextNotificationAt: getNextNotificationAt(
      new Date(firstSmsSentAt)
    ),

    sentCount: admin.firestore.FieldValue.increment(1),
  });

  console.log(
    "✅ FIRST SMS SENT + NEXT NOTIFICATION SCHEDULED:",
    req.idNumber
  );
}

          continue;
        }

        // =========================
        // ✅ STOP IF PAID
        // =========================

           if (
           req.status === "Paid" ||
           req.status === "paid"
          ) {

        if (!req.expired) {
        console.log("🛑 Notifications stopped (PAID):", req.idNumber);

         await docRef.update({
      expired: true,
      paidAt: new Date().toISOString(),
      });
      }

       continue;
      }

        // =========================
        // ✅ REQUIRE startedAt
        // =========================

        if (!req.startedAt) {
          await docRef.update({
            startedAt: new Date().toISOString()
          });

          continue;
      }

        // =========================
        // ✅ STOP AFTER 14 DAYS
        // =========================

        const startedAt = new Date(req.startedAt).getTime();

        const daysPassed = Math.floor(
          (now - startedAt) / (1000 * 60 * 60 * 24)
      );

        if (daysPassed >= 14) {

        if (!req.expired) {
        console.log(
        "🛑 Notifications stopped (14 DAY LIMIT REACHED):",
        req.idNumber
      );

       await docRef.update({
       expired: true,
       expiredAt: new Date().toISOString(),
      });
      }

  continue;
     }

        // ==================================
        // ✅ PREVENT DUPLICATE SAME-DAY SMS
        // ==================================

        if (req.lastSentAt) {
          const last = new Date(req.lastSentAt).toDateString();
          const today = new Date().toDateString();

          if (last === today) {
         continue;
     }
        }

// =========================
// ✅ SEND DAILY SMS
// =========================

await sendSMSNotification(req);

const dailySentAt =
  new Date().toISOString();

await docRef.update({
  lastSentAt: dailySentAt,
  nextNotificationAt: getNextNotificationAt(
    new Date(dailySentAt)
  ),
  sentCount: admin.firestore.FieldValue.increment(1),
});

console.log("✅ DAILY SMS SENT:", req.idNumber);

      } finally {
        processingMatches.delete(docSnap.id);
      }
    }

  } catch (err) {
    console.error("❌ Scheduler error:", err);
  }

finally {
  schedulerRunning = false;
}  
}, 1000);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
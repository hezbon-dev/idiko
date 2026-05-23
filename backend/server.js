require("dotenv").config();

console.log("🔥 SERVER.JS FILE LOADED");

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

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

// 🔁 Pesapal integration
const { pesapalInitiatePayment } = require("./pesapal/pesapalPayment");
const { pesapalIPNCallback } = require("./pesapal/pesapalCallback");

// 🔵 MPESA (Daraja) integration
const { stkPush } = require("./mpesa/stkPush");
const { mpesaCallback, getPaymentStatus } = require("./mpesa/mpesaCallback");

console.log("🔥 AfricaTalking service imported");

// ✅ ADD OCR ROUTE IMPORT
const ocrRoutes = require("./routes/ocr");
const adminAuthRoutes = require("./routes/adminAuth");
const app = express();

app.use(cors());


// Allow larger payloads (50MB should be more than enough for ID images)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ✅ REGISTER OCR ROUTE
app.use("/api/ocr", ocrRoutes);

// 🔐 ADMIN AUTH ROUTES
app.use("/admin", adminAuthRoutes);

// Root route
app.get("/", (req, res) => {
  console.log("✅ ROOT ROUTE HIT");
  res.json({ message: "IDiko backend is live" });
});

// ✅ GLOBAL LOCK (prevents duplicate SMS triggers)


// ✅ COOLDOWN TIMER (NEW)


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

    const message = `Good news ${firstName}, your ID is available and ready for pickup.Please proceed to idiko.co.ke website under "Find My ID" to search and claim your ID,.Thank you.`;

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

// 🔍 DEBUG PESAPAL CONFIG (SAFE PREVIEW)
app.get("/debug/pesapal", (req, res) => {
  res.json({
    CONSUMER_KEY: process.env.PESAPAL_CONSUMER_KEY?.slice(0, 6) + "...",
    CONSUMER_SECRET: process.env.PESAPAL_CONSUMER_SECRET?.slice(0, 6) + "...",
    IPN_ID: process.env.PESAPAL_IPN_ID,
    CALLBACK_URL: process.env.PESAPAL_CALLBACK_URL,
    ENV: process.env.NODE_ENV,
  });
});

// ✅ PESAPAL PAYMENT INITIATION
app.post("/pesapal/pay", pesapalInitiatePayment);

// ✅ PESAPAL IPN CALLBACK
app.post("/pesapal/ipn", pesapalIPNCallback);

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

setInterval(async () => {

  if (schedulerRunning) {
    console.log("⏭ Scheduler already running...");
    return;
  }

  schedulerRunning = true;

const kenyaHour = new Date(
  new Date().toLocaleString("en-US", {
    timeZone: "Africa/Nairobi",
  })
).getHours();

const now = Date.now();

// Run only between 9AM and 4PM Kenya time
if (kenyaHour < 9 || kenyaHour >= 16) {

  // Log sleeping status only once every 2 hours
  if (now - lastSchedulerLog > 2 * 60 * 60 * 1000) {
    console.log("🌙 Outside working hours — scheduler sleeping");
    lastSchedulerLog = now;
  }

  schedulerRunning = false;
  return;
}

// Log active status only once every 15 minutes
if (now - lastSchedulerLog > 15 * 60 * 1000) {
  console.log("🟢 Scheduler active");
  lastSchedulerLog = now;
}

  // ✅ HARD STOP if db is not available
  if (!db) {
    console.warn("⚠️ Scheduler skipped — DB not available");
    return;
  }

  try {
    const notifySnapshot = await db
  .collection("notify_requests")
  .where("matched", "!=", true)
  .get();

    const recordsSnapshot = await db.collection("records").get();

    const notifyRequests = notifySnapshot.docs;
    const records = recordsSnapshot.docs.map(doc => doc.data());

    const now = Date.now();

    for (const docSnap of notifyRequests) {
      const req = docSnap.data();
      const docRef = db.collection("notify_requests").doc(docSnap.id);

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

          const found = records.find(r =>
            normalizeId(r.idNumber) === normalizeId(req.idNumber)
          );

          if (found) {
            console.log(`✅ MATCH FOUND → ${req.idNumber}`);

            const matchedDate = new Date().toISOString();

            await docRef.update({
              matched: true,
              matchedID: found.idNumber,
              matchedDate,
              startedAt: matchedDate,
            });

            // ✅ send FIRST SMS immediately ONLY ONCE
            await sendSMSNotification({
              ...req,
              matched: true,
            });

            await docRef.update({
              lastSentAt: matchedDate,
              sentCount: admin.firestore.FieldValue.increment(1),
            });

            console.log("✅ FIRST SMS SENT:", req.idNumber);
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
          console.log("🛑 Notifications stopped (PAID):", req.idNumber);
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
        // ✅ STOP AFTER 30 DAYS
        // =========================

        const startedAt = new Date(req.startedAt).getTime();

        const daysPassed = Math.floor(
          (now - startedAt) / (1000 * 60 * 60 * 24)
        );

        if (daysPassed >= 30) {
          console.log("🛑 30 DAY LIMIT REACHED:", req.idNumber);

          await docRef.update({
            expired: true
          });

          continue;
        }

        // =========================
        // ✅ PREVENT DUPLICATE SAME-DAY SMS
        // =========================

        if (req.lastSentAt) {
          const last = new Date(req.lastSentAt).toDateString();
          const today = new Date().toDateString();

          if (last === today) {
            console.log("⏭ Already sent today:", req.idNumber);
            continue;
          }
        }

        // =========================
        // ✅ SEND DAILY SMS
        // =========================

        await sendSMSNotification(req);

        await docRef.update({
          lastSentAt: new Date().toISOString(),
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
}, 5000);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
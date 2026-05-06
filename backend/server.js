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

const app = express();

app.use(cors());

// Allow larger payloads (50MB should be more than enough for ID images)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ✅ REGISTER OCR ROUTE
app.use("/api/ocr", ocrRoutes);

// Root route
app.get("/", (req, res) => {
  console.log("✅ ROOT ROUTE HIT");
  res.json({ message: "IDiko backend is live" });
});

// ✅ GLOBAL LOCK (prevents duplicate SMS triggers)
let isSendingSMS = false;

// ✅ COOLDOWN TIMER (NEW)
let lastSMSTime = 0;

// ✅ REAL SMS ROUTE (used by frontend after match === true)
app.post("/notifySMS", async (req, res) => {
  console.log("🚨 /notifySMS ROUTE HIT");

  const now = Date.now();

  if (now - lastSMSTime < 5000) {
    console.warn("⚠️ Duplicate request blocked (cooldown)");
    return res.status(429).json({
      success: false,
      message: "Please wait before sending again",
    });
  }

  lastSMSTime = now;

  if (isSendingSMS) {
    console.warn("⚠️ Duplicate request blocked");
    return res.status(429).json({
      success: false,
      message: "Already sending SMS",
    });
  }

  isSendingSMS = true;

  const requestId = Date.now();
  console.log("🆔 Request ID:", requestId);

  const { primaryPhone, secondaryPhone, message } = req.body;

  const phones = [...new Set([primaryPhone, secondaryPhone].filter(Boolean))];

  if (!phones.length || !message) {
    console.error("❌ Missing phone or message");
    isSendingSMS = false;
    return res.status(400).json({
      success: false,
      error: "phones and message are required",
    });
  }

  try {
    console.log("📤 Attempting to send SMS...");
    console.log("📞 Phones:", phones);
    console.log("📨 Message:", message);

    for (const phone of phones) {
      await sendSMS(phone, message);
    }

    console.log("✅ SMS FUNCTION RETURNED");
    res.json({ success: true });
  } catch (error) {
    console.error("❌ SMS FAILED IN /notifySMS ROUTE");
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message || "SMS sending failed",
    });
  } finally {
    isSendingSMS = false;
  }
});

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
    const docRef = db.collection("notify_requests").doc(idNumber);

    await docRef.set(
      {
        matched: true,
        startedAt: new Date().toISOString(),
        primaryPhone,
        secondaryPhone,
      },
      { merge: true }
    );

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

// 🔥 BACKEND SCHEDULER (UNCHANGED)
console.log("🧠 Starting Notification Scheduler...");

setInterval(async () => {
  console.log("⏱ Scheduler running...");

  // ✅ HARD STOP if db is not available
  if (!db) {
    console.warn("⚠️ Scheduler skipped — DB not available");
    return;
  }

  try {
    const snapshot = await db.collection("notify_requests").get();
    const now = Date.now();

    for (const docSnap of snapshot.docs) {
      const req = docSnap.data();
      const docRef = db.collection("notify_requests").doc(docSnap.id);

      if (!req.matched) continue;
      if (req.status === "Paid") continue;

      if (!req.startedAt) {
        await docRef.update({
          startedAt: new Date().toISOString()
        });
        continue;
      }

      const startedAt = new Date(req.startedAt).getTime();
      const daysPassed = Math.floor((now - startedAt) / (1000 * 60 * 60 * 24));

      if (daysPassed >= 30) continue;

      if (req.lastSentAt) {
        const last = new Date(req.lastSentAt).toDateString();
        const today = new Date().toDateString();
        if (last === today) continue;
      }

      const phones = [...new Set([req.primaryPhone, req.secondaryPhone].filter(Boolean))];

      const message = `Good news ${req.fullName.split(" ")[0]}, your ID is available. Visit idiko.co.ke to claim it.`;

      for (const phone of phones) {
        await sendSMS(phone, message);
      }

      await docRef.update({
        lastSentAt: new Date().toISOString()
      });

      console.log("✅ SMS SENT:", req.idNumber);
    }

  } catch (err) {
    console.error("❌ Scheduler error:", err);
  }

}, 60000);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
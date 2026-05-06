// backend/routes/notifySMS.js
const express = require("express");
const router = express.Router();
const { sendSMS } = require("../services/africasTalkingSMS");

/**
 * POST /notifySMS
 * Body: { primaryPhone, secondaryPhone, message }
 */
router.post("/", async (req, res) => {
  const { primaryPhone, secondaryPhone, message } = req.body;

  if (!message || (!primaryPhone && !secondaryPhone)) {
    return res.status(400).json({ error: "Missing message or phone numbers" });
  }

  try {
    const recipients = [primaryPhone, secondaryPhone].filter(Boolean);

    console.log("🚀 /notifySMS HIT");
    console.log("📨 Message:", message);
    console.log("📞 Recipients:", recipients);

    // Send SMS to each number
    for (const phone of recipients) {
      await sendSMS(phone, message);
    }

    console.log("✅ /notifySMS COMPLETED SUCCESSFULLY");
    return res.json({ success: true, recipients });
  } catch (error) {
    console.error("❌ /notifySMS FAILED", error);
    return res.status(500).json({ error: "Failed to send SMS", details: error.message });
  }
});

module.exports = router;

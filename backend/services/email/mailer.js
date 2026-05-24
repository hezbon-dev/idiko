const nodemailer = require("nodemailer");

// =========================
// ✅ GMAIL TRANSPORTER
// =========================

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// =========================
// ✅ VERIFY CONNECTION
// =========================

transporter.verify((error, success) => {

  if (error) {

    console.log("❌ Email transporter error:", error);

  } else {

    console.log("✅ Email server ready");
  }
});

module.exports = transporter;
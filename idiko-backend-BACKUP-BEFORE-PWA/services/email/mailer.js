const nodemailer = require("nodemailer");
const dns = require("dns");

// =========================
// ✅ FORCE IPV4
// =========================

dns.setDefaultResultOrder("ipv4first");

// =========================
// ✅ GMAIL TRANSPORTER
// =========================

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,

  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },

  tls: {
    rejectUnauthorized: false,
  },

  family: 4,
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
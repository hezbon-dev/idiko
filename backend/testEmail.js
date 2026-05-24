require("dotenv").config();

const sendOTPEmail = require("./services/email/sendOTPEmail");

// =========================
// ✅ TEST EMAIL
// =========================

const runTest = async () => {

  try {

    console.log("📨 Sending test email...");

    await sendOTPEmail(
      process.env.EMAIL_USER,
      "123456"
    );

    console.log("✅ Test email sent successfully");

  } catch (err) {

    console.log("❌ Test email failed:");

    console.log(err);
  }
};

runTest();
// =========================
// ✅ TEMP OTP MEMORY STORE
// =========================

const otpStore = {};

const MAX_OTP_ATTEMPTS = 5;

// =========================
// ✅ SAVE OTP
// =========================

const saveOTP = (username, otp, email) => {

const expiresAt =
  Date.now() + 60 * 1000; 

  otpStore[username] = {
  otp,
  email,
  expiresAt,
  attempts: 0,
};

  console.log("✅ OTP stored for:", username);
};

// =========================
// ✅ GET OTP DATA
// =========================

const getOTP = (username) => {
  return otpStore[username];
};

// =========================
// ✅ INCREMENT OTP ATTEMPTS
// =========================

const incrementOTPAttempts = (username) => {

  if (!otpStore[username]) {
    return null;
  }

  otpStore[username].attempts += 1;

  console.log(
    "⚠️ OTP attempts:",
    otpStore[username].attempts
  );

  return otpStore[username].attempts;
};

// =========================
// ✅ DELETE OTP
// =========================

const deleteOTP = (username) => {
  delete otpStore[username];

  console.log("🗑 OTP deleted for:", username);
};

// =========================
// ✅ EXPORTS
// =========================

module.exports = {
  saveOTP,
  getOTP,
  deleteOTP,
  incrementOTPAttempts,
  MAX_OTP_ATTEMPTS,
};
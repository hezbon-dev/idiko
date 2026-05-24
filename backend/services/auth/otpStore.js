// =========================
// ✅ TEMP OTP MEMORY STORE
// =========================

const otpStore = {};

// =========================
// ✅ SAVE OTP
// =========================

const saveOTP = (username, otp, email) => {

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
};
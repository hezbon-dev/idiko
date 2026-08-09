const rateLimit = require("express-rate-limit");

// =========================
// ✅ ADMIN LOGIN LIMITER
// =========================

const adminLoginLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 10,

  message: {
    success: false,
    error:
      "Too many login attempts from this IP. Try again later.",
  },

  standardHeaders: true,

  legacyHeaders: false,
});

// =========================
// ✅ OTP VERIFY LIMITER
// =========================

const otpVerifyLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 15,

  message: {
    success: false,
    error:
      "Too many OTP verification attempts. Try again later.",
  },

  standardHeaders: true,

  legacyHeaders: false,
});

// =========================
// ✅ EXPORTS
// =========================

module.exports = {
  adminLoginLimiter,
  otpVerifyLimiter,
};
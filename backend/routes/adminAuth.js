const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verifyAdminToken = require("../middleware/verifyAdminToken");
const sendOTPEmail = require("../services/email/sendOTPEmail");

const {
  saveOTP,
  getOTP,
  deleteOTP,
} = require("../services/auth/otpStore");


// 🔥 LOGIN ROUTE
router.post("/login", async (req, res) => {

  console.log("🔐 ADMIN LOGIN ATTEMPT");

  try {

    const { username, password } = req.body;

    console.log("📌 Username Received:", username);

    // =========================
    // ✅ BASIC VALIDATION
    // =========================

    if (!username || !password) {

      console.log("❌ Missing username or password");

      return res.status(400).json({
        success: false,
        error: "Username and password required",
      });
    }

    // =========================
    // ✅ FIRESTORE LOOKUP
    // =========================

    const db = admin.firestore();

    const snapshot = await db
      .collection("users")
      .where("username", "==", username.trim().toLowerCase())
      .limit(1)
      .get();

    console.log("📊 Matching Users Found:", snapshot.size);

    if (snapshot.empty) {

      console.log("❌ User not found");

      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    const userDoc = snapshot.docs[0];

    const userData = userDoc.data();

    console.log("✅ User Found:", userData.username);

    // =========================
// ✅ PASSWORD VALIDATION
// =========================

if (!userData.passwordHash) {

  console.log("❌ No password hash found");

  return res.status(500).json({
    success: false,
    error: "Admin password not configured",
  });
}

const passwordValid = await bcrypt.compare(
  password,
  userData.passwordHash
);

if (!passwordValid) {

  console.log("❌ Invalid password");

  return res.status(401).json({
    success: false,
    error: "Invalid username or password",
  });
}

console.log("✅ Password validated");

// =========================
// ✅ GENERATE OTP
// =========================

const otp = Math.floor(
  100000 + Math.random() * 900000
).toString();

console.log("🔐 Generated OTP:", otp);

// =========================
// ✅ STORE OTP
// =========================

saveOTP(
  userData.username,
  otp,
  userData.email
);

// =========================
// ✅ SEND OTP EMAIL
// =========================

await sendOTPEmail(
  userData.email,
  otp
);

console.log("📨 OTP email dispatched");

    // =========================
    // ✅ ROLE VALIDATION
    // =========================

    if (userData.role !== "admin") {

      console.log("❌ User is not admin");

      return res.status(403).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // =========================
    // ✅ EMAIL CHECK
    // =========================

    if (!userData.email) {

      console.log("❌ No email attached to admin");

      return res.status(500).json({
        success: false,
        error: "Admin email missing",
      });
    }

    // =========================
    // ✅ SUCCESS RESPONSE
    // =========================
   
   // =========================
// ✅ OTP REQUIRED
// =========================

console.log("🔐 OTP verification required");

return res.json({
  success: true,
  otpRequired: true,
  username: userData.username,
  message: "OTP sent successfully",
});

  } catch (err) {

    console.error("❌ ADMIN LOGIN ERROR:", err);

    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// 🔒 PROTECTED ADMIN TEST ROUTE
router.get(
  "/verify",
  verifyAdminToken,
  async (req, res) => {

    console.log("✅ VERIFIED ADMIN ACCESS");

    return res.json({
      success: true,
      admin: req.admin,
    });
  }
);

// =========================
// 🔐 VERIFY OTP ROUTE
// =========================

router.post("/verify-otp", async (req, res) => {

  try {

    const { username, otp } = req.body;

    console.log("🔐 OTP VERIFICATION ATTEMPT");

    console.log("📌 Username:", username);

    console.log("📌 OTP Received:", otp);

    // =========================
// ✅ BASIC VALIDATION
// =========================

if (!username || !otp) {

  console.log("❌ Missing username or OTP");

  return res.status(400).json({
    success: false,
    error: "Username and OTP required",
  });
}

// =========================
// ✅ LOAD STORED OTP
// =========================

const storedOTP = getOTP(username);

console.log("📦 Stored OTP Record:", storedOTP);

// =========================
// ❌ OTP NOT FOUND
// =========================

if (!storedOTP) {

  console.log("❌ No OTP found");

  return res.status(401).json({
    success: false,
    error: "OTP expired or invalid",
  });
}

// =========================
// ❌ OTP EXPIRED
// =========================

if (Date.now() > storedOTP.expiresAt) {

  console.log("❌ OTP expired");

  deleteOTP(username);

  return res.status(401).json({
    success: false,
    error: "OTP expired",
  });
}

// =========================
// ❌ INVALID OTP
// =========================

if (storedOTP.otp !== otp) {

  console.log("❌ Invalid OTP");

  return res.status(401).json({
    success: false,
    error: "Invalid OTP",
  });
}

console.log("✅ OTP verified");

// =========================
// ✅ DELETE USED OTP
// =========================

deleteOTP(username);

console.log("🗑 OTP deleted after verification");

// =========================
// ✅ LOAD USER AGAIN
// =========================

const db = admin.firestore();

const snapshot = await db
  .collection("users")
  .where("username", "==", username.trim().toLowerCase())
  .limit(1)
  .get();

if (snapshot.empty) {

  return res.status(401).json({
    success: false,
    error: "User not found",
  });
}

const userDoc = snapshot.docs[0];

const userData = userDoc.data();

// =========================
// ✅ CREATE JWT TOKEN
// =========================

const token = jwt.sign(
  {
    uid: userDoc.id,
    username: userData.username,
    role: userData.role,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "12h",
  }
);

console.log("✅ OTP LOGIN COMPLETED");

// =========================
// ✅ SUCCESS RESPONSE
// =========================

return res.json({
  success: true,
  token,
  role: userData.role,
  email: userData.email,
  message: "OTP verified successfully",
});

    return res.json({
      success: true,
      message: "OTP route initialized",
    });

  } catch (err) {

    console.error("❌ OTP VERIFY ERROR:", err);

    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

module.exports = router;
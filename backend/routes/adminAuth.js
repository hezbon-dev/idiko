const express = require("express");

const router = express.Router();

const admin = require("firebase-admin");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

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
   
   console.log("✅ ADMIN LOGIN PASSED");

// ✅ CREATE JWT TOKEN
const token = jwt.sign(
  {
    username: userData.username,
    role: userData.role,
    email: userData.email,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "24h",
  }
);

return res.json({
  success: true,
  token,
  role: userData.role,
  email: userData.email,
  message: "Login successful",
});

  } catch (err) {

    console.error("❌ ADMIN LOGIN ERROR:", err);

    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

module.exports = router;
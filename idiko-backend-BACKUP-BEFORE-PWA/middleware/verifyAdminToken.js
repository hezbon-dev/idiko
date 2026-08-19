const jwt = require("jsonwebtoken");

const verifyAdminToken = (req, res, next) => {

  try {

// =========================
// ✅ GET AUTH HEADER
// =========================

    const authHeader = req.headers.authorization;

    if (!authHeader) {

      console.log("❌ No authorization header");

      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

// =========================
// ✅ EXTRACT TOKEN
// =========================

    const token = authHeader.split(" ")[1];

    if (!token) {

      console.log("❌ No token found");

      return res.status(401).json({
        success: false,
        error: "Invalid token format",
      });
    }

// =========================
// ✅ VERIFY TOKEN
// =========================

   const decoded = jwt.verify(
  token,
  process.env.JWT_SECRET
);

// =========================
// ✅ ADMIN ROLE CHECK
// =========================

if (decoded.role !== "admin") {

  console.log("❌ Non-admin token blocked");

  return res.status(403).json({
    success: false,
    error: "Admin access required",
  });
}

if (
  process.env.NODE_ENV !==
  "production"
) {

  console.log(
    "✅ Admin token verified:",
    decoded.username
  );

}
// attach admin to request

req.admin = decoded;

next();

  } catch (err) {

    console.log("❌ TOKEN VERIFICATION FAILED");

    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

module.exports = verifyAdminToken;
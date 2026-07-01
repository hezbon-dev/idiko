//middleware/verifyStaffToken.js

const jwt = require("jsonwebtoken");

const verifyStaffToken = (
  req,
  res,
  next
) => {

  try {

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {

      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    const token =
      authHeader.split(" ")[1];

    if (!token) {

      return res.status(401).json({
        success: false,
        error: "Invalid token format",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (
      decoded.role !== "staff"
    ) {

      return res.status(403).json({
        success: false,
        error: "Invalid staff token",
      });
    }

    req.staff = decoded;

    next();

} catch (err) {

  console.error(
    "❌ verifyStaffToken:",
    err.message
  );

  return res.status(401).json({
    success: false,
    error: err.message,
  });

}
};

module.exports =
  verifyStaffToken;
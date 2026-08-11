// routes/userRoutes.js

const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

router.post(
  "/notify-request",
  async (req, res) => {

    try {

      const {
        id,
        createdAt,
        matched,
        status,
        fullName,
        idNumber,
        dob,
        sex,
        district,
        primaryPhone,
        secondaryPhone,
        email,
      } = req.body;

      if (
        !fullName ||
        !dob ||
        !sex ||
        !district ||
        !primaryPhone
      ) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
        });
      }

      const db = admin.firestore();

      if (idNumber) {
  const existing =
    await db
      .collection("notify_requests")
      .where("idNumber", "==", idNumber)
      .limit(1)
      .get();

  if (!existing.empty) {
    return res.status(409).json({
      success: false,
      error:
        "You already requested notification for this ID.",
    });
  }
}

      await db
        .collection("notify_requests")
        .doc(id)
        .set({
          id,
          createdAt,
          matched,
          status,

          fullName,
          idNumber,
          dob,
          sex,
          district,

          primaryPhone,
          secondaryPhone,
          email,
        });

      return res.json({
        success: true,
      });

    } catch (err) {

      console.error(
        "Notify request error:",
        err
      );

      return res.status(500).json({
        success: false,
        error: "Server error",
      });

    }

  }
);

module.exports = router;
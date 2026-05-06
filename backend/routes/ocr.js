 const express = require("express");
const router = express.Router();

const { extractIDData } = require("../services/ocr");

// POST /api/ocr
router.post("/", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: "No image provided",
      });
    }

    console.log("📸 OCR request received");

    const data = await extractIDData(image);

    console.log("✅ OCR extraction complete:", data);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ OCR route error:", error);

    res.status(500).json({
      success: false,
      error: "OCR processing failed",
    });
  }
});

module.exports = router;
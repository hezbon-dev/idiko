
const express = require("express");
const router = express.Router();

const { extractIDData } = require("../services/ocr");

const VALID_DOCUMENT_TYPES = [
  "national_id",
  "driving_license",
  "birth_certificate",
];

// POST /api/ocr
router.post("/", async (req, res) => {
  try {
    const { image } = req.body;
    const documentType = (
      typeof req.body.documentType === "string"
        ? req.body.documentType
        : "national_id"
    ).trim().toLowerCase();

    if (!image) {
      return res.status(400).json({
        success: false,
        error: "No image provided",
      });
    }

    if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid document type",
      });
    }

    console.log("📸 OCR request received:", documentType);

    const data = await extractIDData(image, documentType);

    console.log("✅ OCR extraction complete:", data);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ OCR route error:", error);

    return res.status(500).json({
      success: false,
      error: "OCR processing failed",
    });
  }
});

module.exports = router;

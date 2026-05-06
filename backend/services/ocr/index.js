 const tesseractOCR = require("./tesseract");
const googleOCR = require("./google");

async function extractIDData(imageBase64) {
  try {
    const provider = process.env.OCR_PROVIDER || "tesseract";

    console.log("🔍 OCR Provider:", provider);

    if (provider === "google") {
      return await googleOCR(imageBase64);
    }

    // Default → Tesseract
    return await tesseractOCR(imageBase64);
  } catch (error) {
    console.error("❌ OCR Extraction Error:", error);
    throw error;
  }
}

module.exports = { extractIDData };
const tesseractOCR = require("./tesseract");
const googleOCR = require("./google");

// ✅ Supported OCR providers
const VALID_PROVIDERS = ["google", "tesseract"];

async function extractIDData(imageBase64) {
  // ✅ Validate image input
  if (!imageBase64) {
    throw new Error("No image provided for OCR");
  }

  // ✅ Read provider from ENV
  const provider =
  (process.env.OCR_PROVIDER || "tesseract").toLowerCase();
  
  // ✅ Fallback protection
  const selectedProvider = VALID_PROVIDERS.includes(provider)
    ? provider
    : "tesseract";

  console.log("🔍 OCR Provider:", selectedProvider);

  try {

    // =========================
    // ✅ GOOGLE OCR
    // =========================

    if (selectedProvider === "google") {
      try {
        const result = await googleOCR(imageBase64);

        console.log("✅ Google OCR successful");

        return result;

      } catch (googleError) {

        console.error(
          "❌ Google OCR failed → falling back to Tesseract",
          googleError.message
        );

        // ✅ Automatic fallback
        const fallbackResult = await tesseractOCR(imageBase64);

        console.log("✅ Tesseract fallback successful");

        return fallbackResult;
      }
    }

    // =========================
    // ✅ TESSERACT OCR
    // =========================

    const result = await tesseractOCR(imageBase64);

    console.log("✅ Tesseract OCR successful");

    return result;

  } catch (error) {

    console.error("❌ OCR Extraction Error:", error);

    throw error;
  }
}

module.exports = { extractIDData };
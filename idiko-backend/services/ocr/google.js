
const vision = require("@google-cloud/vision");
const parseKenyanDocument = require("./parser");

// ==============================
// LOAD GOOGLE CREDENTIALS
// ==============================

let credentials;

try {
  console.log("🔐 Loading Google credentials...");

  if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT ENV is missing");
  }

  credentials = JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT
  );

  console.log("✅ Google credentials loaded");
} catch (error) {
  console.error("❌ Failed to load Google credentials:", error);
  throw error;
}

// ==============================
// CREATE GOOGLE CLIENT
// ==============================

let client;

try {
  client = new vision.ImageAnnotatorClient({
    credentials,
  });

  console.log("✅ Google Vision client initialized");
} catch (error) {
  console.error(
    "❌ Failed to initialize Google Vision client:",
    error
  );

  throw error;
}

// ==============================
// GOOGLE OCR FUNCTION
// ==============================

async function googleOCR(
  imageBase64,
  documentType = "national_id"
) {
  try {
    console.log("📸 Starting Google OCR...");
    console.log("📄 Selected document type:", documentType);

    // Remove a data URL header if present.
    const base64Image = imageBase64.replace(
      /^data:image\/[^;]+;base64,/i,
      ""
    );

    console.log("✅ Base64 image cleaned");

    // ==============================
    // GOOGLE VISION OCR REQUEST
    // ==============================

    const [result] = await client.textDetection({
      image: {
        content: base64Image,
      },
    });

    console.log("✅ Google Vision OCR completed");

    // ==============================
    // EXTRACT RAW TEXT
    // ==============================

    const text =
      result.fullTextAnnotation?.text ||
      result.textAnnotations?.[0]?.description ||
      "";

    console.log("🧾 RAW GOOGLE OCR TEXT:\n", text);

    if (!text.trim()) {
      throw new Error("Google Vision could not detect text");
    }

    // ==============================
    // PARSE DOCUMENT
    // ==============================

    // Preserve the existing parser behavior for now.
    const parsedData = parseKenyanDocument(text, documentType);

    console.log("✅ Google OCR parsed successfully");

    // ==============================
    // RETURN RESULT
    // ==============================

    return {
      rawText: text,
      provider: "google-vision",
      ...parsedData,
    };
  } catch (error) {
    console.error("❌ Google OCR FULL ERROR:", error);
    throw error;
  }
}

module.exports = googleOCR;

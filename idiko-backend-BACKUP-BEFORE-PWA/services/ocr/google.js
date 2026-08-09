const vision = require("@google-cloud/vision");
const parseKenyanID = require("./parser");

// ==============================
// ✅ LOAD GOOGLE CREDENTIALS
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

  console.error(
    "❌ Failed to load Google credentials:",
    error
  );

  throw error;
}

// ==============================
// ✅ CREATE GOOGLE CLIENT
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
// ✅ GOOGLE OCR FUNCTION
// ==============================

async function googleOCR(imageBase64) {

  try {

    console.log("📸 Starting Google OCR...");

    // ✅ Remove base64 header safely
    const base64Image = imageBase64.replace(
      /^data:image\/\w+;base64,/,
      ""
    );

    console.log("✅ Base64 image cleaned");

    // ==============================
    // ✅ GOOGLE OCR REQUEST
    // ==============================

    const [result] = await client.textDetection({
      image: {
        content: base64Image,
      },
    });

    console.log("✅ Google Vision OCR completed");

    // ==============================
    // ✅ EXTRACT RAW TEXT
    // ==============================

    const text =
      result.fullTextAnnotation?.text || "";

    console.log("🧾 RAW GOOGLE OCR TEXT:\n", text);

    // ==============================
    // ✅ PARSE KENYAN ID
    // ==============================

    const parsedData = parseKenyanID(text);

    console.log(
      "✅ Google OCR parsed successfully"
    );

    // ==============================
    // ✅ RETURN RESULT
    // ==============================

    return {
      rawText: text,
      provider: "google-vision",
      ...parsedData,
    };

  } catch (error) {

    console.error(
      "❌ Google OCR FULL ERROR:",
      error
    );

    throw error;
  }
}

module.exports = googleOCR;
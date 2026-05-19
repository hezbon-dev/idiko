const vision = require("@google-cloud/vision");
const parseKenyanID = require("./parser");

// ✅ Load credentials safely from Render ENV
const credentials = JSON.parse(
  process.env.GOOGLE_SERVICE_ACCOUNT
);

// ✅ Create Google Vision client
const client = new vision.ImageAnnotatorClient({
  credentials,
});

async function googleOCR(imageBase64) {
  try {

    // ✅ Remove base64 header safely
    const base64Image = imageBase64.replace(
      /^data:image\/\w+;base64,/,
      ""
    );

    // ✅ Google Vision OCR request
    const [result] = await client.textDetection({
      image: {
        content: base64Image,
      },
    });

    // ✅ Extract OCR text safely
    const text =
      result.fullTextAnnotation?.text || "";

    console.log("🧾 GOOGLE OCR TEXT EXTRACTED");

    // ✅ Parse structured Kenyan ID data
    const parsedData = parseKenyanID(text);

    // ✅ Return structured result
    return {
      rawText: text,
      provider: "google-vision",
      ...parsedData,
    };

  } catch (error) {

    console.error(
      "❌ Google OCR Error:",
      error.message
    );

    throw error;
  }
}

module.exports = googleOCR;
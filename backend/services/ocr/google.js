 const vision = require("@google-cloud/vision");
const parseKenyanID = require("./parser");

// Create client (will only work after setup later)
const client = new vision.ImageAnnotatorClient();

async function googleOCR(imageBase64) {
  try {
    const [result] = await client.textDetection({
      image: {
        content: imageBase64.split(",")[1],
      },
    });

    const text = result.fullTextAnnotation?.text || "";

    console.log("🧾 GOOGLE OCR TEXT:\n", text);

    const parsedData = parseKenyanID(text);

    return parsedData;
  } catch (error) {
    console.error("❌ Google OCR Error:", error);
    throw error;
  }
}

module.exports = googleOCR;
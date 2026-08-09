const Tesseract = require("tesseract.js");
const parseKenyanID = require("./parser");

let worker; // ✅ added

async function initWorker() { // ✅ added
  if (!worker) {
    worker = await Tesseract.createWorker("eng");
    console.log("🔥 Tesseract worker initialized");
  }
}

async function tesseractOCR(imageBase64) {
  try {
    await initWorker(); // ✅ added

    const result = await worker.recognize(imageBase64); // ✅ logger removed

    const text = result.data.text;

    console.log("🧾 RAW OCR TEXT:\n", text);

    // Extract structured data
    const parsedData = parseKenyanID(text);

    return parsedData;
  } catch (error) {
    console.error("❌ Tesseract OCR Error:", error);
    throw error;
  }
}

module.exports = tesseractOCR;
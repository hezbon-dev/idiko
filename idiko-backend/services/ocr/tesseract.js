
const Tesseract = require("tesseract.js");
const parseKenyanDocument = require("./parser");

let worker;

async function initWorker() {
  if (!worker) {
    worker = await Tesseract.createWorker("eng");
    console.log("🔥 Tesseract worker initialized");
  }
}

async function tesseractOCR(imageBase64, documentType = "national_id") {
  try {
    await initWorker();

    const result = await worker.recognize(imageBase64);
    const text = result.data.text;

    console.log("🧾 RAW OCR TEXT:\n", text);

    // Preserve the existing document parser and its text-based detection.
    const parsedData = parseKenyanDocument(text);

    // Log the selected type alongside the parser's detected type.
    console.log("📄 Selected document type:", documentType);
    console.log("📄 Detected document type:", parsedData.documentType);

    return parsedData;
  } catch (error) {
    console.error("❌ Tesseract OCR Error:", error);
    throw error;
  }
}

module.exports = tesseractOCR;

function parseKenyanID(text) {
  console.log("🧠 Starting Kenyan ID parser...");

  // ✅ Normalize OCR text globally
  const normalizedText = text
    .replace(/[|]/g, "I")
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ");

  // ✅ Split and clean lines properly
  const lines = text
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/\s+/g, " ")
    )
    .filter((line) => line !== "");

  let fullName = "";
  let idNumber = "";
  let dob = "";
  let sex = "";
  let district = "";

  // ✅ Common invalid/header words
  const invalidNameWords = [
    "REPUBLIC",
    "KENYA",
    "IDENTITY",
    "CARD",
    "SERIAL",
    "NUMBER",
    "DISTRICT",
    "DATE",
    "BIRTH",
    "SIGNATURE",
    "HOLDER",
    "REGISTRATION",
  ];

  // ✅ Kenyan counties/districts (expandable later)
  const kenyaLocations = [
    "NAIROBI",
    "MOMBASA",
    "KISUMU",
    "KISII",
    "ELDORET",
    "NAKURU",
    "KIAMBU",
    "MACHAKOS",
    "MERU",
    "EMBU",
    "THIKA",
    "NYERI",
    "KAKAMEGA",
    "KERICHO",
    "BUNGOMA",
    "BUSIA",
    "SIAYA",
    "HOMA BAY",
    "MIGORI",
    "UASIN GISHU",
  ];

  // 🔍 Loop through lines
  lines.forEach((line, index) => {
    const clean = line.toUpperCase();

    // ✅ OCR-safe normalization
    const ocrSafe = clean
      .replace(/O/g, "0")
      .replace(/I/g, "1")
      .replace(/L/g, "1")
      .replace(/S/g, "5")
      .replace(/B/g, "8");

    const nameClean = clean
      .replace(/[^A-Z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // =========================
    // ✅ ID NUMBER EXTRACTION
    // =========================

    if (!idNumber) {
      const idMatches = ocrSafe.match(/\b\d{7,8}\b/g);

      if (idMatches && idMatches.length > 0) {
        const validId = idMatches.find((id) => {
          const num = Number(id);

          // Reject likely years
          if (num >= 19000000 && num <= 20999999) {
            return false;
          }

          return true;
        });

        if (validId) {
          idNumber = validId;
          console.log("🪪 ID Number Extracted:", idNumber);
        }
      }
    }

    // =========================
    // ✅ SEX EXTRACTION
    // =========================

    if (!sex) {
      const compact = clean.replace(/\s+/g, "");

      if (
        compact.includes("FEMALE") ||
        compact.includes("FEMALE") ||
        compact === "F"
      ) {
        sex = "FEMALE";
        console.log("🚻 Sex Extracted:", sex);
      }

      else if (
        compact.includes("MALE") ||
        compact === "M"
      ) {
        sex = "MALE";
        console.log("🚻 Sex Extracted:", sex);
      }
    }

    // =========================
    // ✅ DATE OF BIRTH EXTRACTION
    // =========================

    if (!dob) {
      const dateMatch = clean.match(
        /\b\d{2}[./-]\d{2}[./-]\d{4}\b/
      );

      if (dateMatch) {
        const rawDate = dateMatch[0];

        const parts = rawDate.split(/[./-]/);

        if (parts.length === 3) {
          const day = Number(parts[0]);
          const month = Number(parts[1]);
          const year = Number(parts[2]);

          // ✅ Basic validation
          if (
            day >= 1 &&
            day <= 31 &&
            month >= 1 &&
            month <= 12 &&
            year >= 1900 &&
            year <= new Date().getFullYear()
          ) {
            dob = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            console.log("📅 DOB Extracted:", dob);
          }
        }
      }
    }

    // =========================
    // ✅ DISTRICT / COUNTY EXTRACTION
    // =========================

    if (!district) {
      const foundLocation = kenyaLocations.find((loc) =>
        clean.includes(loc)
      );

      if (foundLocation) {
        district = foundLocation;
        console.log("📍 District Extracted:", district);
      }
    }

    // =========================
    // ✅ FULL NAME EXTRACTION
    // =========================

    if (!fullName) {
      const words = nameClean
        .split(" ")
        .filter((word) => word.length >= 2);

      const invalidLine = invalidNameWords.some((word) =>
        nameClean.includes(word)
      );

      // ✅ Support 2–5 names
      if (
        !invalidLine &&
        words.length >= 2 &&
        words.length <= 5
      ) {
        const looksLikeName = words.every(
          (word) =>
            /^[A-Z]+$/.test(word)
        );

        if (looksLikeName) {
          fullName = words.join(" ");

          console.log("👤 Full Name Extracted:", fullName);
        }
      }
    }
  });

  // =========================
  // ✅ CONFIDENCE SCORING
  // =========================

  const confidence = calculateConfidence({
    fullName,
    idNumber,
    dob,
    sex,
    district,
  });

  console.log("📊 OCR Confidence:", confidence);

  // =========================
  // ✅ FINAL STRUCTURED RESULT
  // =========================

  const result = {
    fullName,
    idNumber,
    dob,
    sex,
    district,
    confidence,
  };

  console.log("✅ Final Parsed Result:", result);

  return result;
}

// 🔢 Confidence scoring
function calculateConfidence(data) {
  let score = 0;

  if (data.fullName) score += 0.25;

  if (
    data.idNumber &&
    /^\d{7,8}$/.test(data.idNumber)
  ) {
    score += 0.30;
  }

  if (data.dob) score += 0.20;

  if (
    data.sex === "MALE" ||
    data.sex === "FEMALE"
  ) {
    score += 0.10;
  }

  if (data.district) score += 0.15;

  return Number(score.toFixed(2));
}

module.exports = parseKenyanID;
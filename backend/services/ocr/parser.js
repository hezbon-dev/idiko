function parseKenyanID(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  let fullName = "";
  let idNumber = "";
  let dob = "";
  let sex = "";
  let district = "";

  // 🔍 Loop through lines
  lines.forEach((line, index) => {
    const clean = line.toUpperCase();

    const nameClean = line
      .toUpperCase()
      .replace(/[^A-Z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // ✅ ID NUMBER (usually 7-8 digits)
    if (!idNumber && /\b\d{7,8}\b/.test(clean)) {
      const match = clean.match(/\b\d{7,8}\b/);
      if (match) idNumber = match[0];
    }

    // ✅ SEX (IMPROVED - handles OCR noise)
    if (!sex) {
      if (
        clean.includes("MALE") ||
        clean === "M" ||
        clean.includes(" MA") ||
        clean.includes("MA ")
      ) {
        sex = "MALE";
      }

      if (
        clean.includes("FEMALE") ||
        clean === "F" ||
        clean.includes(" FE") ||
        clean.includes("FE ")
      ) {
        sex = "FEMALE";
      }
    }

    // ✅ DATE OF BIRTH (supports . and / and converts to YYYY-MM-DD)
    const dateMatch = clean.match(/\b\d{2}[./]\d{2}[./]\d{4}\b/);
    if (!dob && dateMatch) {
      const rawDate = dateMatch[0];

      const parts = rawDate.split(/[./]/);
      if (parts.length === 3) {
        dob = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // ✅ DISTRICT (direct match from line)
    if (
      clean.includes("KISUMU") ||
      clean.includes("NAIROBI") ||
      clean.includes("MOMBASA") ||
      clean.includes("KISII") ||
      clean.includes("ELDORET")
    ) {
      district = clean;
    }

    // ✅ FULL NAME (line with 3 capital words, ignore headers)
    if (
      !fullName &&
      /^[A-Z]{3,}\s+[A-Z]{3,}\s+[A-Z]{3,}$/.test(nameClean) &&
      !nameClean.includes("REPUBLIC") &&
      !nameClean.includes("KENYA") &&
      !nameClean.includes("SERIAL NUMBER")
    ) {
      fullName = nameClean.split(" ").slice(0, 3).join(" ");
    }
  });

  return {
    fullName,
    idNumber,
    dob,
    sex,
    district,
    confidence: calculateConfidence({
      fullName,
      idNumber,
      dob,
      sex,
      district,
    }),
  };
}

// 🔢 Confidence scoring (VERY useful later)
function calculateConfidence(data) {
  let score = 0;

  if (data.fullName) score += 0.2;
  if (data.idNumber) score += 0.3;
  if (data.dob) score += 0.2;
  if (data.sex) score += 0.1;
  if (data.district) score += 0.2;

  return score; // max = 1.0
}

module.exports = parseKenyanID;
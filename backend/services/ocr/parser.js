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
    "FULL",
    "NAMES",
    "PLACE",
    "ISSUE",
    "SEX",
  ];

  // =========================
  // ✅ HELPERS
  // =========================

  function getNextValidLine(startIndex) {
    for (let i = startIndex + 1; i < lines.length; i++) {
      const nextLine = lines[i]
        .trim()
        .replace(/\s+/g, " ");

      if (nextLine) {
        return nextLine;
      }
    }

    return "";
  }

  function formatDate(rawDate) {
    const parts = rawDate.split(/[./-]/);

    if (parts.length !== 3) return "";

    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);

    if (
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12 &&
      year >= 1900 &&
      year <= new Date().getFullYear()
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    return "";
  }

  // 🔍 Loop through lines
  lines.forEach((line, index) => {
    const clean = line.toUpperCase();

    // ✅ OCR-safe normalization ONLY for numeric fields
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
    // ✅ FULL NAME EXTRACTION
    // =========================

    if (
      !fullName &&
      (
        clean.includes("FULL NAMES") ||
        clean.includes("FULL NAME") ||
        clean === "NAMES"
      )
    ) {
      console.log("🎯 Found FULL NAME label");

      const nextLine = getNextValidLine(index);

      const nextClean = nextLine
        .toUpperCase()
        .replace(/[^A-Z\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const words = nextClean
        .split(" ")
        .filter((word) => word.length >= 2);

      const invalidLine = invalidNameWords.some((word) =>
        nextClean.includes(word)
      );

      if (
        !invalidLine &&
        words.length >= 2 &&
        words.length <= 5
      ) {
        fullName = words.join(" ");

        console.log(
          "👤 Full Name Extracted From Label:",
          fullName
        );
      }
    }

    // =========================
    // ✅ ID NUMBER EXTRACTION
    // =========================

    if (
      !idNumber &&
      (
        clean.includes("ID NUMBER") ||
        clean.includes("ID NO")
      )
    ) {
      console.log("🎯 Found ID NUMBER label");

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

          console.log(
            "🪪 ID Number Extracted From Label:",
            idNumber
          );
        }
      }
    }

    // =========================
    // ✅ DATE OF BIRTH EXTRACTION
    // =========================

    if (
      !dob &&
      (
        clean.includes("DATE OF BIRTH") ||
        clean.includes("DATEQF BIRTH") ||
        clean.includes("BIRTH")
      )
    ) {
      console.log("🎯 Found DATE OF BIRTH label");

      const nextLine = getNextValidLine(index);

      const dateMatch = nextLine.match(
        /\b\d{2}[./-]\d{2}[./-]\d{4}\b/
      );

      if (dateMatch) {
        const formattedDate = formatDate(dateMatch[0]);

        if (formattedDate) {
          dob = formattedDate;

          console.log(
            "📅 DOB Extracted From Label:",
            dob
          );
        }
      }
    }

    // =========================
    // ✅ SEX EXTRACTION
    // =========================

    if (
      !sex &&
      clean.includes("SEX")
    ) {
      console.log("🎯 Found SEX label");

      const nextLine = getNextValidLine(index);

      const compact = nextLine
        .toUpperCase()
        .replace(/\s+/g, "");

      if (
        compact.includes("FEMALE") ||
        compact === "F"
      ) {
        sex = "FEMALE";

        console.log(
          "🚻 Sex Extracted From Label:",
          sex
        );
      }

      else if (
        compact.includes("MALE") ||
        compact === "M"
      ) {
        sex = "MALE";

        console.log(
          "🚻 Sex Extracted From Label:",
          sex
        );
      }
    }

    // =========================
    // ✅ DISTRICT / COUNTY EXTRACTION
    // =========================

    if (
      !district &&
      (
        clean.includes("DISTRICT OF BIRTH") ||
        clean.includes("DISTRICT BIRTH")
      )
    ) {
      console.log("🎯 Found DISTRICT label");

      const nextLine = getNextValidLine(index);

      district = nextLine
        .toUpperCase()
        .replace(/[^A-Z\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      console.log(
        "📍 District Extracted From Label:",
        district
      );
    }

    // =========================
    // ✅ FALLBACK ID EXTRACTION
    // =========================

    if (!idNumber) {
      const idMatches = ocrSafe.match(/\b\d{7,8}\b/g);

      if (idMatches && idMatches.length > 0) {
        const validId = idMatches.find((id) => {
          const num = Number(id);

          if (num >= 19000000 && num <= 20999999) {
            return false;
          }

          return true;
        });

        if (validId) {
          idNumber = validId;

          console.log(
            "🪪 Fallback ID Number Extracted:",
            idNumber
          );
        }
      }
    }

    // =========================
    // ✅ FALLBACK SEX EXTRACTION
    // =========================

    if (!sex) {
      const compact = clean.replace(/\s+/g, "");

      if (
        compact.includes("FEMALE") ||
        compact === "F"
      ) {
        sex = "FEMALE";

        console.log(
          "🚻 Fallback Sex Extracted:",
          sex
        );
      }

      else if (
        compact.includes("MALE") ||
        compact === "M"
      ) {
        sex = "MALE";

        console.log(
          "🚻 Fallback Sex Extracted:",
          sex
        );
      }
    }

    // =========================
    // ✅ FALLBACK DOB EXTRACTION
    // =========================

    if (!dob) {
      const dateMatch = clean.match(
        /\b\d{2}[./-]\d{2}[./-]\d{4}\b/
      );

      if (dateMatch) {
        const formattedDate = formatDate(dateMatch[0]);

        if (formattedDate) {
          dob = formattedDate;

          console.log(
            "📅 Fallback DOB Extracted:",
            dob
          );
        }
      }
    }

    // =========================
    // ✅ FALLBACK FULL NAME EXTRACTION
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

          console.log(
            "👤 Fallback Full Name Extracted:",
            fullName
          );
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

  // ✅ Full name confidence
  if (
    data.fullName &&
    ![
      "FULL NAMES",
      "FULL NAME",
      "NAMES",
    ].includes(data.fullName)
  ) {
    score += 0.25;
  }

  // ✅ ID number confidence
  if (
    data.idNumber &&
    /^\d{7,8}$/.test(data.idNumber)
  ) {
    score += 0.30;
  }

  // ✅ DOB confidence
  if (
    data.dob &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.dob)
  ) {
    score += 0.20;
  }

  // ✅ Sex confidence
  if (
    data.sex === "MALE" ||
    data.sex === "FEMALE"
  ) {
    score += 0.10;
  }

  // ✅ District confidence
  if (
    data.district &&
    data.district.length >= 3
  ) {
    score += 0.15;
  }

  return Number(score.toFixed(2));
}

module.exports = parseKenyanID;
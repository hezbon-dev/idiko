// ============================================================
// Kenyan Document OCR Parser
// Supports:
//   1. Kenyan National ID / Maisha Card
//   2. Kenyan Driving Licence
//   3. Kenyan Birth Certificate
//
// IMPORTANT:
// - Existing National ID extraction logic is intentionally preserved.
// - Driving Licence and Birth Certificate use document-specific
//   extraction rules.
// - Shared date parsing is improved and reused by all document types.
// ============================================================


// ============================================================
// SHARED DATE PARSER
// ============================================================

function parseDate(rawDate) {
  if (!rawDate) return "";

  let value = String(rawDate)
    .trim()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ");

  // ------------------------------------------------------------
  // YYYY-MM-DD
  // Example: 1993-12-31
  // ------------------------------------------------------------

  let match = value.match(
    /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/
  );

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    return buildValidDate(year, month, day);
  }

  // ------------------------------------------------------------
  // DD/MM/YYYY
  // DD.MM.YYYY
  // DD-MM-YYYY
  //
  // Examples:
  // 16.12.1986
  // 21/11/2020
  // 21-11-2020
  // ------------------------------------------------------------

  match = value.match(
    /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/
  );

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    return buildValidDate(year, month, day);
  }

  // ------------------------------------------------------------
  // DD Month YYYY
  //
  // Examples:
  // 29 August 2006
  // 29 Aug 2006
  // 29th August 2006
  // 29th Aug. 2006
  // ------------------------------------------------------------

  const monthNames = {
    JANUARY: 1,
    JAN: 1,

    FEBRUARY: 2,
    FEB: 2,

    MARCH: 3,
    MAR: 3,

    APRIL: 4,
    APR: 4,

    MAY: 5,

    JUNE: 6,
    JUN: 6,

    JULY: 7,
    JUL: 7,

    AUGUST: 8,
    AUG: 8,

    SEPTEMBER: 9,
    SEP: 9,
    SEPT: 9,

    OCTOBER: 10,
    OCT: 10,

    NOVEMBER: 11,
    NOV: 11,

    DECEMBER: 12,
    DEC: 12,
  };

  match = value.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?\s+(\d{4})\b/i
  );

  if (match) {
    const day = Number(match[1]);
    const monthName = match[2].toUpperCase();
    const year = Number(match[3]);

    const month = monthNames[monthName];

    if (month) {
      return buildValidDate(year, month, day);
    }
  }

  return "";
}


// ============================================================
// DATE VALIDATION
// ============================================================

function buildValidDate(year, month, day) {
  const currentYear = new Date().getFullYear();

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return "";
  }

  if (year < 1900 || year > currentYear) {
    return "";
  }

  if (month < 1 || month > 12) {
    return "";
  }

  if (day < 1 || day > 31) {
    return "";
  }

  // Prevent impossible dates such as 31 February.
  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}


// ============================================================
// COMMON OCR NORMALIZATION
// ============================================================

function normalizeOCRText(text) {
  return String(text || "")
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function getCleanLines(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/\s+/g, " ")
    )
    .filter((line) => line !== "");
}


function cleanName(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function cleanLocation(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function getNextValidLine(lines, startIndex) {
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


// ============================================================
// SEX NORMALIZATION
// ============================================================

function parseSex(value) {
  if (!value) return "";

  const compact = String(value)
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  // Normal
  if (
    compact === "F" ||
    compact === "FEMALE"
  ) {
    return "FEMALE";
  }

  if (
    compact === "M" ||
    compact === "MALE"
  ) {
    return "MALE";
  }

  // Common OCR variants.
  // Example from supplied birth certificate:
  // "Fanale" → FEMALE
  if (
    compact === "FANALE" ||
    compact === "FEMA1E" ||
    compact === "FEMAIE" ||
    compact === "FEMAI E"
  ) {
    return "FEMALE";
  }

  return "";
}


// ============================================================
// DOCUMENT TYPE DETECTION
// ============================================================

function detectKenyanDocumentType(text) {
  const upper = normalizeOCRText(text)
    .toUpperCase();

  // ------------------------------------------------------------
  // DRIVING LICENCE
  // ------------------------------------------------------------

  if (
    upper.includes("DRIVING LICENCE") ||
    upper.includes("DRIVING LICENSE")
  ) {
    return "DRIVING_LICENCE";
  }

  // ------------------------------------------------------------
  // BIRTH CERTIFICATE
  // ------------------------------------------------------------

  if (
    upper.includes("CERTIFICATE OF BIRTH") ||
    upper.includes("BIRTH CERTIFICATE") ||
    upper.includes("BIRTHS AND DEATHS REGISTRATION")
  ) {
    return "BIRTH_CERTIFICATE";
  }

  // ------------------------------------------------------------
  // NATIONAL ID / MAISHA CARD
  //
  // IMPORTANT:
  // This remains the default for existing ID behaviour.
  // ------------------------------------------------------------

  return "NATIONAL_ID";
}


// ============================================================
// ============================================================
// NATIONAL ID PARSER
// ============================================================
// Existing ID logic preserved.
// Only shared date handling is improved.
// ============================================================
// ============================================================

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

  // Keep the existing line-based behaviour.
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

  // ==========================================================
  // Common invalid/header words
  // ==========================================================

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

    // Maisha Card words
    "KITAMBULISHO",
    "TAIFA",
    "NATIONAL",
    "MAISHA",
    "NAMBA",
    "SURNAME",
    "GIVEN",
    "NAME",
    "NATIONALITY",
  ];

  // ==========================================================
  // HELPERS
  // ==========================================================

  function getNextValidLineID(startIndex) {

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

  // ==========================================================
  // MAISHA CARD NAME EXTRACTION
  // ==========================================================

  const surnameIndex = lines.findIndex(
    line => line.toUpperCase().includes("SURNAME")
  );

  const givenNameIndex = lines.findIndex(line => {

    const upper = line.toUpperCase();

    return (
      upper.includes("GIVEN NAME") ||
      upper.includes("GIVEN NAMES") ||
      upper.includes("GNEN NAME") ||
      upper.includes("GNEN NAMES")
    );

  });

  if (
    !fullName &&
    surnameIndex !== -1 &&
    givenNameIndex !== -1
  ) {

    const surname = getNextValidLineID(surnameIndex)
      .toUpperCase()
      .trim();

    const givenNames = getNextValidLineID(givenNameIndex)
      .toUpperCase()
      .trim();

    if (surname && givenNames) {

      fullName =
        `${givenNames} ${surname}`.trim();

      console.log(
        "👤 Maisha Card Name Extracted:",
        fullName
      );
    }
  }

  // ==========================================================
  // LOOP THROUGH LINES
  // ==========================================================

  lines.forEach((line, index) => {

    const clean = line.toUpperCase();

    // Existing OCR-safe normalization.
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

    // ========================================================
    // FULL NAME EXTRACTION
    // ========================================================

    if (
      !fullName &&
      (
        clean.includes("FULL NAMES") ||
        clean.includes("FULL NAME") ||
        clean === "NAMES"
      )
    ) {

      console.log("🎯 Found FULL NAME label");

      const nextLine = getNextValidLineID(index);

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

    // ========================================================
    // ID NUMBER EXTRACTION
    // ========================================================

    if (
      !idNumber &&
      (
        clean.includes("ID NUMBER") ||
        clean.includes("ID NO") ||
        clean === "NUMBER"
      )
    ) {

      console.log("🎯 Found ID NUMBER label");

      // FIRST: same line

      const sameLineMatch = clean.match(
        /\b\d{7,9}\b/
      );

      if (sameLineMatch) {

        idNumber = sameLineMatch[0];

        console.log(
          "🪪 ID Number Extracted From Same Line:",
          idNumber
        );

      }

      // SECOND: next line

      else {

        const nextLine =
          getNextValidLineID(index);

        const idMatch =
          nextLine.match(/\b\d{7,9}\b/);

        if (idMatch) {

          idNumber = idMatch[0];

          console.log(
            "🪪 ID Number Extracted From Next Line:",
            idNumber
          );
        }
      }
    }

    // ========================================================
    // DATE OF BIRTH EXTRACTION
    // ========================================================

    if (
      !dob &&
      (
        clean.includes("DATE OF BIRTH") ||
        clean.includes("DATEQF BIRTH") ||
        clean.includes("BIRTH")
      )
    ) {

      console.log("🎯 Found DATE OF BIRTH label");

      const nextLine =
        getNextValidLineID(index);

      const formattedDate =
        parseDate(nextLine);

      if (formattedDate) {

        dob = formattedDate;

        console.log(
          "📅 DOB Extracted From Label:",
          dob
        );
      }
    }

    // ========================================================
    // SEX EXTRACTION
    // ========================================================

    if (
      !sex &&
      clean.includes("SEX")
    ) {

      console.log("🎯 Found SEX label");

      const nextLine =
        getNextValidLineID(index);

      const parsedSex =
        parseSex(nextLine);

      if (parsedSex) {

        sex = parsedSex;

        console.log(
          "🚻 Sex Extracted From Label:",
          sex
        );
      }
    }

    // ========================================================
    // DISTRICT / COUNTY EXTRACTION
    // ========================================================

    if (
      !district &&
      (
        clean.includes("DISTRICT OF BIRTH") ||
        clean.includes("DISTRICT BIRTH") ||
        clean.includes("PLACE OF BIRTH")
      )
    ) {

      console.log(
        "🎯 Found BIRTH LOCATION label"
      );

      for (
        let i = index + 1;
        i < lines.length;
        i++
      ) {

        const candidate = lines[i]
          .toUpperCase()
          .replace(/[^A-Z\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (
          !candidate ||
          candidate === "NATIONALITY" ||
          candidate === "KEN" ||
          candidate === "MALE" ||
          candidate === "FEMALE" ||
          candidate.includes("ID NUMBER") ||
          candidate.includes("DATE OF") ||
          candidate.includes("DATE OF EXPIRY") ||
          candidate.includes("PLACE OF ISSUE")
        ) {
          continue;
        }

        district = candidate;

        console.log(
          "📍 Birth Location Extracted:",
          district
        );

        break;
      }
    }

    // ========================================================
    // FALLBACK SEX
    // ========================================================

    if (!sex) {

      const parsedSex =
        parseSex(clean);

      if (parsedSex) {

        sex = parsedSex;

        console.log(
          "🚻 Fallback Sex Extracted:",
          sex
        );
      }
    }

    // ========================================================
    // FALLBACK DOB
    // ========================================================

    if (!dob) {

      const formattedDate =
        parseDate(clean);

      if (formattedDate) {

        dob = formattedDate;

        console.log(
          "📅 Fallback DOB Extracted:",
          dob
        );
      }
    }

    // ========================================================
    // FALLBACK FULL NAME
    // ========================================================

    if (!fullName) {

      const words = nameClean
        .split(" ")
        .filter((word) => word.length >= 2);

      const invalidLine =
        invalidNameWords.some((word) =>
          nameClean.includes(word)
        );

      if (
        !invalidLine &&
        words.length >= 2 &&
        words.length <= 5
      ) {

        const looksLikeName =
          words.every(
            (word) => /^[A-Z]+$/.test(word)
          );

        if (looksLikeName) {

          fullName =
            words.join(" ");

          console.log(
            "👤 Fallback Full Name Extracted:",
            fullName
          );
        }
      }
    }

  });

  // ==========================================================
  // FINAL FALLBACK ID EXTRACTION
  // ==========================================================

  if (!idNumber) {

    const idLabelIndex =
      lines.findIndex(line => {

        const upper =
          line.toUpperCase().trim();

        return (
          upper.includes("ID NUMBER") ||
          upper.includes("ID NO") ||
          upper === "NUMBER"
        );

      });

    if (idLabelIndex !== -1) {

      const nextLine =
        getNextValidLineID(idLabelIndex);

      const idMatch =
        nextLine.match(/\b\d{7,9}\b/);

      if (idMatch) {

        idNumber = idMatch[0];

        console.log(
          "🪪 Final Fallback ID Number Extracted:",
          idNumber
        );
      }
    }
  }

  // ==========================================================
  // CONFIDENCE
  // ==========================================================

  const confidence =
    calculateConfidence({
      fullName,
      idNumber,
      dob,
      sex,
      district,
    });

  console.log(
    "📊 OCR Confidence:",
    confidence
  );

  const result = {
    fullName,
    idNumber,
    dob,
    sex,
    district,
    confidence,
  };

  console.log(
    "✅ Final Parsed Result:",
    result
  );

  return result;
}


// ============================================================
// ============================================================
// DRIVING LICENCE PARSER
// ============================================================
// ============================================================

function parseKenyanDrivingLicence(text) {

  console.log(
    "🚗 Starting Kenyan Driving Licence parser..."
  );

  const lines =
    getCleanLines(text);

  let fullName = "";
  let idNumber = "";
  let dob = "";
  let sex = "";
  let district = "";

  // Internal only.
  // This is deliberately NOT the same as idNumber.
  let drivingLicenceNumber = "";

  // ==========================================================
  // SURNAME
  // ==========================================================

  const surnameIndex =
    lines.findIndex(line =>
      line.toUpperCase().trim() === "SURNAME"
    );

  let surname = "";

  if (surnameIndex !== -1) {

    const value =
      getNextValidLine(
        lines,
        surnameIndex
      );

    const cleaned =
      cleanName(value);

    if (
      cleaned &&
      !isDrivingLicenceHeader(cleaned)
    ) {
      surname = cleaned;

      console.log(
        "👤 Driving Licence Surname:",
        surname
      );
    }
  }

  // ==========================================================
  // OTHER NAMES
  // ==========================================================

  const otherNamesIndex =
    lines.findIndex(line => {

      const upper =
        line.toUpperCase();

      return (
        upper.includes("OTHER NAMES") ||
        upper.includes("OTHER NAME")
      );
    });

  let otherNames = "";

  if (otherNamesIndex !== -1) {

    const value =
      getNextValidLine(
        lines,
        otherNamesIndex
      );

    const cleaned =
      cleanName(value);

    if (
      cleaned &&
      !isDrivingLicenceHeader(cleaned)
    ) {

      otherNames = cleaned;

      console.log(
        "👤 Driving Licence Other Names:",
        otherNames
      );
    }
  }

  // ==========================================================
  // FULL NAME
  // ==========================================================

  if (surname && otherNames) {

    fullName =
      `${otherNames} ${surname}`
        .replace(/\s+/g, " ")
        .trim();

  } else if (otherNames) {

    fullName = otherNames;

  } else if (surname) {

    fullName = surname;
  }

  if (fullName) {

    console.log(
      "👤 Driving Licence Full Name:",
      fullName
    );
  }

  // ==========================================================
  // DATE OF BIRTH
  // ==========================================================

  const dobIndex =
    lines.findIndex(line => {

      const upper =
        line.toUpperCase();

      return (
        upper.includes("DATE OF BIRTH") ||
        upper.includes("DATEQF BIRTH")
      );
    });

  if (dobIndex !== -1) {

    // First check same line.
    const sameLine =
      parseDate(lines[dobIndex]);

    if (sameLine) {

      dob = sameLine;

    } else {

      const nextLine =
        getNextValidLine(
          lines,
          dobIndex
        );

      dob =
        parseDate(nextLine);
    }

    if (dob) {

      console.log(
        "📅 Driving Licence DOB:",
        dob
      );
    }
  }

  // ==========================================================
  // FALLBACK DOB
  // ==========================================================

  if (!dob) {

    for (const line of lines) {

      const parsed =
        parseDate(line);

      if (parsed) {

        dob = parsed;

        console.log(
          "📅 Driving Licence Fallback DOB:",
          dob
        );

        break;
      }
    }
  }

  // ==========================================================
  // SEX
  // ==========================================================

  const sexIndex =
    lines.findIndex(line =>
      line.toUpperCase().trim() === "SEX"
    );

  if (sexIndex !== -1) {

    const nextLine =
      getNextValidLine(
        lines,
        sexIndex
      );

    sex =
      parseSex(nextLine);

    if (sex) {

      console.log(
        "🚻 Driving Licence Sex:",
        sex
      );
    }
  }

  // ==========================================================
  // FALLBACK SEX
  // ==========================================================

  if (!sex) {

    for (const line of lines) {

      const parsed =
        parseSex(line);

      if (parsed) {

        sex = parsed;

        console.log(
          "🚻 Driving Licence Fallback Sex:",
          sex
        );

        break;
      }
    }
  }

  // ==========================================================
  // NATIONAL ID NUMBER
  //
  // IMPORTANT:
  // We specifically look for NATIONAL ID.
  //
  // We DO NOT use generic ID fallback because a driving
  // licence also contains a licence number.
  // ==========================================================

  const nationalIdIndex =
    lines.findIndex(line => {

      const upper =
        line.toUpperCase();

      return (
        upper.includes("NATIONAL ID NO") ||
        upper.includes("NATIONAL ID NUMBER") ||
        upper.includes("NATIONAL ID")
      );
    });

  if (nationalIdIndex !== -1) {

    // Same line first.
    let match =
      lines[nationalIdIndex]
        .match(/\b\d{7,9}\b/);

    if (match) {

      idNumber = match[0];

    } else {

      const nextLine =
        getNextValidLine(
          lines,
          nationalIdIndex
        );

      match =
        nextLine.match(/\b\d{7,9}\b/);

      if (match) {
        idNumber = match[0];
      }
    }

    if (idNumber) {

      console.log(
        "🪪 Driving Licence National ID:",
        idNumber
      );
    }
  }

  // ==========================================================
  // DRIVING LICENCE NUMBER
  //
  // This is extracted separately.
  //
  // Example:
  // JCA184
  // WLX165
  // DL-OL5SV9AR
  //
  // It is NOT assigned to idNumber.
  // ==========================================================

  const licenceIndex =
    lines.findIndex(line => {

      const upper =
        line.toUpperCase();

      return (
        upper.includes("DRIVING LICENCE NO") ||
        upper.includes("DRIVING LICENSE NO") ||
        upper.includes("LICENCE NO") ||
        upper.includes("LICENSE NO") ||
        upper === "LICENCE NO" ||
        upper === "LICENSE NO"
      );
    });

  if (licenceIndex !== -1) {

    const sameLine =
      extractLicenceNumber(
        lines[licenceIndex]
      );

    if (sameLine) {

      drivingLicenceNumber =
        sameLine;

    } else {

      const nextLine =
        getNextValidLine(
          lines,
          licenceIndex
        );

      drivingLicenceNumber =
        extractLicenceNumber(
          nextLine
        );
    }

    if (drivingLicenceNumber) {

      console.log(
        "🚘 Driving Licence Number Extracted:",
        drivingLicenceNumber
      );
    }
  }

  // ==========================================================
  // IMPORTANT:
  // Driving licence has NO birth district/place field.
  //
  // Therefore district deliberately remains empty.
  // ==========================================================

  district = "";

  // ==========================================================
  // CONFIDENCE
  //
  // Driving licence does NOT receive district points.
  // ==========================================================

  const confidence =
    calculateDrivingLicenceConfidence({
      fullName,
      idNumber,
      dob,
      sex,
    });

  const result = {

    documentType: "DRIVING_LICENCE",

    fullName,
    idNumber,
    dob,
    sex,

    // Deliberately empty.
    district: "",

    // Internal parser result.
    // Phase 2 / backend storage can deliberately ignore this.
    drivingLicenceNumber,

    confidence,
  };

  console.log(
    "✅ Driving Licence Parsed Result:",
    result
  );

  return result;
}


// ============================================================
// DRIVING LICENCE HEADER CHECK
// ============================================================

function isDrivingLicenceHeader(value) {

  const upper =
    String(value || "")
      .toUpperCase();

  const invalidWords = [
    "DRIVING",
    "LICENCE",
    "LICENSE",
    "REPUBLIC",
    "KENYA",
    "JAMHURI",
    "SURNAME",
    "OTHER",
    "NAMES",
    "DATE",
    "BIRTH",
    "SEX",
    "BLOOD",
    "GROUP",
    "NATIONAL",
    "ID",
    "NO",
    "NTSA",
    "ISSUE",
    "RENEWAL",
    "EXPIRY",
  ];

  return invalidWords.some(word =>
    upper === word ||
    upper.includes(word)
  );
}


// ============================================================
// DRIVING LICENCE NUMBER EXTRACTION
// ============================================================

function extractLicenceNumber(value) {

  if (!value) return "";

  const cleaned =
    String(value)
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();

  // Remove label portion.
  const withoutLabel =
    cleaned
      .replace(
        /DRIVING\s+LICEN[CS]E\s+(?:NO|NUMBER)\s*:?\s*/i,
        ""
      )
      .replace(
        /LICEN[CS]E\s+(?:NO|NUMBER)\s*:?\s*/i,
        ""
      )
      .trim();

  // Typical Kenyan licence values contain letters/numbers,
  // sometimes with hyphens.
  const match =
    withoutLabel.match(
      /\b[A-Z0-9]+(?:-[A-Z0-9]+)*\b/
    );

  if (!match) return "";

  return match[0];
}


// ============================================================
// DRIVING LICENCE CONFIDENCE
// ============================================================

function calculateDrivingLicenceConfidence(data) {

  let score = 0;

  if (
    data.fullName &&
    data.fullName.trim().length >= 3
  ) {
    score += 0.35;
  }

  if (
    data.idNumber &&
    /^\d{7,9}$/.test(data.idNumber)
  ) {
    score += 0.30;
  }

  if (
    data.dob &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.dob)
  ) {
    score += 0.20;
  }

  if (
    data.sex === "MALE" ||
    data.sex === "FEMALE"
  ) {
    score += 0.15;
  }

  return Number(
    score.toFixed(2)
  );
}


// ============================================================
// ============================================================
// BIRTH CERTIFICATE PARSER
// ============================================================
// ============================================================

function parseKenyanBirthCertificate(text) {

  console.log(
    "👶 Starting Kenyan Birth Certificate parser..."
  );

  const lines =
    getCleanLines(text);

  let fullName = "";
  let idNumber = "";
  let dob = "";
  let sex = "";
  let district = "";

  // ==========================================================
  // BIRTH CERTIFICATE NAME EXTRACTION
  //
  // We intentionally do NOT use the generic ID fallback
  // because birth certificates contain many names:
  //
  // - Child
  // - Mother
  // - Father
  // - Informant
  // - Registrar
  //
  // The child's name must be extracted from the child-name
  // section before the mother/father fields.
  // ==========================================================

  let childNameIndex = -1;

  // First look for the OCR pattern from the supplied sample:
  //
  // "Tumu tum Hoop Name"
  //
  // More generally, find the first NAME label that appears
  // before Date of Birth and before Mother/Father fields.

  const dobBoundary =
    lines.findIndex(line =>
      line.toUpperCase().includes("DATE OF")
    );

  const searchEnd =
    dobBoundary !== -1
      ? dobBoundary
      : Math.min(lines.length, 20);

  for (
    let i = 0;
    i < searchEnd;
    i++
  ) {

    const upper =
      lines[i].toUpperCase();

    if (
      upper.includes("NAME") &&
      !upper.includes("MOTHER") &&
      !upper.includes("FATHER") &&
      !upper.includes("INFORMANT") &&
      !upper.includes("REGISTERING") &&
      !upper.includes("OFFICER") &&
      !upper.includes("MAIDEN")
    ) {

      childNameIndex = i;
      break;
    }
  }

  if (childNameIndex !== -1) {

    const candidate =
      getNextValidLine(
        lines,
        childNameIndex
      );

    const cleaned =
      cleanName(candidate);

    if (
      cleaned &&
      looksLikePersonName(cleaned)
    ) {

      fullName = cleaned;

      console.log(
        "👶 Birth Certificate Child Name:",
        fullName
      );
    }
  }

  // ==========================================================
  // BACKUP CHILD NAME EXTRACTION
  //
  // If OCR did not preserve the malformed "Name" label,
  // look at the first plausible person name before DOB.
  // ==========================================================

  if (!fullName) {

    for (
      let i = 0;
      i < searchEnd;
      i++
    ) {

      const candidate =
        cleanName(lines[i]);

      if (
        candidate &&
        looksLikePersonName(candidate) &&
        !isBirthCertificateHeader(candidate)
      ) {

        fullName = candidate;

        console.log(
          "👶 Birth Certificate Fallback Child Name:",
          fullName
        );

        break;
      }
    }
  }

  // ==========================================================
  // DATE OF BIRTH
  //
  // Important:
  // The supplied OCR has:
  //
  // Date of
  // Birth
  // 29th Aug. 2006 Sex
  // Fanale
  //
  // Therefore we search the current line AND following lines.
  // ==========================================================

  const birthLabelIndex =
    lines.findIndex(line => {

      const upper =
        line.toUpperCase();

      return (
        upper.includes("DATE OF BIRTH") ||
        upper === "DATE OF" ||
        upper === "BIRTH"
      );
    });

  if (birthLabelIndex !== -1) {

    // Check current line first.
    let parsed =
      parseDate(
        lines[birthLabelIndex]
      );

    if (parsed) {
      dob = parsed;
    }

    // Check several following lines.
    if (!dob) {

      for (
        let i = birthLabelIndex + 1;
        i < Math.min(
          lines.length,
          birthLabelIndex + 5
        );
        i++
      ) {

        parsed =
          parseDate(lines[i]);

        if (parsed) {

          dob = parsed;
          break;
        }
      }
    }

    if (dob) {

      console.log(
        "📅 Birth Certificate DOB:",
        dob
      );
    }
  }

  // ==========================================================
  // FALLBACK DOB
  // ==========================================================

  if (!dob) {

    for (const line of lines) {

      const parsed =
        parseDate(line);

      if (parsed) {

        dob = parsed;

        console.log(
          "📅 Birth Certificate Fallback DOB:",
          dob
        );

        break;
      }
    }
  }

  // ==========================================================
  // SEX
  // ==========================================================

  const sexIndex =
    lines.findIndex(line =>
      line.toUpperCase().trim() === "SEX"
    );

  if (sexIndex !== -1) {

    // Same line first.
    sex =
      parseSex(lines[sexIndex]);

    // Then following lines.
    if (!sex) {

      for (
        let i = sexIndex + 1;
        i < Math.min(
          lines.length,
          sexIndex + 4
        );
        i++
      ) {

        sex =
          parseSex(lines[i]);

        if (sex) break;
      }
    }
  }

  if (sex) {

    console.log(
      "🚻 Birth Certificate Sex:",
      sex
    );
  }

  // ==========================================================
  // FALLBACK SEX
  // ==========================================================

  if (!sex) {

    for (const line of lines) {

      const parsed =
        parseSex(line);

      if (parsed) {

        sex = parsed;

        console.log(
          "🚻 Birth Certificate Fallback Sex:",
          sex
        );

        break;
      }
    }
  }

  // ==========================================================
  // PLACE / DISTRICT OF BIRTH
  //
  // Supplied OCR:
  //
  // Birth in the
  // NYERI CENTRAL
  // District in the
  // CENTRAL
  // Province
  //
  // Therefore the actual birth district is the value
  // immediately after "Birth in the".
  // ==========================================================

  const birthInIndex =
    lines.findIndex(line => {

      const upper =
        line.toUpperCase();

      return (
        upper.includes("BIRTH IN THE") ||
        upper === "BIRTH IN" ||
        upper.includes("BIRTH IN")
      );
    });

  if (birthInIndex !== -1) {

    for (
      let i = birthInIndex + 1;
      i < lines.length;
      i++
    ) {

      const candidate =
        cleanLocation(lines[i]);

      if (!candidate) {
        continue;
      }

      // Stop if OCR moved into another field.
      if (
        candidate.includes("DISTRICT IN") ||
        candidate.includes("PROVINCE") ||
        candidate.includes("ENTRY NO") ||
        candidate.includes("ENTRY") ||
        candidate.includes("DATE OF BIRTH") ||
        candidate.includes("SEX") ||
        candidate.includes("NAME OF")
      ) {
        break;
      }

      district = candidate;

      console.log(
        "📍 Birth Certificate Birth District:",
        district
      );

      break;
    }
  }

  // ==========================================================
  // FALLBACK BIRTH LOCATION
  // ==========================================================

  if (!district) {

    const districtIndex =
      lines.findIndex(line => {

        const upper =
          line.toUpperCase();

        return (
          upper.includes("DISTRICT OF BIRTH") ||
          upper.includes("DISTRICT BIRTH")
        );
      });

    if (districtIndex !== -1) {

      const candidate =
        getNextValidLine(
          lines,
          districtIndex
        );

      const cleaned =
        cleanLocation(candidate);

      if (
        cleaned &&
        !cleaned.includes("PROVINCE")
      ) {

        district = cleaned;

        console.log(
          "📍 Birth Certificate Fallback District:",
          district
        );
      }
    }
  }

  // ==========================================================
  // BIRTH CERTIFICATE DOES NOT USE NATIONAL ID NUMBER
  //
  // We deliberately leave idNumber empty.
  //
  // This prevents Entry No / BIN / other numbers from
  // accidentally becoming the person's National ID.
  // ==========================================================

  idNumber = "";

  // ==========================================================
  // CONFIDENCE
  // ==========================================================

  const confidence =
    calculateBirthCertificateConfidence({
      fullName,
      dob,
      sex,
      district,
    });

  const result = {

    documentType:
      "BIRTH_CERTIFICATE",

    fullName,

    // Deliberately empty.
    idNumber,

    dob,
    sex,
    district,

    confidence,
  };

  console.log(
    "✅ Birth Certificate Parsed Result:",
    result
  );

  return result;
}


// ============================================================
// PERSON NAME VALIDATION
// ============================================================

function looksLikePersonName(value) {

  const cleaned =
    cleanName(value);

  if (!cleaned) return false;

  const words =
    cleaned.split(" ")
      .filter(Boolean);

  if (
    words.length < 2 ||
    words.length > 6
  ) {
    return false;
  }

  const invalidWords = [
    "REPUBLIC",
    "KENYA",
    "CERTIFICATE",
    "BIRTH",
    "DISTRICT",
    "PROVINCE",
    "ENTRY",
    "NUMBER",
    "NAME",
    "DATE",
    "SEX",
    "MALE",
    "FEMALE",
    "MOTHER",
    "FATHER",
    "INFORMANT",
    "REGISTERING",
    "OFFICER",
    "REGISTRAR",
    "CENTRAL",
    "NYERI",
    "NATIONAL",
    "IDENTITY",
  ];

  if (
    invalidWords.some(word =>
      words.includes(word)
    )
  ) {
    return false;
  }

  return words.every(word =>
    /^[A-Z'-]+$/.test(word) &&
    word.length >= 2
  );
}


// ============================================================
// BIRTH CERTIFICATE HEADER CHECK
// ============================================================

function isBirthCertificateHeader(value) {

  const upper =
    String(value || "")
      .toUpperCase();

  const invalid = [
    "REPUBLIC",
    "KENYA",
    "CERTIFICATE",
    "BIRTH",
    "DISTRICT",
    "PROVINCE",
    "ENTRY",
    "NUMBER",
    "DATE",
    "SEX",
    "MALE",
    "FEMALE",
    "MOTHER",
    "FATHER",
    "INFORMANT",
    "REGISTRAR",
    "OFFICER",
    "CENTRAL",
  ];

  return invalid.some(word =>
    upper === word ||
    upper.includes(word)
  );
}


// ============================================================
// BIRTH CERTIFICATE CONFIDENCE
// ============================================================

function calculateBirthCertificateConfidence(data) {

  let score = 0;

  if (
    data.fullName &&
    data.fullName.length >= 3
  ) {
    score += 0.35;
  }

  if (
    data.dob &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.dob)
  ) {
    score += 0.25;
  }

  if (
    data.sex === "MALE" ||
    data.sex === "FEMALE"
  ) {
    score += 0.15;
  }

  if (
    data.district &&
    data.district.length >= 3
  ) {
    score += 0.25;
  }

  return Number(
    score.toFixed(2)
  );
}


// ============================================================
// EXISTING NATIONAL ID CONFIDENCE
// ============================================================

function calculateConfidence(data) {

  let score = 0;

  // Full name confidence

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

  // ID number confidence

  if (
    data.idNumber &&
    /^\d{7,9}$/.test(data.idNumber)
  ) {

    score += 0.30;
  }

  // DOB confidence

  if (
    data.dob &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.dob)
  ) {

    score += 0.20;
  }

  // Sex confidence

  if (
    data.sex === "MALE" ||
    data.sex === "FEMALE"
  ) {

    score += 0.10;
  }

  // District confidence

  if (
    data.district &&
    data.district.length >= 3
  ) {

    score += 0.15;
  }

  return Number(
    score.toFixed(2)
  );
}


// ============================================================
// ============================================================
// DOCUMENT-AWARE PARSER
// ============================================================
// ============================================================
//
// PHASE 2 WILL CHANGE THE OCR ENDPOINT TO CALL THIS FUNCTION:
//
// Google Vision
//      ↓
// rawText
//      ↓
// parseKenyanDocument(rawText)
//      ↓
// structured result
//
// ============================================================


function parseKenyanDocument(text, requestedDocumentType) {
  console.log("📄 Starting Kenyan document-aware parser...");

  // Normalize the document type received from the OCR endpoint.
  const normalizedType = String(requestedDocumentType || "")
    .trim()
    .toLowerCase();

  let documentType;

  // Prefer the requested type when one is provided.
  // Otherwise, detect the type from the OCR text.
  switch (normalizedType) {
    case "national_id":
      documentType = "NATIONAL_ID";
      break;

    case "driving_license":
    case "driving_licence":
      documentType = "DRIVING_LICENCE";
      break;

    case "birth_certificate":
      documentType = "BIRTH_CERTIFICATE";
      break;

    default:
      documentType = detectKenyanDocumentType(text);
      break;
  }

  console.log("🔎 Selected Document Type:", documentType);

  // ----------------------------------------------------------
  // DRIVING LICENCE
  // ----------------------------------------------------------
  if (documentType === "DRIVING_LICENCE") {
    return parseKenyanDrivingLicence(text);
  }

  // ----------------------------------------------------------
  // BIRTH CERTIFICATE
  // ----------------------------------------------------------
  if (documentType === "BIRTH_CERTIFICATE") {
    return parseKenyanBirthCertificate(text);
  }

  // ----------------------------------------------------------
  // NATIONAL ID
  // ----------------------------------------------------------
  console.log("🪪 Using existing Kenyan ID parser...");

  const result = parseKenyanID(text);

  return {
    documentType: "NATIONAL_ID",
    ...result,
  };
}



// ============================================================
// EXPORTS
// ============================================================
//
// parseKenyanID remains exported so existing code that directly
// imports it will continue to work.
//
// parseKenyanDocument is the new Phase 2 entry point.
// ============================================================

module.exports = parseKenyanDocument;

module.exports.parseKenyanDocument =
  parseKenyanDocument;

module.exports.parseKenyanID =
  parseKenyanID;

module.exports.parseKenyanDrivingLicence =
  parseKenyanDrivingLicence;

module.exports.parseKenyanBirthCertificate =
  parseKenyanBirthCertificate;

module.exports.parseDate =
  parseDate;
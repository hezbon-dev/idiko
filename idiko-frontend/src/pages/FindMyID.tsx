// src/pages/FindMyID.tsx

import { useState } from "react";
import { useRecords } from "../context/RecordContext";
import { useNavigate, Link } from "react-router-dom";

// Reuse normalization functions exactly like in RecordContext
function normalizeText(s?: string): string {
  return (s || "").trim().toLowerCase();
}

// ✅ more robust normalizeId: removes spaces, dashes, underscores
function normalizeId(s?: string): string {
  return (s || "").replace(/[\s\-_]/g, "").toLowerCase();
}

// ✅ fully foolproof normalizeDate (separator-agnostic + manual only)
function normalizeDate(dob?: string): string {
  if (!dob) return "";

  dob = dob.trim();

  // remove all spaces
  dob = dob.replace(/\s+/g, "");

  // split by ANY non-digit (/, -, ., etc)
  const parts = dob.split(/\D+/);

  if (parts.length !== 3) {
    console.log("normalizeDate invalid format:", dob); // 🔹 debug
    return "";
  }

  let day: string, month: string, year: string;

  // detect year position automatically
  if (parts[0].length === 4) {
    // YYYY MM DD
    [year, month, day] = parts;
  } else {
    // DD MM YYYY
    [day, month, year] = parts;
  }

  day = day.padStart(2, "0");
  month = month.padStart(2, "0");
  year = year.padStart(4, "0");

  const normalized = `${year}-${month}-${day}`;

  console.log("normalizeDate input:", dob, "=>", normalized); // 🔹 debug

  return normalized;
}

function normalizeSex(value?: string): string {
  const v = (value || "").trim().toLowerCase();
  if (v === "m" || v === "male") return "male";
  if (v === "f" || v === "female") return "female";
  return v;
}

export default function FindMyID() {
  const { records } = useRecords();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    idNumber: "",
    dob: "",
    sex: "",
    district: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSearch = () => {
    if (!formData.fullName || !formData.idNumber || !formData.dob || !formData.sex || !formData.district) {
      setError("⚠️ Please fill in all fields before searching.");
      return;
    }

    setError("");

    // ✅ DEBUG: log normalized input
    console.log("Searching for normalized input:", {
      fullName: normalizeText(formData.fullName),
      idNumber: normalizeId(formData.idNumber),
      dob: normalizeDate(formData.dob),
      sex: normalizeSex(formData.sex),
      district: normalizeText(formData.district),
    });

    // ✅ DEBUG: check each record for mismatches
    records.forEach((rec) => {
      const mismatches = [];
      if (normalizeText(rec.fullName) !== normalizeText(formData.fullName)) mismatches.push("fullName");
      if (normalizeId(rec.idNumber) !== normalizeId(formData.idNumber)) mismatches.push("idNumber");
      if (normalizeDate(rec.dob) !== normalizeDate(formData.dob)) mismatches.push("dob");
      if (normalizeSex(rec.sex) !== normalizeSex(formData.sex)) mismatches.push("sex");
      if (normalizeText(rec.district) !== normalizeText(formData.district)) mismatches.push("district");

      if (mismatches.length) {
        console.log(`Record ${rec.idNumber} mismatches:`, mismatches);
      }
    });

    const found = records.find((rec) =>
      normalizeText(rec.fullName) === normalizeText(formData.fullName) &&
      normalizeId(rec.idNumber) === normalizeId(formData.idNumber) &&
      normalizeDate(rec.dob) === normalizeDate(formData.dob) &&
      normalizeSex(rec.sex) === normalizeSex(formData.sex) &&
      normalizeText(rec.district) === normalizeText(formData.district)
    );

    if (found) {
      if (found.status.toLowerCase() === "paid") {
        navigate(`/claimed/${found.idNumber}`);
      } else {
        navigate(`/payment/${found.idNumber}`);
      }
    } else {
      navigate("/notify-me", { state: { formData } });
    }
  };

  const containerStyle: React.CSSProperties = {
    color: "white",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  };

  const formStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    width: "300px",
    gap: "12px",
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #555",
    backgroundColor: "#222",
    color: "white",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "12px",
    marginTop: "10px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  };

  const backLinkStyle: React.CSSProperties = {
    marginTop: "15px",
    color: "white",
    textDecoration: "none",
    cursor: "pointer",
    textAlign: "center",
  };

  return (
    <div style={containerStyle}>
      <h1></h1>
      <form style={formStyle} onSubmit={(e) => e.preventDefault()}>
        <input type="text" name="fullName" placeholder="Full Names (as in the ID card)" value={formData.fullName} onChange={handleChange} style={inputStyle} />
        <input type="text" name="idNumber" placeholder="ID Number" value={formData.idNumber} onChange={handleChange} style={inputStyle} />
        <input type="text" name="dob" placeholder="Date of Birth (dd/mm/yyyy)" value={formData.dob} onChange={handleChange} style={inputStyle} />
        <select name="sex" value={formData.sex} onChange={handleChange} style={inputStyle}>
          <option value=""> Sex</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        <input type="text" name="district" placeholder="District of Birth" value={formData.district} onChange={handleChange} style={inputStyle} />
        {error && <p style={{ color: "red", fontSize: "14px" }}>{error}</p>}
        <button type="button" onClick={handleSearch} style={buttonStyle}>Search</button>
        <Link to="/" style={backLinkStyle}>&lt; Home</Link>
      </form>
    </div>
  );
}

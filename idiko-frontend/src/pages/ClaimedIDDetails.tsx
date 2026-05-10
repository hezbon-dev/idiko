// src/pages/ClaimedIDDetails.tsx

import { useParams, Link } from "react-router-dom";
import { useState } from "react";

import { useRecords } from "../context/RecordContext";
import { usePickupStations } from "../context/PickupStationContext";

// 🔹 more robust normalizeId helper
function normalizeId(s?: string): string {
  return (s || "").replace(/[\s\-_]/g, "").toLowerCase();
}

// 🔹 more robust normalizeDate helper
function normalizeDate(dob?: string): string {
  if (!dob) return "";
  dob = dob.trim();

  // Try parsing as Date first
  const parsed = new Date(dob);
  if (!isNaN(parsed.getTime())) {
    const normalized = parsed.toISOString().split("T")[0];
    console.log("normalizeDate input:", dob, "=>", normalized); // 🔹 debug
    return normalized;
  }

  // fallback: split manually
  let parts = dob.includes("/") ? dob.split("/") : dob.split("-");
  if (parts.length !== 3) {
    console.log("normalizeDate invalid format:", dob); // 🔹 debug
    return "";
  }

  let day: string, month: string, year: string;

  if (parts[0].length === 4) {
    // YYYY-MM-DD
    [year, month, day] = parts;
  } else {
    // DD/MM/YYYY or D/M/YYYY
    [day, month, year] = parts;
  }

  day = day.padStart(2, "0");
  month = month.padStart(2, "0");
  year = year.padStart(4, "0");

  const normalized = `${year}-${month}-${day}`;
  console.log("normalizeDate input:", dob, "=>", normalized); // 🔹 debug
  return normalized;
}

export default function ClaimedIDDetails() {
  const { idNumber } = useParams<{ idNumber: string }>();

  const { records } = useRecords();
  const { stations } = usePickupStations();

  // 🔹 DEBUG: log all records normalized IDs
  console.log("Normalized input idNumber:", normalizeId(idNumber));
  records.forEach((r) => {
    console.log(
      "Record normalized id:",
      normalizeId(r.idNumber),
      "original id:",
      r.idNumber
    );
  });

  // ✅ Updated to use normalized idNumber for reliable search
  const record = records.find(
    (r) => normalizeId(r.idNumber) === normalizeId(idNumber)
  );

  // 🔹 DEBUG: field-by-field mismatch logging
  if (record) {
    const mismatches = [];

    if (normalizeDate(record.dob) !== normalizeDate(record.dob))
      mismatches.push("dob");

    if (
      record.sex &&
      !["male", "female"].includes(record.sex.toLowerCase())
    )
      mismatches.push("sex");

    if (!record.district || record.district.trim() === "")
      mismatches.push("district");

    if (mismatches.length) {
      console.log(
        `Record ${record.idNumber} field mismatches:`,
        mismatches
      );
    }
  } else {
    console.log("No matching record found for:", normalizeId(idNumber));
  }

  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // safe station lookup
  const station = stations.find(
    (s) =>
      ((s.stationName || s.name || "").trim().toLowerCase()) ===
      ((record?.pickupStation || "").trim().toLowerCase())
  );

  if (!record) {
    return (
      <div
        style={{
          backgroundColor: "black",
          color: "white",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <h2>ID not found</h2>

        <Link to="/" style={{ color: "white", marginTop: "20px" }}>
          &lt; Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        color: "white",
        minHeight: "100vh",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>ID Details</h1>

      {/* Images */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          marginBottom: "30px",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <div
          style={{
            border: "2px dashed gray",
            borderRadius: "10px",
            height: "150px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          <img
            src={record.frontImage}
            alt="Front ID"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onClick={() => setZoomImage(record.frontImage)}
          />
        </div>

        <div
          style={{
            border: "2px dashed gray",
            borderRadius: "10px",
            height: "150px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          <img
            src={record.backImage}
            alt="Back ID"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onClick={() => setZoomImage(record.backImage)}
          />
        </div>
      </div>

      {/* DETAILS */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <label>
          Full Names:
          <input
            type="text"
            value={record.fullName}
            readOnly
            style={inputStyle}
          />
        </label>

        <label>
          ID Number:
          <input
            type="text"
            value={record.idNumber}
            readOnly
            style={inputStyle}
          />
        </label>

        <label>
          Date of Birth:
          <input
            type="text"
            value={record.dob}
            readOnly
            style={inputStyle}
          />
        </label>

        <label>
          Sex:
          <input
            type="text"
            value={record.sex}
            readOnly
            style={inputStyle}
          />
        </label>

        <label>
          District of Birth:
          <input
            type="text"
            value={record.district}
            readOnly
            style={inputStyle}
          />
        </label>

        <label>
          Pickup Station:
          <input
            type="text"
            value={record.pickupStation || ""}
            readOnly
            style={inputStyle}
          />
        </label>

        <label>
          Location:
          <input
            type="text"
            value={station?.location || ""}
            readOnly
            style={inputStyle}
          />
        </label>

        <label>
          Pickup Station Cell:
          <input
            type="text"
            value={station?.phone1 || ""}
            readOnly
            style={inputStyle}
          />
        </label>

        <label>
          Pickup Station Cell:
          <input
            type="text"
            value={station?.phone2 || ""}
            readOnly
            style={inputStyle}
          />
        </label>

        <label>
          Station GPS:
          <a
            href={
              station?.gps
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    station.gps
                  )}`
                : "#"
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              padding: "10px",
              background: "#222",
              borderRadius: "6px",
              color: station?.gps ? "lightblue" : "gray",
              textDecoration: station?.gps ? "underline" : "none",
              cursor: station?.gps ? "pointer" : "default",
            }}
          >
            {station?.gps || "No GPS available"}
          </a>
        </label>
      </div>

      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <Link to="/" style={{ color: "white", textDecoration: "none" }}>
          &lt; Back to Home
        </Link>
      </div>

      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <img
            src={zoomImage}
            alt="Zoomed ID"
            style={{ maxWidth: "90%", maxHeight: "90%" }}
          />
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  background: "#222",
  color: "white",
  border: "1px solid #555",
  borderRadius: "6px",
};
// src/pages/ClaimedIDDetails.tsx
import { useParams, Link } from "react-router-dom";
import { useRecords } from "../context/RecordContext";
import { useState } from "react";

export default function ClaimedIDDetails() {
  const { idNumber } = useParams<{ idNumber?: string }>();
  const { records } = useRecords();
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const record = records.find((r) => r.idNumber === idNumber);

  if (!record) {
    return (
      <div style={containerStyle}>
        <h1>😞 ID not found</h1>
        <p style={{ textAlign: "center", maxWidth: 520 }}>
          We couldn't find an ID with that number. Try searching again or request a notification.
        </p>
        <Link to="/find-my-id" style={simpleLinkStyle}>
          &lt; Back to Find My ID
        </Link>
      </div>
    );
  }

  // pickupStation might be a string or an object in future — handle both
  const pickup =
    typeof record.pickupStation === "string"
      ? { name: record.pickupStation }
      : record.pickupStation || {};

  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: 8 }}>🥳 Good news — we found your ID!</h1>

      {/* Images stacked: Front then Back */}
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 16, marginTop: 18 }}>
        <div style={imageCard} onClick={() => record.frontImage && setZoomImage(record.frontImage)}>
          {record.frontImage ? (
            <img src={record.frontImage} alt="Front ID" style={imagePreview} />
          ) : (
            <div style={imagePlaceholder}>Front Image (not available)</div>
          )}
          <div style={{ marginTop: 8, textAlign: "center" }}>Front of ID</div>
        </div>

        <div style={imageCard} onClick={() => record.backImage && setZoomImage(record.backImage)}>
          {record.backImage ? (
            <img src={record.backImage} alt="Back ID" style={imagePreview} />
          ) : (
            <div style={imagePlaceholder}>Back Image (not available)</div>
          )}
          <div style={{ marginTop: 8, textAlign: "center" }}>Back of ID</div>
        </div>
      </div>

      {/* If not paid - show Pay to Claim button. If already paid, show details immediately */}
      {record.status !== "Paid" ? (
        <Link to={`/payment/${record.idNumber}`} style={payButton}>
          Pay to Claim (KSH 100)
        </Link>
      ) : (
        <div style={{ marginTop: 18, textAlign: "center", color: "#bbb" }}>
          <strong>Status:</strong>{" "}
          <span style={{ marginLeft: 8, color: record.status === "Paid" ? "lightgreen" : "salmon" }}>
            {record.status}
          </span>
        </div>
      )}

      {/* Details (visible after payment OR always if you want) */}
      <div style={{ marginTop: 22, width: "100%", maxWidth: 720 }}>
        <div style={detailsRow}>
          <div style={detailsLabel}>Full Name</div>
          <div style={detailsValue}>{record.fullName}</div>
        </div>
        <div style={detailsRow}>
          <div style={detailsLabel}>ID Number</div>
          <div style={detailsValue}>{record.idNumber}</div>
        </div>
        <div style={detailsRow}>
          <div style={detailsLabel}>Date of Birth</div>
          <div style={detailsValue}>{record.dob}</div>
        </div>
        <div style={detailsRow}>
          <div style={detailsLabel}>Sex</div>
          <div style={detailsValue}>{record.sex}</div>
        </div>
        <div style={detailsRow}>
          <div style={detailsLabel}>District</div>
          <div style={detailsValue}>{record.district}</div>
        </div>
        <div style={detailsRow}>
          <div style={detailsLabel}>Pickup Station</div>
          <div style={detailsValue}>{pickup.name ?? "N/A"}</div>
        </div>
        {/* If pickup has additional structured info (address, phone, gps) show if available */}
        {"address" in pickup && (
          <div style={detailsRow}>
            <div style={detailsLabel}>Address</div>
            <div style={detailsValue}>{(pickup as any).address}</div>
          </div>
        )}
        {"cell" in pickup && (
          <div style={detailsRow}>
            <div style={detailsLabel}>Phone</div>
            <div style={detailsValue}>{(pickup as any).cell}</div>
          </div>
        )}
        {"gps" in pickup && (pickup as any).gps && (
          <div style={detailsRow}>
            <div style={detailsLabel}>GPS</div>
            <div style={detailsValue}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((pickup as any).gps)}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "lightblue", textDecoration: "none" }}
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Back link */}
      <div style={{ marginTop: 20 }}>
        <Link to="/find-my-id" style={simpleLinkStyle}>
          &lt; Back to Find My ID
        </Link>
      </div>

      {/* Zoom modal */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <img src={zoomImage} alt="Zoomed" style={{ maxWidth: "95%", maxHeight: "95%", borderRadius: 10 }} />
        </div>
      )}
    </div>
  );
}

/* Styles */
const containerStyle: React.CSSProperties = {
  backgroundColor: "black",
  color: "white",
  minHeight: "100vh",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const imageCard: React.CSSProperties = {
  backgroundColor: "#111",
  borderRadius: 8,
  padding: 10,
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const imagePreview: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: 300,
  borderRadius: 6,
};

const imagePlaceholder: React.CSSProperties = {
  width: "100%",
  height: 160,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#999",
  backgroundColor: "#222",
  borderRadius: 6,
};

const payButton: React.CSSProperties = {
  marginTop: 16,
  backgroundColor: "green",
  color: "white",
  padding: "12px 20px",
  borderRadius: 8,
  textDecoration: "none",
  display: "inline-block",
  fontWeight: "bold",
};

const simpleLinkStyle: React.CSSProperties = {
  marginTop: 12,
  color: "white",
  textDecoration: "none",
};

const detailsRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid #222",
  alignItems: "center",
  maxWidth: 720,
};

const detailsLabel: React.CSSProperties = {
  width: 160,
  color: "#bbb",
  fontSize: 14,
};

const detailsValue: React.CSSProperties = {
  flex: 1,
  fontSize: 14,
};

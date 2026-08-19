// src/pages/Payment.tsx
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Payment() {
const { idNumber } = useParams();
const navigate = useNavigate();
const [record, setRecord] = useState<any>(null);
const [loading, setLoading] = useState(true);
const [zoomImage, setZoomImage] = useState<string | null>(null);

 useEffect(() => {

  async function loadRecord() {

    try {

      const response =
        await fetch(
          `${import.meta.env.VITE_API_URL}/api/record/${idNumber}`
        );

      const data =
        await response.json();

      if (
        data.success &&
        data.found
      ) {

        setRecord(
          data.record
        );

      }

    } catch (err) {

      console.error(
        "Failed to load record:",
        err
      );

    } finally {

      setLoading(false);

    }

  }

  if (idNumber) {
    loadRecord();
  }

}, [idNumber]);
  const containerStyle: React.CSSProperties = {
    color: "white",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "20px",
  };

  const messageStyle: React.CSSProperties = {
    fontSize: "18px",
    marginBottom: "20px",
    textAlign: "center",
  };

  const imageBoxStyle: React.CSSProperties = {
    width: "300px",
    height: "180px",
    marginBottom: "15px",
    backgroundColor: "#222",
    borderRadius: "8px",
    overflow: "hidden",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "12px",
    marginTop: "15px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    width: "200px",
  };

  const notifyButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#444",
  };

  const backLinkStyle: React.CSSProperties = {
    marginTop: "20px",
    color: "white",
    textDecoration: "underline",
    cursor: "pointer",
    textAlign: "center",
  };

// ✅ SECURE: Redirect to PayToClaim (no unlocking here)
  const handlePayment = () => {
    if (!record) return;

    navigate("/pay-to-claim", {
      state: {
        idNumber: record.idNumber,
        fullName: record.fullName,
        idImages: [record.frontImage, record.backImage].filter(Boolean),
        amount: 1, // or your actual amount
        accountReference: record.idNumber,
      },
    });
  };

if (loading) {

  return (
    <div
      style={{
        color: "white",
        padding: "40px",
        textAlign: "center",
      }}
    >
      Searching...
    </div>
  );

}

  return (
    <div style={containerStyle}>
      {record ? (
        <>
          <p style={messageStyle}>🥳 Good news, we found your ID!</p>

          {/* Front Image */}
          {record.frontImage && (
            <div
              style={imageBoxStyle}
              onClick={() => setZoomImage(record.frontImage!)}
            >
              <img
                src={record.frontImage}
                alt="Front of ID"
                style={imageStyle}
              />
            </div>
          )}

          {/* Back Image */}
          {record.backImage && (
            <div
              style={imageBoxStyle}
              onClick={() => setZoomImage(record.backImage!)}
            >
              <img
                src={record.backImage}
                alt="Back of ID"
                style={imageStyle}
              />
            </div>
          )}

          {/* Pay to Claim */}
          <button style={buttonStyle} onClick={handlePayment}>
            Pay to Claim
          </button>
        </>
      ) : (
        <>
          <p style={messageStyle}>😞 Couldn't find your ID</p>
          <button
            style={notifyButtonStyle}
            onClick={() => navigate("/notify-me")}
          >
            Notify me if found
          </button>
        </>
      )}

      {/* Back link */}
      <Link to="/find-my-id" style={backLinkStyle}>
        &lt; Back to Find My ID
      </Link>

      {/* Fullscreen Zoom Overlay */}
      {zoomImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setZoomImage(null)}
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

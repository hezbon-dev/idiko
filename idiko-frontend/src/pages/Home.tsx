// src/pages/Home.tsx
import { Link } from "react-router-dom";

export default function Home() {

  const buttonStyle: React.CSSProperties = {
    padding: "12px 20px",
    margin: "10px 0",
    backgroundColor: "#444",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    textDecoration: "none",
    display: "block",
    textAlign: "center",
    width: "200px",
  };

  const containerStyle: React.CSSProperties = {
    color: "white",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingBottom: "120px",
    boxSizing: "border-box",
  };

  const inquiryStyle: React.CSSProperties = {
    position: "absolute",
    right: "20px",
    bottom: "20px",
    textAlign: "right",
    fontSize: "14px",
    lineHeight: "1.6",
  };

  const phoneStyle: React.CSSProperties = {
    color: "white",
    textDecoration: "none",
    display: "block",
  };

  return (
    <div style={containerStyle}>

      <h1></h1>

      <Link to="/admin/login" style={buttonStyle}>
        Admin Login
      </Link>

      <Link to="/staff/login" style={buttonStyle}>
        Staff Login
      </Link>

      <Link to="/find-my-id" style={buttonStyle}>
        Search ID
      </Link>

      {/* ID Status Inquiry */}
      <div style={inquiryStyle}>
        <div style={{ fontWeight: "bold" }}>
          For ID status inquiry
        </div>

        <div>
          Call:(Toll Free)
        </div>

        <a
          href="tel:+254798666208"
          style={phoneStyle}
        >
          +254 798 666 208
        </a>

      </div>

    </div>
  );
}
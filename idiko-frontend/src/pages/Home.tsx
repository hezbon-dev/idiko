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
        Find My ID
      </Link>
    </div>
  );
}

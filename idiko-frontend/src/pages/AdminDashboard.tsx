// src/pages/AdminDashboard.tsx
import { Link, useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const containerStyle: React.CSSProperties = {
    color: "white",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "12px 24px",
    margin: "10px",
    backgroundColor: "#333",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    textDecoration: "none",
    textAlign: "center",
    display: "inline-block",
    minWidth: "250px",
  };

  const backStyle: React.CSSProperties = {
    marginTop: "30px",
    color: "white",
    fontSize: "14px",
    cursor: "pointer",
    textDecoration: "none",
  };

  return (
    <div style={containerStyle}>
      <h1></h1>

      {/* ✅ New button for Admin Control Panel */}
      <Link to="/admin/control-panel" style={buttonStyle}>
        Control Panel
      </Link>

      {/* ✅ Existing routes */}
      
      
      <Link to="/admin/manage-ids" style={buttonStyle}>
        Manage IDs
      </Link>
      <Link to="/admin/notify-requests" style={buttonStyle}>
        Notification Requests
      </Link>
      <Link to="/admin/add-pickup-station" style={buttonStyle}>
        Add Pickup Station
      </Link>
      <Link to="/admin/manage-pickup-station" style={buttonStyle}>
        Manage Pickup Station
      </Link>
      <Link to="/admin/id-trash" style={buttonStyle}>
        ID Trash
      </Link>

      {/* Logout */}
      <div>
        <span style={backStyle} onClick={() => navigate("/admin/login")}>
          Logout
        </span>
      </div>
    </div>
  );
}

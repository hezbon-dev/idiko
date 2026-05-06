// src/pages/NotifyRequests.tsx
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useRecords, type NotifyRequestType } from "../context/RecordContext";

export default function NotifyRequests() {
  const { notifyRequests } = useRecords();
  const [requests, setRequests] = useState<NotifyRequestType[]>([]);

  useEffect(() => {
    setRequests(notifyRequests);
  }, [notifyRequests]);

  return (
    <div
      style={{
        color: "white",
        minHeight: "100vh",
        padding: "20px",
        overflow: "auto",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
        
      </h1>

      {/* Table Container */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            color: "white",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#222" }}>
              <th style={cellStyle}>Full Name</th>
              <th style={cellStyle}>ID Number</th>
              <th style={cellStyle}>Date of Birth</th>
              <th style={cellStyle}>Sex</th>
              <th style={cellStyle}>District of Birth</th>
              <th style={cellStyle}>Primary Phone</th>
              <th style={cellStyle}>Secondary Phone</th>
              <th style={cellStyle}>Email</th>
            </tr>
          </thead>

          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "gray",
                  }}
                >
                  No notify requests saved.
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} style={{ borderBottom: "1px solid #333" }}>
                  <td style={cellStyle}>{req.fullName}</td>
                  <td style={cellStyle}>{req.idNumber}</td>
                  <td style={cellStyle}>{req.dob}</td>
                  <td style={cellStyle}>{req.sex}</td>
                  <td style={cellStyle}>{req.district}</td>
                  <td style={cellStyle}>{req.primaryPhone}</td>
                  <td style={cellStyle}>{req.secondaryPhone || "—"}</td>
                  <td style={cellStyle}>{req.email || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Back button */}
      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <Link
          to="/admin/dashboard"
          style={{
            color: "white",
            textDecoration: "none",
            padding: "8px 15px",
            borderRadius: "5px",
          }}
        >
          &lt; Admin Dashboard
        </Link>
      </div>
    </div>
  );
}

// Styling for table cells
const cellStyle: React.CSSProperties = {
  border: "1px solid #333",
  padding: "10px",
  textAlign: "left",
};

// src/pages/NotifyRequests.tsx
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useRecords, type NotifyRequestType } from "../context/RecordContext";

export default function NotifyRequests() {
  const { notifyRequests } = useRecords();
  const [requests, setRequests] = useState<NotifyRequestType[]>([]);
  const [search, setSearch] = useState("");


  useEffect(() => {
    setRequests(notifyRequests);
  }, [notifyRequests]);

const filteredRequests = requests.filter((req) =>
  req.idNumber
    .toLowerCase()
    .includes(search.toLowerCase())
);

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

      {/* Search + Count */}
<div
  style={{
    marginBottom: "20px",
    textAlign: "center",
  }}
>
  <input
    type="text"
    placeholder="Search by ID Number..."
    value={search}
    onChange={(e) =>
      setSearch(e.target.value)
    }
    style={{
      padding: "10px",
      width: "60%",
      maxWidth: "300px",
      borderRadius: "8px",
      border: "1px solid gray",
      marginRight: "10px",
    }}
  />

 <span
  style={{
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: "38px",
    minWidth: "150px",
    textAlign: "center",
    borderRadius: "8px",
    border: "1px solid gray",
    backgroundColor: "black",
    color: "white",
    boxSizing: "border-box",
    verticalAlign: "middle",
  }}
>
  Total: {requests.length}
</span>
</div>

      {/* Table Container */}
      <div style={{ overflowX: "auto" }}>
        <table
  style={{
    width: "100%",
    color: "white",
    borderCollapse: "separate",
    borderSpacing: "0 8px",
  }}
>
         <thead>
  <tr>
    <th style={{ ...cellStyle, fontWeight: "bold" }}>
      Full Name
    </th>

    <th style={{ ...cellStyle, fontWeight: "bold" }}>
      ID Number
    </th>

    <th style={{ ...cellStyle, fontWeight: "bold" }}>
      Date of Birth
    </th>

    <th style={{ ...cellStyle, fontWeight: "bold" }}>
      Sex
    </th>

    <th style={{ ...cellStyle, fontWeight: "bold" }}>
      District of Birth
    </th>

    <th style={{ ...cellStyle, fontWeight: "bold" }}>
      Primary Phone
    </th>

    <th style={{ ...cellStyle, fontWeight: "bold" }}>
      Secondary Phone
    </th>

    <th style={{ ...cellStyle, fontWeight: "bold" }}>
      Email
    </th>
  </tr>
</thead>

          <tbody>
            {filteredRequests.length === 0 ? (
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
              filteredRequests.map((req) => (
                <tr key={req.id}>
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
  padding: "10px",
  textAlign: "left",
};
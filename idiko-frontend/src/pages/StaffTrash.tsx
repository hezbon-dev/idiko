// src/pages/StaffTrash.tsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useRecords } from "../context/RecordContext";
import { useAuth } from "../context/AuthContext";
import { StorageService } from "../Services/StorageService";

export default function StaffTrash() {
  const { trash, restoreRecord } = useRecords();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // 🔒 Prevent login bypass
  useEffect(() => {
    if (!isAuthenticated || user !== "staff") {
      navigate("/staff/login", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Paid" | "Pending">("All");
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // ✅ Staff station tracking
  const [stationKey, setStationKey] = useState<string | null>(null);

  useEffect(() => {
    const loadStation = async () => {
      const s = await StorageService.get("currentStaff");
      if (s?.stationName) {
        setStationKey(s.stationName.trim().toLowerCase());
      }
    };
    loadStation();
  }, []);

  // ✅ Filter visible records for this staff/station only
  const visibleRecords = trash.filter(r =>
    r.pickupStation?.trim().toLowerCase() === stationKey
  );

  // ✅ Count records for visible records only
  const allCount = visibleRecords.length;
  const paidCount = visibleRecords.filter(r => r.status === "Paid").length;
  const pendingCount = visibleRecords.filter(r => r.status === "Pending").length;

  // Filter + search (existing logic)
  const filteredRecords = visibleRecords
    .filter((r) => {
      const matchesSearch =
        r.fullName.toLowerCase().includes(search.toLowerCase()) ||
        r.idNumber.includes(search);

      const matchesFilter = filter === "All" || r.status === filter;

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div
      style={{
        color: "white",
        minHeight: "100vh",
        padding: "20px",
        overflow: "auto",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}></h1>

      {/* Search + Filter */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "10px",
            width: "60%",
            maxWidth: "300px",
            borderRadius: "8px",
            border: "1px solid gray",
            marginRight: "10px",
          }}
        />

        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as "All" | "Paid" | "Pending")
          }
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid gray",
            backgroundColor: "black",
            color: "white",
          }}
        >
          <option value="All">All ({allCount})</option>
          <option value="Paid">Paid ({paidCount})</option>
          <option value="Pending">Pending ({pendingCount})</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            minWidth: "1000px",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr>
              <th style={{ padding: "10px", whiteSpace: "nowrap" }}>Front</th>
              <th style={{ padding: "10px", whiteSpace: "nowrap" }}>Back</th>
              <th style={{ padding: "10px", whiteSpace: "nowrap" }}>Full Name</th>
              <th style={{ padding: "10px", whiteSpace: "nowrap" }}>ID Number</th>
              <th style={{ padding: "10px", whiteSpace: "nowrap" }}>DOB</th>
              <th style={{ padding: "10px", whiteSpace: "nowrap" }}>Sex</th>
              <th style={{ padding: "10px", whiteSpace: "nowrap" }}>District</th>
              <th style={{ padding: "10px", whiteSpace: "nowrap" }}>Pickup Station</th>
              <th style={{ padding: "10px", whiteSpace: "nowrap" }}>Status</th>
              <th style={{ padding: "10px", whiteSpace: "nowrap" }}>Restore</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record.idNumber}>
                {/* Front Image */}
                <td
                  style={{
                    padding: "10px",
                    borderBottom: "1px solid gray",
                    whiteSpace: "nowrap",
                  }}
                >
                  <button
                    onClick={() => setZoomImage(record.frontImage ?? null)}
                    style={{
                      width: "60px",
                      height: "40px",
                      cursor: "pointer",
                      borderRadius: "5px",
                    }}
                  >
                    Front
                  </button>
                </td>

                {/* Back Image */}
                <td
                  style={{
                    padding: "10px",
                    borderBottom: "1px solid gray",
                    whiteSpace: "nowrap",
                  }}
                >
                  <button
                    onClick={() => setZoomImage(record.backImage ?? null)}
                    style={{
                      width: "60px",
                      height: "40px",
                      cursor: "pointer",
                      borderRadius: "5px",
                    }}
                  >
                    Back
                  </button>
                </td>

                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  {record.fullName}
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  {record.idNumber}
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  {record.dob}
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  {record.sex}
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  {record.district}
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  {record.pickupStation}
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: "5px",
                      fontWeight: "bold",
                      backgroundColor: record.status === "Paid" ? "green" : "red",
                    }}
                  >
                    {record.status}
                  </span>
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  <button
                    onClick={() => restoreRecord(record)}
                    style={{
                      backgroundColor: "lightgreen",
                      color: "black",
                      border: "none",
                      borderRadius: "5px",
                      padding: "5px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Back */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <Link
          to="/staff/dashboard"
          style={{
            color: "white",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          &lt; Dashboard
        </Link>
      </div>

      {/* Zoom Modal */}
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

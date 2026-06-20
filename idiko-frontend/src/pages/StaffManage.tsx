// src/pages/StaffManage.tsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useRecords } from "../context/RecordContext";
import { StorageService } from "../Services/StorageService";
export default function StaffManage() {
const { recordsForStaff, moveToTrash } = useRecords();
const navigate = useNavigate();

// 🔒 Prevent login bypass
const [authChecked, setAuthChecked] =
  useState(false);

useEffect(() => {

  const verifyStaff = async () => {

    try {

      const token =
        await StorageService.get(
          "staffToken"
        );

      if (!token) {
        navigate("/staff/login", {
          replace: true,
        });
        return;
      }

      const response = await fetch(
        "https://idiko.onrender.com/staff/verify",
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (!data.success) {
        navigate("/staff/login", {
          replace: true,
        });
        return;
      }

      setAuthChecked(true);

    } catch {

      navigate("/staff/login", {
        replace: true,
      });

    }

  };

  verifyStaff();

}, [navigate]);

const [search, setSearch] = useState("");
const [filter, setFilter] = useState<"All" | "Paid" | "Pending">("All");
const [zoomImage, setZoomImage] = useState<string | null>(null);
const [recordToTrash, setRecordToTrash] = useState<any | null>(null);

// ✅ station tracking (UNCHANGED)
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

  // ✅ hides trashed rows instantly (UI only)
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  // ✅ Visible records only for this staff/station and not hidden
  const visibleRecords = recordsForStaff
    .filter(r => !stationKey || r.pickupStation?.trim().toLowerCase() === stationKey)
    .filter(r => !hiddenIds.includes(r.idNumber));

  // ✅ counts only for visible records
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

if (!authChecked) {
  return <div>Loading...</div>;
}

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
              <th style={{ padding: "10px" }}>Front</th>
              <th style={{ padding: "10px" }}>Back</th>
              <th style={{ padding: "10px" }}>Full Name</th>
              <th style={{ padding: "10px" }}>ID Number</th>
              <th style={{ padding: "10px" }}>DOB</th>
              <th style={{ padding: "10px" }}>Sex</th>
              <th style={{ padding: "10px" }}>District</th>
              <th style={{ padding: "10px" }}>Pickup Station</th>
              <th style={{ padding: "10px" }}>Status</th>
              <th style={{ padding: "10px" }}>Pay</th>
              <th style={{ padding: "10px" }}>Trash</th>
            </tr>
          </thead>

          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record.idNumber}>
                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  <button onClick={() => setZoomImage(record.frontImage ?? null)}>
                    Front
                  </button>
                </td>

                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  <button onClick={() => setZoomImage(record.backImage ?? null)}>
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
      backgroundColor:
        record.status === "Paid" ? "green" : "red",
    }}
  >
    {record.status}
  </span>
</td>

{/* PAY BUTTON CELL */}

<td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
  {record.status === "Pending" && (
    <button
      onClick={() =>
        navigate("/pay-to-claim", {
          state: {
            idNumber: record.idNumber,
            fullName: record.fullName,
            idImages: [
              record.frontImage,
              record.backImage,
            ].filter(Boolean),
            amount: 1,
            accountReference: record.idNumber,
          },
        })
      }
      style={{
        backgroundColor: "green",
        color: "white",
        border: "none",
        borderRadius: "5px",
        padding: "5px 12px",
        cursor: "pointer",
        fontWeight: "bold",
      }}
    >
      Pay
    </button>
  )}
</td>

{/* TRASH CELL */}

<td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
  <button
   onClick={() =>
  setRecordToTrash(record)
} 
                    style={{
                      backgroundColor: "lightgreen",
                      color: "black",
                      border: "none",
                      borderRadius: "5px",
                      padding: "5px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Move to Trash
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

{recordToTrash && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
    }}
  >
    <div
      style={{
        color: "white",
        padding: "20px",
        borderRadius: "10px",
        width: "350px",
        textAlign: "center",
      }}
    >
      <h3>Move ID To Trash</h3>

      <p>
        Are you sure you want to move
        <br />
        <strong>
          {recordToTrash.idNumber}
        </strong>
        <br />
        to Trash?
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginTop: "20px",
        }}
      >
        <button
          onClick={() =>
            setRecordToTrash(null)
          }
        >
          Cancel
        </button>

        <button
          onClick={async () => {
            moveToTrash(
              recordToTrash
            );

            setHiddenIds(prev => [
              ...prev,
              recordToTrash.idNumber,
            ]);

            setRecordToTrash(null);
          }}
        >
          Move to Trash
        </button>
      </div>
    </div>
  </div>
)}


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

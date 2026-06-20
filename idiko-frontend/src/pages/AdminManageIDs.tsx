// src/pages/AdminManageIDs.tsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function AdminManageIDs() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Paid" | "Pending">("All");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [recordToTrash, setRecordToTrash] = useState<any | null>(null);

  // Real-time listener for records from backend
useEffect(() => {

  const loadRecords = async () => {

    try {

      const token =
        localStorage.getItem(
          "idiko_admin_token"
        );

      const response =
        await fetch(
          "https://idiko.onrender.com/admin/records",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json();

      if (data.success) {

        setRecords(
          data.records
        );

      }

      setLoading(false);

    } catch (err) {

      console.error(
        "Failed to load records",
        err
      );

    }

  };

  loadRecords();

  const interval =
    setInterval(
      loadRecords,
      1000
    );

  return () =>
    clearInterval(
      interval
    );

}, []);


  // Move record to trash (update in Firebase)
const moveToTrash = async (
  record: any
) => {

  try {

    const token =
      localStorage.getItem(
        "idiko_admin_token"
      );

    const response =
      await fetch(
        "https://idiko.onrender.com/admin/move-to-trash",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            record,
          }),
        }
      );

    const data =
      await response.json();

    if (!data.success) {

      throw new Error(
        data.error
      );

    }

    setRecords(prev =>
      prev.filter(
        r => r.id !== record.id
      )
    );

  } catch (error) {

    console.error(
      "Error moving to trash:",
      error
    );

  }

};

  // Filter + search
  const filteredRecords = records
    .filter((r) => {
      const matchesSearch =
        r.fullName.toLowerCase().includes(search.toLowerCase()) ||
        r.idNumber.includes(search) ||
        (r.pickupStation ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || r.status === filter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  // ✅ ADDED: counts for filter labels
  const allCount = records.length;
  const paidCount = records.filter(r => r.status === "Paid").length;
  const pendingCount = records.filter(r => r.status === "Pending").length;

if (loading) {

  return (
    <div
      style={{
        color: "white",
        textAlign: "center",
        marginTop: "50px",
      }}
    >
      Loading records...
    </div>
  );

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
          placeholder="Search by name, ID, or pickup station..."
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

                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
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
                  {record.pickupStation ?? "N/A"}
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

              <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
               {String(record.status).toLowerCase() === "pending" && (
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

                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  <button
                    onClick={() =>setRecordToTrash(record)}
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

      {/* Back */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <Link
          to="/admin/dashboard"
          style={{
            color: "white",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          &lt; Admin Dashboard
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
            await moveToTrash(
              recordToTrash
            );

            setRecordToTrash(null);
          }}
        >
          Move to Trash
        </button>
      </div>
    </div>
  </div>
)}
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

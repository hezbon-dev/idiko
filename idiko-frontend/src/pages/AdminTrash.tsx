// src/pages/AdminTrash.tsx
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function AdminTrash() {


  const [trash, setTrash] =useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Paid" | "Pending">("All");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [loading, setLoading] =useState(true);

  // ✅ NEW: bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ✅ FIRST: search only
  const searchedRecords = trash.filter((r) => {
    const term = search.toLowerCase();


   return (
      r.fullName.toLowerCase().includes(term) ||
      r.idNumber.includes(search) ||
      (r.pickupStation ?? "").toLowerCase().includes(term)
    );
  });

  // Filter + search
  const filteredRecords = searchedRecords
    .filter((r) => {
      const matchesFilter = filter === "All" || r.status === filter;
      return matchesFilter;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  // ✅ UPDATED: counts now respect search results
  const allCount = searchedRecords.length;
  const paidCount = searchedRecords.filter(r => r.status === "Paid").length;
  const pendingCount = searchedRecords.filter(r => r.status === "Pending").length;

// Load trash from backend
useEffect(() => {

  const loadTrash = async () => {

    try {

      const token =
        localStorage.getItem(
          "idiko_admin_token"
        );

      const response =
        await fetch(
          "https://idiko.onrender.com/admin/trash",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json();

     if (data.success) {

  setTrash(
    data.trash
  );

}

setLoading(false);

   } catch (err) {

  console.error(
    "Failed to load trash",
    err
  );

  setLoading(false);

}

  };

  loadTrash();

}, []);


const restoreTrashRecord = async (
  record: any
) => {

  try {

    const token =
      localStorage.getItem(
        "idiko_admin_token"
      );

    const response =
      await fetch(
        "https://idiko.onrender.com/admin/trash/restore",
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

    if (data.success) {

      setTrash(prev =>
        prev.filter(
          r =>
            r.idNumber !==
            record.idNumber
        )
      );

    }

  } catch (err) {

    console.error(
      "Restore failed",
      err
    );

  }

};

const deleteTrashRecord = async (
  idNumber: string
) => {

  try {

    const token =
      localStorage.getItem(
        "idiko_admin_token"
      );

    const response =
      await fetch(
        `https://idiko.onrender.com/admin/trash/${idNumber}`,
        {
          method: "DELETE",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    const data =
      await response.json();

    if (data.success) {

      setTrash(prev =>
        prev.filter(
          r =>
            r.idNumber !==
            idNumber
        )
      );

    }

  } catch (err) {

    console.error(
      "Delete failed",
      err
    );

  }

};

  // ✅ NEW: clear selection when filter/search changes
  useEffect(() => {
    setSelectedIds([]);
  }, [search, filter]);

  // ✅ NEW: select all toggle
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredRecords.map(r => r.idNumber));
    } else {
      setSelectedIds([]);
    }
  };

 const handleDeleteSelected =
  async () => {

    for (const id of selectedIds) {

      await deleteTrashRecord(id);

    }

    setSelectedIds([]);

};

if (loading) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
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
      display: "flex",
      justifyContent: "center",
    }}
  >

<div
  style={{
    width: "100%",
    maxWidth: "1400px",
  }}
>
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
      </h1>

      {/* Search + Filter */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <input
          type="text"
          placeholder="Search by pickup station..."
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

      {/* ✅ NEW: bulk actions */}
      <div style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="checkbox"
          checked={
            filteredRecords.length > 0 &&
            selectedIds.length === filteredRecords.length
          }
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
        <button
          onClick={handleDeleteSelected}
          disabled={selectedIds.length === 0}
          style={{
            backgroundColor: "red",
            color: "white",
            border: "none",
            borderRadius: "5px",
            padding: "6px 14px",
            cursor: "pointer",
            opacity: selectedIds.length === 0 ? 0.5 : 1,
          }}
        >
          Delete Selected
        </button>
      </div>

      {/* Table */}
      <div
  style={{
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
  }}
>
<table
  style={{
    minWidth: "1000px",
    width: "max-content",
    borderCollapse: "collapse",
    textAlign: "left",
    margin: "0 auto",
  }}
>
          <thead>
            <tr>
              <th style={{ padding: "10px" }}></th>
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
              <th style={{ padding: "10px", whiteSpace: "nowrap" }}>Delete</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record.idNumber}>
                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(record.idNumber)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(prev => [...prev, record.idNumber]);
                      } else {
                        setSelectedIds(prev => prev.filter(id => id !== record.idNumber));
                      }
                    }}
                  />
                </td>

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
                    onClick={() =>restoreTrashRecord(record)}
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
                <td style={{ padding: "10px", borderBottom: "1px solid gray" }}>
                  <button
                    onClick={() => deleteTrashRecord(record.idNumber)}
                    style={{
                      backgroundColor: "red",
                      color: "white",
                      border: "none",
                      borderRadius: "5px",
                      padding: "5px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
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

    </div>
  );
}

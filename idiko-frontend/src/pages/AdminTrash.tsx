// src/pages/AdminTrash.tsx

import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

type DocumentType =
  | "national_id"
  | "driving_license"
  | "birth_certificate";

type StatusFilter = "All" | "Paid" | "Pending";

export default function AdminTrash() {
  const [trash, setTrash] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [documentType, setDocumentType] =
    useState<DocumentType>("national_id");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Normalize document types and support older National ID records.
  const getDocumentType = (record: any): DocumentType => {
    const type = String(record.documentType || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    if (
      type === "driving_license" ||
      type === "driving_licence" ||
      type === "licence" ||
      type === "license"
    ) {
      return "driving_license";
    }

    if (
      type === "birth_certificate" ||
      type === "birth_cert"
    ) {
      return "birth_certificate";
    }

    // Older records without documentType are treated as National IDs.
    return "national_id";
  };

  // Use a stable record identifier where available.
  // This does not assume every document has an ID number.
  const getRecordKey = (record: any): string => {
    const identifier =
      record.id ??
      record.recordId ??
      record._id ??
      record.idNumber;

    if (identifier !== undefined && identifier !== null) {
      return String(identifier);
    }

    // Fallback for older records that lack a stored identifier.
    return [
      getDocumentType(record),
      record.fullName || "",
      record.dob || "",
      record.pickupStation || "",
      record.createdAt || "",
    ].join("|");
  };

  // Load trash from the existing backend endpoint.
  useEffect(() => {
    const loadTrash = async () => {
      try {
        const token = localStorage.getItem("idiko_admin_token");

        if (!token) {
          console.error("Admin token is missing.");
          setTrash([]);
          return;
        }

        const response = await fetch(
          "https://idiko.onrender.com/admin/trash",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load trash (${response.status})`
          );
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.trash)) {
          setTrash(data.trash);
        } else {
          setTrash([]);
        }
      } catch (err) {
        console.error("Failed to load trash", err);
      } finally {
        setLoading(false);
      }
    };

    loadTrash();
  }, []);

  // First filter by document type.
  const selectedTypeRecords = trash.filter(
    (record) => getDocumentType(record) === documentType
  );

  // Search only within the selected document type.
  const searchedRecords = selectedTypeRecords.filter((record) => {
    const term = search.trim().toLowerCase();

    const matchesName = String(record.fullName || "")
      .toLowerCase()
      .includes(term);

    const matchesId =
      documentType !== "birth_certificate" &&
      String(record.idNumber || "")
        .toLowerCase()
        .includes(term);

    const matchesStation = String(record.pickupStation || "")
      .toLowerCase()
      .includes(term);

    return matchesName || matchesId || matchesStation;
  });

  // Apply payment-status filter after document type and search.
  const filteredRecords = searchedRecords
    .filter((record) => {
      return (filter === "All" ||(record.status || "Pending") === filter);
    })
    .sort((a, b) =>
      String(a.fullName || "").localeCompare(
        String(b.fullName || "")
      )
    );

  // Counts respect the selected document type and search.
  const allCount = searchedRecords.length;

  const paidCount = searchedRecords.filter(
    (record) => record.status === "Paid"
  ).length;

  const pendingCount = searchedRecords.filter(
    (record) => (record.status || "Pending") === "Pending"
  ).length;

  // Clear selection whenever a filter changes.
  useEffect(() => {
    setSelectedIds([]);
  }, [search, filter, documentType]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredRecords.map(getRecordKey));
    } else {
      setSelectedIds([]);
    }
  };

  const restoreTrashRecord = async (record: any) => {
    try {
      const token = localStorage.getItem("idiko_admin_token");

      if (!token) {
        console.error("Admin token is missing.");
        return;
      }

      const response = await fetch(
        "https://idiko.onrender.com/admin/trash/restore",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ record }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Restore failed:", data);
        return;
      }

      const key = getRecordKey(record);

      setTrash((prev) =>
        prev.filter((item) => getRecordKey(item) !== key)
      );

      setSelectedIds((prev) => prev.filter((id) => id !== key));
    } catch (err) {
      console.error("Restore failed", err);
    }
  };

  const deleteTrashRecord = async (record: any) => {
    try {
      const token = localStorage.getItem("idiko_admin_token");

      if (!token) {
        console.error("Admin token is missing.");
        return;
      }

      // Prefer a persistent record ID, especially for documents
      // that do not have an ID number.


const identifier =
  record.id ??
  record.originalRecordKey ??
  record.recordId ??
  record._id ??
  record.idNumber;



      if (
        identifier === undefined ||
        identifier === null ||
        String(identifier).trim() === ""
      ) {
        window.alert(
          "This record has no persistent identifier. It cannot be safely deleted until the backend provides one."
        );
        return;
      }

      const response = await fetch(
        `https://idiko.onrender.com/admin/trash/${encodeURIComponent(
          String(identifier)
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Delete failed:", data);
        window.alert(
          data.message || "Delete failed. The record was not removed."
        );
        return;
      }

      const key = getRecordKey(record);

      setTrash((prev) =>
        prev.filter((item) => getRecordKey(item) !== key)
      );

      setSelectedIds((prev) => prev.filter((id) => id !== key));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleDeleteSelected = async () => {
    const recordsToDelete = filteredRecords.filter((record) =>
      selectedIds.includes(getRecordKey(record))
    );

    for (const record of recordsToDelete) {
      await deleteTrashRecord(record);
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

  const showBackImage = documentType !== "birth_certificate";
  const showIdNumber = documentType !== "birth_certificate";
  const showDistrict = documentType !== "driving_license";

  const cellStyle: React.CSSProperties = {
    padding: "10px",
    borderBottom: "1px solid gray",
  };

  const headerStyle: React.CSSProperties = {
    padding: "10px",
    whiteSpace: "nowrap",
  };

  const allVisibleSelected =
    filteredRecords.length > 0 &&
    filteredRecords.every((record) =>
      selectedIds.includes(getRecordKey(record))
    );

  const documentTypeLabel =
    documentType === "national_id"
      ? "National ID"
      : documentType === "driving_license"
      ? "Driving Licence"
      : "Birth Certificate";

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
        <h1 style={{ textAlign: "center", marginBottom: "20px" }} />

        {/* Search + Document Type + Status Filters */}
        <div
          style={{
            marginBottom: "20px",
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <input
            type="text"
            placeholder={
              documentType === "birth_certificate"
                ? "Search by name or pickup station..."
                : "Search by name, ID or pickup station..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "10px",
              width: "60%",
              maxWidth: "300px",
              borderRadius: "8px",
              border: "1px solid gray",
            }}
          />

          <select
            value={documentType}
            onChange={(e) =>
              setDocumentType(e.target.value as DocumentType)
            }
            aria-label="Filter by document type"
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid gray",
              backgroundColor: "black",
              color: "white",
            }}
          >
            <option value="national_id">National ID</option>
            <option value="driving_license">Driving Licence</option>
            <option value="birth_certificate">Birth Certificate</option>
          </select>

          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as StatusFilter)
            }
            aria-label="Filter by payment status"
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

        {/* Existing bulk actions */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="checkbox"
            aria-label="Select all visible records"
            checked={allVisibleSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />

          <span>
            Select all ({filteredRecords.length})
          </span>

          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            style={{
              backgroundColor: "red",
              color: "white",
              border: "none",
              borderRadius: "5px",
              padding: "6px 14px",
              cursor:
                selectedIds.length === 0 ? "not-allowed" : "pointer",
              opacity: selectedIds.length === 0 ? 0.5 : 1,
            }}
          >
            Delete Selected ({selectedIds.length})
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
                <th style={headerStyle}></th>
                <th style={headerStyle}>Document Type</th>
                <th style={headerStyle}>Front</th>

                {showBackImage && (
                  <th style={headerStyle}>Back</th>
                )}

                <th style={headerStyle}>Full Name</th>

                {showIdNumber && (
                  <th style={headerStyle}>ID Number</th>
                )}

                <th style={headerStyle}>DOB</th>
                <th style={headerStyle}>Sex</th>

                {showDistrict && (
                  <th style={headerStyle}>Place of Birth</th>
                )}

                <th style={headerStyle}>Pickup Station</th>
                <th style={headerStyle}>Status</th>
                <th style={headerStyle}>Restore</th>
                <th style={headerStyle}>Delete</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record) => {
                const recordKey = getRecordKey(record);
                const frontImage = record.frontImage;
                const backImage = record.backImage;

                return (
                  <tr key={recordKey}>
                    <td style={cellStyle}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${record.fullName || "record"}`}
                        checked={selectedIds.includes(recordKey)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds((prev) =>
                              prev.includes(recordKey)
                                ? prev
                                : [...prev, recordKey]
                            );
                          } else {
                            setSelectedIds((prev) =>
                              prev.filter((id) => id !== recordKey)
                            );
                          }
                        }}
                      />
                    </td>

                    <td style={cellStyle}>
                      {getDocumentType(record) === "national_id"
                        ? "National ID"
                        : getDocumentType(record) === "driving_license"
                        ? "Driving Licence"
                        : "Birth Certificate"}
                    </td>

                    <td style={cellStyle}>
                      <button
                        onClick={() =>
                          frontImage && setZoomImage(frontImage)
                        }
                        disabled={!frontImage}
                        style={{
                          width: "60px",
                          height: "40px",
                          cursor: frontImage ? "pointer" : "not-allowed",
                          borderRadius: "5px",
                          opacity: frontImage ? 1 : 0.5,
                        }}
                      >
                        Front
                      </button>
                    </td>

                    {showBackImage && (
                      <td style={cellStyle}>
                        <button
                          onClick={() =>
                            backImage && setZoomImage(backImage)
                          }
                          disabled={!backImage}
                          style={{
                            width: "60px",
                            height: "40px",
                            cursor: backImage ? "pointer" : "not-allowed",
                            borderRadius: "5px",
                            opacity: backImage ? 1 : 0.5,
                          }}
                        >
                          Back
                        </button>
                      </td>
                    )}

                    <td style={cellStyle}>
                      {record.fullName || ""}
                    </td>

                    {showIdNumber && (
                      <td style={cellStyle}>
                        {record.idNumber || ""}
                      </td>
                    )}

                    <td style={cellStyle}>
                      {record.dob || ""}
                    </td>

                    <td style={cellStyle}>
                      {record.sex || ""}
                    </td>

                    {showDistrict && (
                      <td style={cellStyle}>
                        {record.district ||
                          record.placeOfBirth ||
                          ""}
                      </td>
                    )}

                    <td style={cellStyle}>
                      {record.pickupStation || ""}
                    </td>

                    <td style={cellStyle}>
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
                        {record.status || "Pending"}
                      </span>
                    </td>

                    <td style={cellStyle}>
                      <button
                        onClick={() => restoreTrashRecord(record)}
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

                    <td style={cellStyle}>
                      <button
                        onClick={() => deleteTrashRecord(record)}
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
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      10 +
                      (showBackImage ? 1 : 0) +
                      (showIdNumber ? 1 : 0) +
                      (showDistrict ? 1 : 0)
                    }
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#ccc",
                    }}
                  >
                    No {documentTypeLabel.toLowerCase()} records found
                    for this search and status.
                  </td>
                </tr>
              )}
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
              alt="Zoomed document"
              style={{
                maxWidth: "90%",
                maxHeight: "90%",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

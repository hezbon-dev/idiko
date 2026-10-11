
// src/pages/StaffTrash.tsx

import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useRecords } from "../context/RecordContext";
import { StorageService } from "../Services/StorageService";

type DocumentType = "national_id" | "driving_license" | "birth_certificate";
type StatusFilter = "Paid" | "Pending";

export default function StaffTrash() {
  const { trash, restoreRecord } = useRecords();
  const navigate = useNavigate();

  // Prevent login bypass
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const verifyStaff = async () => {
      try {
        const token = await StorageService.get("staffToken");

        if (!token) {
          navigate("/staff/login", { replace: true });
          return;
        }

        const response = await fetch(
          "https://idiko.onrender.com/staff/verify",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!data.success) {
          navigate("/staff/login", { replace: true });
          return;
        }

        setAuthChecked(true);
      } catch {
        navigate("/staff/login", { replace: true });
      }
    };

    verifyStaff();
  }, [navigate]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("Paid");
  const [documentType, setDocumentType] =
    useState<DocumentType>("national_id");
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Staff station tracking
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

  // Normalize document type, including legacy National ID records.
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

  // Only show trashed records belonging to this staff member's station.
  const visibleRecords =
    stationKey === null
      ? []
      : trash.filter(
          (record: any) =>
            record.pickupStation?.trim().toLowerCase() === stationKey
        );

  // Counts for the selected document type and station.
  const selectedTypeRecords = visibleRecords.filter(
    (record: any) => getDocumentType(record) === documentType
  );

  const paidCount = selectedTypeRecords.filter(
    (record: any) => record.status === "Paid"
  ).length;

  const pendingCount = selectedTypeRecords.filter(
    (record: any) => record.status === "Pending"
  ).length;

  // Search and status filtering only apply to the selected document type.
  const filteredRecords = selectedTypeRecords
    .filter((record: any) => {
      const searchTerm = search.trim().toLowerCase();

      const matchesSearch =
        String(record.fullName || "")
          .toLowerCase()
          .includes(searchTerm) ||
        String(record.idNumber || "")
          .toLowerCase()
          .includes(searchTerm);

      const matchesStatus = record.status === filter;

      return matchesSearch && matchesStatus;
    })
    .sort((a: any, b: any) =>
      String(a.fullName || "").localeCompare(String(b.fullName || ""))
    );

  if (!authChecked) {
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
        Loading...
      </div>
    );
  }

  const showBackImage = documentType !== "birth_certificate";
  const showIdNumber = documentType !== "birth_certificate";
  const showDistrict = documentType !== "driving_license";

  const imageButtonStyle: React.CSSProperties = {
    width: "60px",
    height: "40px",
    cursor: "pointer",
    borderRadius: "5px",
  };

  const cellStyle: React.CSSProperties = {
    padding: "10px",
    borderBottom: "1px solid gray",
  };

  const headerStyle: React.CSSProperties = {
    padding: "10px",
    whiteSpace: "nowrap",
  };

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
        <h1 style={{ textAlign: "center", marginBottom: "20px" }}></h1>

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
                ? "Search by name..."
                : "Search by name or ID..."
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
            <option value="Paid">Paid ({paidCount})</option>
            <option value="Pending">Pending ({pendingCount})</option>
          </select>
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
                  <th style={headerStyle}>
                    Place of Birth
                  </th>
                )}

                <th style={headerStyle}>Pickup Station</th>
                <th style={headerStyle}>Status</th>
                <th style={headerStyle}>Restore</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record: any) => (
                <tr
                  key={
                    record.id ||
                    record.recordId ||
                    `${getDocumentType(record)}-${record.idNumber || record.fullName}`
                  }
                >
                  {/* Front Image */}
                  <td
                    style={{
                      ...cellStyle,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <button
                      onClick={() =>
                        record.frontImage &&
                        setZoomImage(record.frontImage)
                      }
                      disabled={!record.frontImage}
                      style={{
                        ...imageButtonStyle,
                        opacity: record.frontImage ? 1 : 0.5,
                      }}
                    >
                      Front
                    </button>
                  </td>

                  {/* Back Image: National ID and Driving Licence only */}
                  {showBackImage && (
                    <td
                      style={{
                        ...cellStyle,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <button
                        onClick={() =>
                          record.backImage &&
                          setZoomImage(record.backImage)
                        }
                        disabled={!record.backImage}
                        style={{
                          ...imageButtonStyle,
                          opacity: record.backImage ? 1 : 0.5,
                        }}
                      >
                        Back
                      </button>
                    </td>
                  )}

                  <td style={cellStyle}>
                    {record.fullName || ""}
                  </td>

                  {/* ID Number: hidden for Birth Certificates */}
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

                  {/* District / Place of Birth: hidden for Driving Licences */}
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

                  {/* Preserve existing restore behavior */}
                  <td style={cellStyle}>
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

              {filteredRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      7 +
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
                    No {documentType === "national_id"
                      ? "National ID"
                      : documentType === "driving_license"
                      ? "driving licence"
                      : "birth certificate"} records found for this status.
                  </td>
                </tr>
              )}
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

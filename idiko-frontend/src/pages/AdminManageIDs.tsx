
// src/pages/AdminManageIDs.tsx

import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

type DocumentType =
  | "national_id"
  | "driving_license"
  | "birth_certificate";

type StatusFilter = "Paid" | "Pending";

export default function AdminManageIDs() {
  const navigate = useNavigate();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Default to National ID documents.
  const [documentType, setDocumentType] =
    useState<DocumentType>("national_id");

  // Default to Pending documents.
  const [filter, setFilter] =
    useState<StatusFilter>("Pending");

  const [zoomImage, setZoomImage] =
    useState<string | null>(null);

  const [recordToTrash, setRecordToTrash] =
    useState<any | null>(null);

  // ---------------------------------
  // LOAD RECORDS
  // ---------------------------------

  // Preserve the existing backend refresh behavior.
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const token = localStorage.getItem(
          "idiko_admin_token"
        );

        const response = await fetch(
          "https://idiko.onrender.com/admin/records",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok && data.success) {
          setRecords(data.records || []);
        } else if (!response.ok) {
          console.error(
            "Failed to load records:",
            data.error || response.statusText
          );
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load records", err);
        setLoading(false);
      }
    };

    loadRecords();

    const interval = setInterval(
      loadRecords,
      10 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  // ---------------------------------
  // DOCUMENT TYPE HELPERS
  // ---------------------------------

  const getDocumentType = (
    record: any
  ): DocumentType => {
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

    // Older records without documentType are National IDs.
    return "national_id";
  };

  const documentTypeLabel = (
    type: DocumentType
  ): string => {
    switch (type) {
      case "driving_license":
        return "Driving Licence";

      case "birth_certificate":
        return "Birth Certificate";

      default:
        return "National ID";
    }
  };

  // Use the actual Firestore document key whenever available.
  // This avoids confusing the holder's National ID number
  // with the driving licence or birth certificate document key.
  const getRecordKey = (record: any): string =>
    String(
      record.id ||
        record.recordId ||
        (getDocumentType(record) === "driving_license"
          ? `driving_license_${String(
              record.idNumber || ""
            ).replace(/\s+/g, "")}`
          : record.idNumber || "")
    );

  // ---------------------------------
  // MOVE RECORD TO TRASH
  // ---------------------------------

  // Preserve the existing endpoint and request structure.
  const moveToTrash = async (record: any) => {
    try {
      const token = localStorage.getItem(
        "idiko_admin_token"
      );

      const response = await fetch(
        "https://idiko.onrender.com/admin/move-to-trash",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            record: {
              ...record,
              id: getRecordKey(record),
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to move record to trash"
        );
      }

      // Remove only the successfully trashed record.
      const trashedKey = getRecordKey(record);

      setRecords((previous) =>
        previous.filter(
          (r) => getRecordKey(r) !== trashedKey
        )
      );
    } catch (error) {
      console.error("Error moving to trash:", error);
    }
  };

  // ---------------------------------
  // DOCUMENT TYPE FILTER + COUNTS
  // ---------------------------------

  // Filter by document type before calculating counts
  // or applying search and status filters.
  const selectedTypeRecords = records.filter(
    (record: any) =>
      getDocumentType(record) === documentType
  );

  // Counts are for the selected document type,
  // independent of the currently selected status.
  const paidCount = selectedTypeRecords.filter(
    (record: any) => record.status === "Paid"
  ).length;

  // Treat records without Paid status as Pending,
  // consistent with the existing upload behavior.
  const pendingCount = selectedTypeRecords.filter(
    (record: any) => record.status !== "Paid"
  ).length;

  // ---------------------------------
  // SEARCH + STATUS FILTER
  // ---------------------------------

  const normalizedSearch = search.trim().toLowerCase();

  const filteredRecords = selectedTypeRecords
    .filter((record: any) => {
      const recordName = String(
        record.fullName || ""
      ).toLowerCase();

      const recordIdNumber = String(
        record.idNumber || ""
      ).toLowerCase();

      const recordPickupStation = String(
        record.pickupStation || ""
      ).toLowerCase();

      // Search only within the selected document type.
      const matchesSearch =
        recordName.includes(normalizedSearch) ||
        recordIdNumber.includes(normalizedSearch) ||
        recordPickupStation.includes(normalizedSearch);

      // Preserve the Paid/Pending filtering behavior.
      const matchesStatus =
        filter === "Paid"
          ? record.status === "Paid"
          : record.status !== "Paid";

      return matchesSearch && matchesStatus;
    })
    .sort((a: any, b: any) =>
      String(a.fullName || "").localeCompare(
        String(b.fullName || "")
      )
    );

  // ---------------------------------
  // LOADING SCREEN
  // ---------------------------------

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

  // ---------------------------------
  // CONDITIONAL TABLE COLUMNS
  // ---------------------------------

  const showBackImage =
    documentType !== "birth_certificate";

  const showIdNumber =
    documentType !== "birth_certificate";

  const showDistrict =
    documentType === "national_id";

  const showPlaceOfBirth =
    documentType === "birth_certificate";

  // ---------------------------------
  // PAGE
  // ---------------------------------

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
        <h1
          style={{
            textAlign: "center",
            marginBottom: "20px",
          }}
        ></h1>

        {/* SEARCH + DOCUMENT TYPE + STATUS */}

        <div
          style={{
            width: "100%",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {/* SEARCH BOX */}

          <input
            type="text"
            placeholder="Search by name, ID, or pickup station..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            style={{
              boxSizing: "border-box",
              padding: "10px",
              width: "300px",
              maxWidth: "100%",
              borderRadius: "8px",
              border: "1px solid gray",
            }}
          />

          {/* DOCUMENT TYPE SELECTOR */}

          <select
            aria-label="Filter by document type"
            value={documentType}
            onChange={(e) => {
              setDocumentType(
                e.target.value as DocumentType
              );
              setSearch("");
            }}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid gray",
              backgroundColor: "black",
              color: "white",
            }}
          >
            <option value="national_id">
              National ID
            </option>

            <option value="driving_license">
              Driving Licence
            </option>

            <option value="birth_certificate">
              Birth Certificate
            </option>
          </select>

          {/* STATUS SELECTOR */}

          <select
            aria-label="Filter by payment status"
            value={filter}
            onChange={(e) =>
              setFilter(
                e.target.value as StatusFilter
              )
            }
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid gray",
              backgroundColor: "black",
              color: "white",
            }}
          >
            <option value="Pending">
              Pending ({pendingCount})
            </option>

            <option value="Paid">
              Paid ({paidCount})
            </option>
          </select>
        </div>

        {/* DOCUMENT TABLE */}

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
                {/* Document Type always appears first */}

                <th style={{ padding: "10px" }}>
                  Document Type
                </th>

                <th style={{ padding: "10px" }}>
                  Front
                </th>

                {showBackImage && (
                  <th style={{ padding: "10px" }}>
                    Back
                  </th>
                )}

                <th style={{ padding: "10px" }}>
                  Full Name
                </th>

                {showIdNumber && (
                  <th style={{ padding: "10px" }}>
                    ID Number
                  </th>
                )}

                <th style={{ padding: "10px" }}>
                  DOB
                </th>

                <th style={{ padding: "10px" }}>
                  Sex
                </th>

                {showDistrict && (
                  <th style={{ padding: "10px" }}>
                    District
                  </th>
                )}

                {showPlaceOfBirth && (
                  <th style={{ padding: "10px" }}>
                    Place of Birth
                  </th>
                )}

                <th style={{ padding: "10px" }}>
                  Pickup Station
                </th>

                <th style={{ padding: "10px" }}>
                  Status
                </th>

                <th style={{ padding: "10px" }}>
                  Pay
                </th>

                <th style={{ padding: "10px" }}>
                  Trash
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record: any) => (
                <tr key={getRecordKey(record)}>
                  {/* DOCUMENT TYPE */}

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {documentTypeLabel(
                      getDocumentType(record)
                    )}
                  </td>

                  {/* FRONT IMAGE */}

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    {record.frontImage ? (
                      <button
                        onClick={() =>
                          setZoomImage(record.frontImage)
                        }
                        style={{
                          width: "60px",
                          height: "40px",
                          cursor: "pointer",
                          borderRadius: "5px",
                        }}
                      >
                        Front
                      </button>
                    ) : (
                      "Unavailable"
                    )}
                  </td>

                  {/* BACK IMAGE: NATIONAL ID + LICENCE */}

                  {showBackImage && (
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid gray",
                      }}
                    >
                      {record.backImage ? (
                        <button
                          onClick={() =>
                            setZoomImage(record.backImage)
                          }
                          style={{
                            width: "60px",
                            height: "40px",
                            cursor: "pointer",
                            borderRadius: "5px",
                          }}
                        >
                          Back
                        </button>
                      ) : (
                        "Unavailable"
                      )}
                    </td>
                  )}

                  {/* FULL NAME */}

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    {record.fullName || ""}
                  </td>

                  {/* HOLDER'S NATIONAL ID NUMBER */}
                  {/* Hidden for birth certificates */}

                  {showIdNumber && (
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid gray",
                      }}
                    >
                      {record.idNumber || ""}
                    </td>
                  )}

                  {/* DATE OF BIRTH */}

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    {record.dob || ""}
                  </td>

                  {/* SEX */}

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    {record.sex || ""}
                  </td>

                  {/* DISTRICT: NATIONAL ID ONLY */}

                  {showDistrict && (
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid gray",
                      }}
                    >
                      {record.district || ""}
                    </td>
                  )}

                  {/* PLACE OF BIRTH: BIRTH CERTIFICATE ONLY */}

                  {showPlaceOfBirth && (
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid gray",
                      }}
                    >
                      {record.placeOfBirth ||
                        record.district ||
                        ""}
                    </td>
                  )}

                  {/* PICKUP STATION */}

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    {record.pickupStation ?? "N/A"}
                  </td>

                  {/* STATUS */}

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: "5px",
                        fontWeight: "bold",
                        backgroundColor:
                          record.status === "Paid"
                            ? "green"
                            : "red",
                      }}
                    >
                      {record.status || "Pending"}
                    </span>
                  </td>

                  {/* PAYMENT: PRESERVE EXISTING NAVIGATION */}

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    {record.status !== "Paid" && (
                      <button
                        onClick={() =>
navigate("/pay-to-claim", {
  state: {
    recordId: getRecordKey(record),
    documentType: getDocumentType(record),
    idNumber: record.idNumber || "",
    fullName: record.fullName,
    idImages: [
      record.frontImage,
      record.backImage,
    ].filter(Boolean),
    amount: 1,
    accountReference: getRecordKey(record),
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

                  {/* EXISTING TRASH INTERFACE */}

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
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

              {/* EMPTY STATE */}

              {filteredRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      8 +
                      (showBackImage ? 1 : 0) +
                      (showIdNumber ? 1 : 0) +
                      (showDistrict ? 1 : 0) +
                      (showPlaceOfBirth ? 1 : 0)
                    }
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#cccccc",
                    }}
                  >
                    No {filter.toLowerCase()}{" "}
                    {documentTypeLabel(
                      documentType
                    ).toLowerCase()}{" "}
                    documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ADMIN DASHBOARD LINK */}

        <div
          style={{
            textAlign: "center",
            marginTop: "20px",
          }}
        >
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

        {/* TRASH CONFIRMATION MODAL */}

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
                maxWidth: "90vw",
                textAlign: "center",
              }}
            >
              <h3>Move Document To Trash</h3>

              <p>
                Are you sure you want to move this{" "}
                {documentTypeLabel(
                  getDocumentType(recordToTrash)
                )}{" "}
                document to Trash?
                <br />

                <strong>
                  {recordToTrash.fullName || ""}
                  {recordToTrash.idNumber
                    ? ` (${recordToTrash.idNumber})`
                    : ""}
                </strong>
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
                    await moveToTrash(recordToTrash);
                    setRecordToTrash(null);
                  }}
                >
                  Move to Trash
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IMAGE ZOOM MODAL */}

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
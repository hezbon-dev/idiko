
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useRecords } from "../context/RecordContext";
import { StorageService } from "../Services/StorageService";

type DocumentType =
  | "national_id"
  | "driving_license"
  | "birth_certificate";

type StatusFilter = "Paid" | "Pending";

export default function StaffManage() {
  const { recordsForStaff, moveToTrash } = useRecords();
  const navigate = useNavigate();

  // ---------------------------------
  // STAFF AUTHENTICATION
  // ---------------------------------

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

        if (!response.ok || !data.success) {
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

  // ---------------------------------
  // FILTERS
  // ---------------------------------

  const [search, setSearch] = useState("");

  // Default to National ID documents.
  const [documentType, setDocumentType] =
    useState<DocumentType>("national_id");

  // Default to Pending documents.
  const [filter, setFilter] =
    useState<StatusFilter>("Pending");

  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [recordToTrash, setRecordToTrash] = useState<any | null>(null);

  // ---------------------------------
  // STAFF STATION FILTER
  // ---------------------------------

  const [stationKey, setStationKey] = useState<string | null>(null);

  useEffect(() => {
    const loadStation = async () => {
      const staff = await StorageService.get("currentStaff");

      if (staff?.stationName) {
        setStationKey(staff.stationName.trim().toLowerCase());
      }
    };

    loadStation();
  }, []);

  // ---------------------------------
  // HIDDEN ROWS AFTER TRASH ACTION
  // ---------------------------------


  // Use the real record key, not idNumber alone.
  // National ID and driving licence records can share idNumber.


const getRecordKey = (record: any): string =>
  String(
    record.id ||
    record.recordId ||
    (
      record.documentType === "driving_license"
        ? `driving_license_${String(record.idNumber || "").replace(/\s+/g, "")}`
        : record.idNumber || ""
    )
  );



  const getDocumentType = (record: any): DocumentType => {
    // Older records without documentType are treated as National IDs.
    if (
      record.documentType === "driving_license" ||
      record.documentType === "birth_certificate"
    ) {
      return record.documentType;
    }

    return "national_id";
  };

  const documentTypeLabel = (type: DocumentType): string => {
    switch (type) {
      case "driving_license":
        return "Driving Licence";
      case "birth_certificate":
        return "Birth Certificate";
      default:
        return "National ID";
    }
  };

  // ---------------------------------
  // STATION-SCOPED RECORDS
  // ---------------------------------

  const stationRecords = recordsForStaff.filter((record: any) => {
    return (
      !stationKey ||
      String(record.pickupStation || "").trim().toLowerCase() ===
        stationKey
    );
  });

  // Apply document type before calculating counts or searching.
  const selectedTypeRecords = stationRecords.filter(
    (record: any) => getDocumentType(record) === documentType
  );

  // Counts cover all records of the selected document type
  // at this station, independent of the current status selection.
  const paidCount = selectedTypeRecords.filter(
    (record: any) => record.status === "Paid"
  ).length;

  const pendingCount = selectedTypeRecords.filter(
    (record: any) => record.status !== "Paid"
  ).length;

  // ---------------------------------
  // SEARCH + STATUS FILTER
  // ---------------------------------

  const normalizedSearch = search.trim().toLowerCase();

  const filteredRecords = selectedTypeRecords
    .filter((record: any) => {
      const recordName = String(record.fullName || "").toLowerCase();
      const recordIdNumber = String(record.idNumber || "").toLowerCase();

      const matchesSearch =
        recordName.includes(normalizedSearch) ||
        recordIdNumber.includes(normalizedSearch);

      // Treat records without a Paid status as Pending,
      // consistent with the upload route's Pending default.
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
  {/* SEARCH BOX — FIRST */}
  <input
    type="text"
    placeholder="Search by name or National ID..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    style={{
      boxSizing: "border-box",
      padding: "10px",
      width: "300px",
      maxWidth: "100%",
      borderRadius: "8px",
      border: "1px solid gray",
    }}
  />

  {/* DOCUMENT TYPE — SECOND */}
  <select
    aria-label="Filter by document type"
    value={documentType}
    onChange={(e) => {
      setDocumentType(e.target.value as DocumentType);
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
    <option value="national_id">National ID</option>
    <option value="driving_license">Driving Licence</option>
    <option value="birth_certificate">Birth Certificate</option>
  </select>

  {/* STATUS — THIRD */}
  <select
    aria-label="Filter by payment status"
    value={filter}
    onChange={(e) =>
      setFilter(e.target.value as StatusFilter)
    }
    style={{
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid gray",
      backgroundColor: "black",
      color: "white",
    }}
  >
    <option value="Pending">Pending ({pendingCount})</option>
    <option value="Paid">Paid ({paidCount})</option>
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
                {/* Document Type is always the first column */}
                <th style={{ padding: "10px" }}>Document Type</th>
                <th style={{ padding: "10px" }}>Front</th>

                {documentType !== "birth_certificate" && (
                  <th style={{ padding: "10px" }}>Back</th>
                )}

                <th style={{ padding: "10px" }}>Full Name</th>

                {documentType !== "birth_certificate" && (
                  <th style={{ padding: "10px" }}>
                    ID Number
                  </th>
                )}

                <th style={{ padding: "10px" }}>DOB</th>
                <th style={{ padding: "10px" }}>Sex</th>

                {documentType === "national_id" && (
                  <th style={{ padding: "10px" }}>District</th>
                )}

                {documentType === "birth_certificate" && (
                  <th style={{ padding: "10px" }}>Place of Birth</th>
                )}

                <th style={{ padding: "10px" }}>Pickup Station</th>
                <th style={{ padding: "10px" }}>Status</th>
                <th style={{ padding: "10px" }}>Pay</th>
                <th style={{ padding: "10px" }}>Trash</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record: any) => (
                <tr key={getRecordKey(record)}>
                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {documentTypeLabel(getDocumentType(record))}
                  </td>

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    {record.frontImage ? (
                      <button
                        onClick={() =>
                          setZoomImage(record.frontImage ?? null)
                        }
                      >
                        Front
                      </button>
                    ) : (
                      "Unavailable"
                    )}
                  </td>

                  {documentType !== "birth_certificate" && (
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid gray",
                      }}
                    >
                      {record.backImage ? (
                        <button
                          onClick={() =>
                            setZoomImage(record.backImage ?? null)
                          }
                        >
                          Back
                        </button>
                      ) : (
                        "Unavailable"
                      )}
                    </td>
                  )}

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    {record.fullName || ""}
                  </td>

                  {documentType !== "birth_certificate" && (
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid gray",
                      }}
                    >
                      {record.idNumber || ""}
                    </td>
                  )}

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    {record.dob || ""}
                  </td>

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    {record.sex || ""}
                  </td>

                  {documentType === "national_id" && (
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid gray",
                      }}
                    >
                      {record.district || ""}
                    </td>
                  )}

                  {documentType === "birth_certificate" && (
                    <td
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid gray",
                      }}
                    >
                      {record.placeOfBirth || record.district || ""}
                    </td>
                  )}

                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid gray",
                    }}
                  >
                    {record.pickupStation || ""}
                  </td>

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
                          record.status === "Paid" ? "green" : "red",
                      }}
                    >
                      {record.status || "Pending"}
                    </span>
                  </td>

                  {/* PAYMENT */}
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
  idNumber: record.idNumber || "",
  fullName: record.fullName,
  idImages: [record.frontImage, record.backImage].filter(Boolean),
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
                      onClick={() => setRecordToTrash(record)}
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

              {filteredRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      documentType === "national_id"
                        ? 12
                        : documentType === "driving_license"
                          ? 11
                          : 10
                    }
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#cccccc",
                    }}
                  >
                    No {filter.toLowerCase()}{" "}
                    {documentTypeLabel(documentType).toLowerCase()}{" "}
                    documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* DASHBOARD LINK */}
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
                <button onClick={() => setRecordToTrash(null)}>
                  Cancel
                </button>

                <button

onClick={async () => {
  try {
    await moveToTrash(recordToTrash);
    setRecordToTrash(null);
  } catch (error) {
    console.error("Move to trash failed:", error);
    alert("Could not move this document to Trash. Please try again.");
  }
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
              cursor: "zoom-out",
            }}
          >
            <img
              src={zoomImage}
              alt="Zoomed document"
              style={{
                maxWidth: "90%",
                maxHeight: "90%",
                objectFit: "contain",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

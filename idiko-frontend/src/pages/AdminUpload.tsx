// src/pages/AdminUpload.tsx
import { Link } from "react-router-dom";
import { useState } from "react";
import { useRecords } from "../context/RecordContext";

export default function AdminUpload() {
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [district, setDistrict] = useState("");
  const [pickupStation, setPickupStation] = useState("");

  const { addRecord } = useRecords(); // ✅ Still uses context

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ Convert yyyy-mm-dd → dd/mm/yyyy
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !frontPreview ||
      !backPreview ||
      !fullName ||
      !idNumber ||
      !dob ||
      !sex ||
      !district ||
      !pickupStation
    ) {
      alert("Please fill in all fields and upload both images.");
      return;
    }

    // ✅ Save record (only appears in AdminManageIDs page)
    addRecord({
      frontImage: frontPreview,
      backImage: backPreview,
      fullName,
      idNumber,
      dob: formatDate(dob),
      sex,
      district,
      pickupStation,
      status: "Pending",
      uploadDate: "",
      stationId: null
    });

    alert("ID saved successfully to Admin Manage IDs.");

    // Reset form
    setFrontPreview(null);
    setBackPreview(null);
    setFullName("");
    setIdNumber("");
    setDob("");
    setSex("");
    setDistrict("");
    setPickupStation("");
  };

  return (
    <div
      style={{
        color: "white",
        minHeight: "100vh",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}></h1>

      {/* Upload slots */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          marginBottom: "30px",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        {/* Front Image */}
        <label
          style={{
            border: "2px dashed gray",
            borderRadius: "10px",
            height: "150px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {frontPreview ? (
            <img
              src={frontPreview}
              alt="Front ID"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onClick={() => setZoomImage(frontPreview)}
            />
          ) : (
            <span style={{ color: "gray" }}>Front Image (Camera)</span>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => handleImageChange(e, setFrontPreview)}
          />
        </label>

        {/* Back Image */}
        <label
          style={{
            border: "2px dashed gray",
            borderRadius: "10px",
            height: "150px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {backPreview ? (
            <img
              src={backPreview}
              alt="Back ID"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onClick={() => setZoomImage(backPreview)}
            />
          ) : (
            <span style={{ color: "gray" }}>Back Image (Camera)</span>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => handleImageChange(e, setBackPreview)}
          />
        </label>
      </div>

      {/* Form fields */}
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "400px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <label>
          Full Names:
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>
        <label>
          ID Number:
          <input
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>
        <label>
          Date of Birth:
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>
        <label>
          Sex:
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          >
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </label>
        <label>
          District of Birth:
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>
        <label>
          Pickup Station:
          <input
            type="text"
            value={pickupStation}
            onChange={(e) => setPickupStation(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>

        {/* Save button */}
        <button
          type="submit"
          style={{
            backgroundColor: "#28a745",
            color: "#fff",
            fontWeight: "bold",
            padding: "12px 24px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            marginBottom: "30px",
            display: "block",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Save & Upload
        </button>
      </form>

      {/* Back button */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
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
  );
}

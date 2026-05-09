// src/pages/StaffUpload.tsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useRecords } from "../context/RecordContext";
import { usePickupStations } from "../context/PickupStationContext";
import { useAuth } from "../context/AuthContext";

export default function StaffUpload() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // 🔒 Prevent login bypass
  useEffect(() => {
    if (!isAuthenticated || user !== "staff") {
      navigate("/staff/login", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // ✅ NEW: store compressed images separately for saving
  const [frontImageCompressed, setFrontImageCompressed] = useState<string | null>(null);
  const [backImageCompressed, setBackImageCompressed] = useState<string | null>(null);

  // OCR loading state
  const [ocrLoading, setOcrLoading] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [district, setDistrict] = useState("");
  const [pickupStation, setPickupStation] = useState("");

  const { addRecord, records } = useRecords();
  const { currentStation } = usePickupStations();

  // ✅ Auto-fill pickup station from logged-in station
  useEffect(() => {
    if (currentStation) {
      setPickupStation(currentStation.stationName);
    }
  }, [currentStation]);

  // OCR function to call backend
  const callOCR = async (imageBase64: string) => {
    try {
      setOcrLoading(true);

      const response = await fetch("https://idiko.onrender.com/api/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageBase64 }),
      });

      const data = await response.json();

      if (data.success) {
        const { fullName, idNumber, dob, sex, district } = data.data;

        // ✅ Auto-fill the form
        setFullName(fullName || "");
        setIdNumber(idNumber || "");
        setDob(dob ? dob.split("/").reverse().join("-") : ""); // convert dd/mm/yyyy → yyyy-mm-dd
        setSex(sex || "");
        setDistrict(district || "");
      } else {
        console.error("OCR failed:", data.error);
      }
    } catch (err) {
      console.error("OCR request error:", err);
    } finally {
      setOcrLoading(false);
    }
  };

  // ✅ NEW: compress image before saving to Firestore
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");

          const maxWidth = 800;
          const scaleSize = maxWidth / img.width;

          canvas.width = maxWidth;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext("2d");

          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.5);

          resolve(compressedBase64);
        };

        img.src = event.target?.result as string;
      };

      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>,
    isFront: boolean
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      // ✅ Compress image first
      const compressedImage = await compressImage(file);

      // ✅ Use compressed image for preview
      setPreview(compressedImage);

      // ✅ Save compressed image separately
      if (isFront) {
        setFrontImageCompressed(compressedImage);

        // ✅ OCR still works
        await callOCR(compressedImage);
      } else {
        setBackImageCompressed(compressedImage);
      }
    }
  };

  // ✅ FIXED: Convert yyyy-mm-dd → dd/mm/yyyy safely (no month/day swap)
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

    const normalizedFullName = fullName.trim().toUpperCase();
    const normalizedIdNumber = idNumber.replace(/\s+/g, "");
    const normalizedDistrict = district.trim().toUpperCase();
    const normalizedSex = sex.trim().toUpperCase();
    const normalizedPickupStation = pickupStation.trim();

    // ✅ PREVENT DUPLICATE ID UPLOAD
    const exists = records.some(
      (r) => r.idNumber.replace(/\s+/g, "") === normalizedIdNumber
    );

    if (exists) {
      alert("ID already exists in the system");
      return;
    }

    addRecord({
      // ✅ Save compressed images instead of huge originals
      frontImage: frontImageCompressed!,
      backImage: backImageCompressed!,
      fullName: normalizedFullName,
      idNumber: normalizedIdNumber,
      dob: formatDate(dob),
      sex: normalizedSex,
      district: normalizedDistrict,
      pickupStation: normalizedPickupStation,
      status: "Pending",
      uploadDate: "",
      stationId: null
    });

    // Reset except pickupStation
    setFrontPreview(null);
    setBackPreview(null);

    // ✅ Reset compressed images too
    setFrontImageCompressed(null);
    setBackImageCompressed(null);

    setFullName("");
    setIdNumber("");
    setDob("");
    setSex("");
    setDistrict("");

    // Keep auto-fill
    if (currentStation) {
      setPickupStation(currentStation.stationName);
    }
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

      {/* OCR loading indicator */}
      {ocrLoading && <p style={{ color: "yellow" }}>Scanning ID...</p>}

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
        {/* Front */}
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
            onChange={(e) => handleImageChange(e, setFrontPreview, true)}
          />
        </label>

        {/* Back */}
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
            onChange={(e) => handleImageChange(e, setBackPreview, false)}
          />
        </label>
      </div>

      {/* Form */}
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
            readOnly
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#222",
              color: "white",
            }}
          />
        </label>

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

      {/* Back */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
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

      {/* Zoom */}
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
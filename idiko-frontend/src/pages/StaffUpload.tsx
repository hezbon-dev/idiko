// src/pages/StaffUpload.tsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
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

  // ✅ Cropper states
  const [rotation, setRotation] = useState(0);

  const [croppingImage, setCroppingImage] = useState<string | null>(null);

  const [showCropper, setShowCropper] = useState(false);

  const [crop, setCrop] = useState<Crop>();

  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

  const [currentImageType, setCurrentImageType] = useState<"front" | "back" | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);

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

        // ✅ Auto-fill the form in lowercase
          setFullName(fullName ? fullName.toLowerCase() : "");
          setIdNumber(idNumber || "");
          setDob(dob ? dob.split("/").reverse().join("-") : "");
          setSex(sex ? sex.toLowerCase() : "");
          setDistrict(district ? district.toLowerCase() : "");
      } else {
        console.error("OCR failed:", data.error);
      }
    } catch (err) {
      console.error("OCR request error:", err);
    } finally {
      setOcrLoading(false);
    }
  };

  // ✅ Create cropped image
  const getCroppedImg = async (): Promise<string | null> => {
    if (!imgRef.current || !completedCrop) return null;

    const image = imgRef.current;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.save();

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      -canvas.width / 2,
      -canvas.height / 2,
      canvas.width,
      canvas.height
    );

    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.8);
  };

  // ✅ Rotate image
  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // ✅ Save cropped image
const handleCropSave = async () => {
  if (!currentImageType) return;

  const croppedImage = await getCroppedImg();

  if (!croppedImage) return;

  // ✅ Close cropper immediately
  setShowCropper(false);
  setCroppingImage(null);

  if (currentImageType === "front") {
    setFrontPreview(croppedImage);
    setFrontImageCompressed(croppedImage);

      // ✅ OCR still works
      await callOCR(croppedImage);
    } else {
      setBackPreview(croppedImage);
      setBackImageCompressed(croppedImage);
    }

    setShowCropper(false);
    setCroppingImage(null);
    setRotation(0);
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    _setPreview: React.Dispatch<React.SetStateAction<string | null>>,
    isFront: boolean
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const image = e.target?.result as string;

        setCroppingImage(image);
        setShowCropper(true);

        setCurrentImageType(isFront ? "front" : "back");
      };

      reader.readAsDataURL(file);
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

      {/* Cropper Modal */}
      {showCropper && croppingImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.95)",
            zIndex: 2000,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              maxWidth: "100%",
              maxHeight: "70vh",
            }}
          >
          <ReactCrop
  crop={crop}
  onChange={(_, percentCrop) => setCrop(percentCrop)}
  onComplete={(c) => setCompletedCrop(c)}
  keepSelection
  ruleOfThirds
>
  <img
    ref={imgRef}
    src={croppingImage}
    alt="Crop"
    style={{
      maxWidth: "100%",
      maxHeight: "70vh",
      transform: `rotate(${rotation}deg)`,
    }}
  />
</ReactCrop>  
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              maxWidth: "400px",
              paddingTop: "20px",
            }}
          >
            <button
              onClick={rotateImage}
              style={{
                backgroundColor: "#444",
                color: "white",
                border: "none",
                borderRadius: "50px",
                padding: "12px 20px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Rotate ({rotation}°)
            </button>

            <button
              onClick={handleCropSave}
              style={{
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "12px 24px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Upload
            </button>
          </div>
        </div>
      )}

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
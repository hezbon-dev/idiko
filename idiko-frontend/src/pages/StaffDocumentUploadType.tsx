// src/pages/StaffDocumentUploadType.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { StorageService } from "../Services/StorageService";

export default function StaffDocumentUploadType() {
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);

  // =========================================================
  // STAFF AUTHENTICATION
  // =========================================================

  useEffect(() => {
    const verifyStaff = async () => {
      try {
        const token = await StorageService.get("staffToken");

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
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!data.success) {
          navigate("/staff/login", {
            replace: true,
          });

          return;
        }

        setAuthChecked(true);
      } catch (error) {
        console.error(
          "Staff authentication check failed:",
          error
        );

        navigate("/staff/login", {
          replace: true,
        });
      }
    };

    verifyStaff();
  }, [navigate]);

  // =========================================================
  // DOCUMENT TYPE SELECTION
  // =========================================================

  const handleDocumentType = (
    documentType:
      | "national_id"
      | "driving_license"
      | "birth_certificate"
  ) => {
    navigate(
      `/staff/upload?documentType=${documentType}`
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

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

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "250px",
          textAlign: "center",
        }}
      >

        {/* =================================================
            NATIONAL ID
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            handleDocumentType("national_id")
          }
          style={{
            width: "100%",
            padding: "15px",
            marginBottom: "15px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          National ID
        </button>

        {/* =================================================
            DRIVING LICENCE
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            handleDocumentType("driving_license")
          }
          style={{
            width: "100%",
            padding: "15px",
            marginBottom: "15px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          Driving Licence
        </button>

        {/* =================================================
            BIRTH CERTIFICATE
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            handleDocumentType("birth_certificate")
          }
          style={{
            width: "100%",
            padding: "15px",
            marginBottom: "25px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          Birth Certificate
        </button>

        {/* =================================================
            BACK TO DASHBOARD
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            navigate("/staff/dashboard")
          }
          style={{
            background: "transparent",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
        Dashboard
        </button>
      </div>
    </div>
  );
}
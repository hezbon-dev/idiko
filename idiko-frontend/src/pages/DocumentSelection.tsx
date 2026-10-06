// src/pages/DocumentSelection.tsx

import { useNavigate } from "react-router-dom";

export default function DocumentSelection() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        color: "white",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        textAlign: "center",
      }}
    >

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          width: "250px",
          maxWidth: "100%",
        }}
      >

        {/* ID */}
        <button
          onClick={() =>
            navigate("/find-my-id", {
              state: {
                documentType: "id",
              },
            })
          }
          style={{
            padding: "15px",
            backgroundColor: "#444",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          ID
        </button>

        {/* Driving Licence */}
        <button
          onClick={() =>
            navigate("/find-my-id", {
              state: {
                documentType: "drivingLicence",
              },
            })
          }
          style={{
            padding: "15px",
            backgroundColor: "#444",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          Driving Licence
        </button>

        {/* Birth Certificate */}
        <button
          onClick={() =>
            navigate("/find-my-id", {
              state: {
                documentType: "birthCertificate",
              },
            })
          }
          style={{
            padding: "15px",
            backgroundColor: "#444",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          Birth Certificate
        </button>

        {/* Back */}
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "10px",
            padding: "10px",
            background: "none",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          &lt; Home
        </button>

      </div>
    </div>
  );
}
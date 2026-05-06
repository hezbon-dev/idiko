// src/pages/AddPickupStation.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { usePickupStations } from "../context/PickupStationContext";

export default function AddPickupStation() {
  const { addStation } = usePickupStations();

  const [stationName, setStationName] = useState("");
  const [stationNumber, setStationNumber] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [gps, setGps] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !stationName ||
      !stationNumber ||
      !password ||
      !location ||
      !gps ||
      !phone1 ||
      !phone2
    ) {
      alert("Please fill in all fields.");
      return;
    }

    // Save to context with unique ID
    addStation({
      id: Date.now().toString(), // unique id
      stationName,
      stationNumber,
      password,
      location,
      gps,
      phone1,
      phone2,
      enabled: true,
      name: ""
    });

    alert("Pickup Station saved successfully.");

    // Reset form
    setStationName("");
    setStationNumber("");
    setPassword("");
    setLocation("");
    setGps("");
    setPhone1("");
    setPhone2("");
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
          Station Name:
          <input
            type="text"
            value={stationName}
            onChange={(e) => setStationName(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Station Number:
          <input
            type="text"
            value={stationNumber}
            onChange={(e) => setStationNumber(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Password:
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Location:
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          GPS Coordinates:
          <input
            type="text"
            value={gps}
            onChange={(e) => setGps(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Office Phone 1:
          <input
            type="text"
            value={phone1}
            onChange={(e) => setPhone1(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>

        <label>
          Office Phone 2:
          <input
            type="text"
            value={phone2}
            onChange={(e) => setPhone2(e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </label>

        <button
          type="submit"
          style={{
            backgroundColor:"#28a745" ,
            color: "#fff",
            fontWeight: "bold",
            padding: "12px 24px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            marginTop: "10px",
            display: "block",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Save Pickup Station
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: "30px" }}>
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
    </div>
  );
}

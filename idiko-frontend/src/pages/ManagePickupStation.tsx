// src/pages/ManagePickupStation.tsx
import React, { useEffect, useState } from "react";
import { usePickupStations, type PickupStation } from "../context/PickupStationContext";
import { useNavigate } from "react-router-dom";
import { StorageService } from "../Services/StorageService";

const ManagePickupStation: React.FC = () => {
  const { stations, setStations, currentStation, setCurrentStation } = usePickupStations();
  const [search, setSearch] = useState("");
  const [editedStations, setEditedStations] = useState<{ [key: string]: Partial<PickupStation> }>({});
  const navigate = useNavigate();

  // Remove dummy station; load stations are already loaded from context
  useEffect(() => {
    const loadStations = async () => {
      const savedStations = await StorageService.get("pickupStations");
      if (savedStations) {
        setStations(savedStations);
      }
    };

    loadStations();
  }, [setStations]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(editedStations).length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editedStations]);

  const unsavedChanges = Object.keys(editedStations).length > 0;

  const handleEditField = (id: string, field: keyof PickupStation, value: string) => {
    setEditedStations((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSaveChanges = async () => {
    let passwordChanged = false;
    let statusChangedToDisabled = false;

    const updatedStations = stations.map((station) => {
      if (editedStations[station.id]) {
        const patch = editedStations[station.id];

        if (patch.password && patch.password !== station.password) {
          passwordChanged = station.id === currentStation?.id;
        }

        if (patch.enabled !== undefined && patch.enabled !== station.enabled && !patch.enabled) {
          statusChangedToDisabled = station.id === currentStation?.id;
        }

        return { ...station, ...patch };
      }
      return station;
    });

    setStations(updatedStations);
    await StorageService.set("pickupStations", updatedStations);
    setEditedStations({});
    alert("Changes saved successfully!");

    if (passwordChanged || statusChangedToDisabled) {
      await incrementFailedAttempts();

      if (statusChangedToDisabled) {
        alert(
          "Your station has been disabled. You are logged out. Failed attempts tracked. Contact Admin after 5 failed attempts."
        );
      } else {
        alert("Your password was changed. You are logged out.");
      }

      logoutCurrentStaff();
    }
  };

  const incrementFailedAttempts = async () => {
    const currentAttempts = Number((await StorageService.get("staffLoginAttempts")) || "0");
    await StorageService.set("staffLoginAttempts", (currentAttempts + 1).toString());
  };

  const logoutCurrentStaff = async () => {
    setCurrentStation(null);
    await StorageService.remove("currentStaff");
    navigate("/staff/login");
  };

  const filteredStations = stations.filter(
    (s) =>
      s.stationName.toLowerCase().includes(search.toLowerCase()) ||
      s.stationNumber.toLowerCase().includes(search.toLowerCase())
  );

  const toggleEnabled = async (id: string) => {
    const updatedStations = stations.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );

    setStations(updatedStations);
    await StorageService.set("pickupStations", updatedStations);

    const station = updatedStations.find((s) => s.id === id);
    if (currentStation && currentStation.id === id && station && !station.enabled) {
      await incrementFailedAttempts();
      logoutCurrentStaff();
    }
  };

  return (
    <div style={{ color: "#fff", minHeight: "100vh", padding: "20px", overflow: "auto" }}>
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}></h1>

      {/* Search Bar */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by name or number..."
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
      </div>

      {/* Save Changes Button */}
      {unsavedChanges && (
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <button
            onClick={handleSaveChanges}
            style={{
              padding: "8px 15px",
              borderRadius: "5px",
              border: "none",
              backgroundColor: "#5cb85c",
              color: "white",
              cursor: "pointer",
            }}
          >
            Save Changes
          </button>
        </div>
      )}

      {/* Stations Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: "900px",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Number</th>
              <th style={thStyle}>Password</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>GPS</th>
              <th style={thStyle}>Phone 1</th>
              <th style={thStyle}>Phone 2</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Toggle</th>
            </tr>
          </thead>
          <tbody>
            {filteredStations.map((station) => (
              <tr key={station.id}>
                <td style={tdStyle}>
                  <input
                    value={editedStations[station.id]?.stationName ?? station.stationName}
                    onChange={(e) => handleEditField(station.id, "stationName", e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    value={editedStations[station.id]?.stationNumber ?? station.stationNumber}
                    onChange={(e) => handleEditField(station.id, "stationNumber", e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    value={editedStations[station.id]?.password ?? station.password}
                    onChange={(e) => handleEditField(station.id, "password", e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    value={editedStations[station.id]?.location ?? station.location}
                    onChange={(e) => handleEditField(station.id, "location", e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    value={editedStations[station.id]?.gps ?? station.gps}
                    onChange={(e) => handleEditField(station.id, "gps", e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    value={editedStations[station.id]?.phone1 ?? station.phone1}
                    onChange={(e) => handleEditField(station.id, "phone1", e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    value={editedStations[station.id]?.phone2 ?? station.phone2}
                    onChange={(e) => handleEditField(station.id, "phone2", e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: "5px",
                      fontWeight: "bold",
                      backgroundColor: station.enabled ? "green" : "red",
                    }}
                  >
                    {station.enabled ? "Enabled" : "Disabled"}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => toggleEnabled(station.id)}
                    style={{
                      backgroundColor: station.enabled ? "#d9534f" : "#5cb85c",
                      color: "#fff",
                      padding: "5px 10px",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    {station.enabled ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
            {filteredStations.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={9}>
                  No stations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Back to Admin Dashboard */}
      <div style={{ marginTop: "30px", textAlign: "center" }}>
        <button
          onClick={() => navigate("/admin/dashboard")}
          style={{
            padding: "8px 15px",
            borderRadius: "5px",
            border: "none",
            color: "white",
            cursor: "pointer",
          }}
        >
          &lt; Admin Dashboard
        </button>
      </div>
    </div>
  );
};

export default ManagePickupStation;

// Styles
const thStyle: React.CSSProperties = { padding: "12px", borderBottom: "1px solid #444", textAlign: "left" };
const tdStyle: React.CSSProperties = { padding: "12px", borderBottom: "1px solid #444" };
const inputStyle: React.CSSProperties = { width: "120px", padding: "4px", borderRadius: "4px", border: "1px solid gray", color: "#fff" };

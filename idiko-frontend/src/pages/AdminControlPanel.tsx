// src/pages/AdminControlPanel.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePickupStations } from "../context/PickupStationContext";
import { useMaintenance } from "../context/MaintenanceContext";


type PeriodOption = "All" | "Custom" | "Yesterday" | "LastMonth" | "LastYear";

export default function AdminControlPanel() {

  const { stations } = usePickupStations();
  const API_URL =import.meta.env.VITE_API_URL ||"https://idiko.onrender.com";

  const totalStations = stations.length;

  const [period, setPeriod] = useState<PeriodOption>("All");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [loading, setLoading] =
  useState(true);

  const [stats, setStats] =
  useState({

    totalUploaded: 0,

    pending: 0,

    paid: 0,

    awaiting: 0,

    matched: 0,

  });

  const { maintenanceMode } = useMaintenance();

const [updatingMaintenance, setUpdatingMaintenance] =
  useState(false);

const toggleMaintenanceMode =
  async () => {

    const action =
      maintenanceMode
        ? "Disable"
        : "Enable";

    const confirmed =
      window.confirm(
        `${action} Maintenance Mode?`
      );

    if (!confirmed) {
      return;
    }

    try {

      setUpdatingMaintenance(
        true
      );

      const token =
        localStorage.getItem(
          "idiko_admin_token"
        );

      const response =
        await fetch(
          `${API_URL}/admin/maintenance-status`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              maintenanceMode:
                !maintenanceMode,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !data.success
      ) {

        alert(
          "Failed to update maintenance mode."
        );

      }

      window.location.reload();

    } catch (error) {

      console.error(
        "Failed to update maintenance mode",
        error
      );

      alert(
        "Failed to update maintenance mode."
      );

    } finally {

      setUpdatingMaintenance(
        false
      );

    }

  };

  // Active staff sessions
  const [activeStaffNames, setActiveStaffNames] = useState<string[]>([]);

  // ✅ REAL-TIME Firestore listener for staffSessions (with 10s expiry filter)
 useEffect(() => {

  const loadActiveStaff =
    async () => {

      try {

        const token =
          localStorage.getItem(
            "idiko_admin_token"
          );

        const response =
          await fetch(
            `${API_URL}/admin/staff-sessions`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (
          data.success
        ) {

          setActiveStaffNames(
            data.active || []
          );

        }

      } catch (err) {

        console.error(
          "Failed to load staff sessions",
          err
        );

      }

    };

  loadActiveStaff();

  const interval =
    setInterval(
      loadActiveStaff,
      1000
    );

  return () =>
    clearInterval(
      interval
    );

}, [API_URL]);

useEffect(() => {

  const loadStats =
    async () => {

      try {

        const token =
          localStorage.getItem(
            "idiko_admin_token"
          );

        const response =
          await fetch(
            `${API_URL}/admin/dashboard-stats`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (data.success) {

          setStats({

            totalUploaded:
              data.totalUploaded,

            pending:
              data.pending,

            paid:
              data.paid,

            awaiting:
              data.awaiting,

            matched:
              data.matched,

          });

        }

      } catch (err) {

        console.error(
          "Failed to load stats",
          err
        );

      } finally {

        setLoading(false);

      }

    };

  loadStats();

  const interval =
    setInterval(
      loadStats,
      1000
    );

  return () =>
    clearInterval(
      interval
    );

}, [API_URL]);

 
if (loading) {

  return (
    <div
      style={{
        color: "white",
        textAlign: "center",
        marginTop: "50px",
      }}
    >
      Loading records...
    </div>
  );

}
   return (
    <div style={{ color: "#fff", minHeight: "100vh", padding: "20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}></h1>

      <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
        <div>
          <label>Period</label>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as PeriodOption)}
            style={{ padding: 8, color: "#fff", borderRadius: 6 }}
          >
            <option value="All">All</option>
            <option value="Custom">Custom</option>
            <option value="Yesterday">Yesterday</option>
            <option value="LastMonth">Last Month</option>
            <option value="LastYear">Last Year</option>
          </select>
        </div>
        {period === "Custom" && (
          <>
            <div>
              <label>From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ padding: 8, color: "#fff", borderRadius: 6 }} />
            </div>
            <div>
              <label>To</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ padding: 8, color: "#fff", borderRadius: 6 }} />
            </div>
          </>
        )}
      </div>

      <section style={{ marginTop: 30 }}>
        <h2>Overview </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          <StatBox label="Stations" value={totalStations} />
          <StatBox label="Uploaded IDs" value={stats.totalUploaded}/>
          <StatBox label="Pending IDs" value={stats.pending}/>
          <StatBox label="Paid IDs" value={stats.paid} />
          <StatBox label="Unmatched Notify Requests" value={stats.awaiting} />
          <StatBox label="Matched Notifications" value={stats.matched} />
        </div>
      </section>

<section style={{ marginTop: 40 }}>
<AlertBox
  title={`Active Staff Sessions (${activeStaffNames.length} / ${totalStations})`}
  items={activeStaffNames}
/>
</section>

<section
  style={{
    marginTop: 50,
    display: "flex",
    justifyContent: "center",
  }}
>
  <button
    onClick={toggleMaintenanceMode}
    disabled={updatingMaintenance}
    style={{
      backgroundColor:
        maintenanceMode
          ? "#cc0000"
          : "#009933",

      color: "white",
      border: "none",
      borderRadius: "6px",

      padding:
        "8px 14px",

      fontSize: "13px",

      cursor: "pointer",
    }}
  >
    Maintenance:
    {" "}
    {maintenanceMode
      ? "ON"
      : "OFF"}
  </button>
</section>

      <div style={{ textAlign: "center", marginTop: 30 }}>
        <Link to="/admin/dashboard" style={{ color: "#fff" }}>
          &lt; Admin Dashboard
        </Link>
      </div>
    </div>
  );
}

const StatBox = ({ label, value }: { label: string; value: number }) => (
  <div style={{ padding: 20, borderRadius: 10, minWidth: 180, textAlign: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.4)" }}>
    <div style={{ fontSize: 28, fontWeight: "bold" }}>{value}</div>
    <div style={{ marginTop: 6 }}>{label}</div>
  </div>
);

const AlertBox = ({ title, items }: { title: string; items: string[] }) => (
  <div style={{ padding: 15, borderRadius: 10, marginBottom: 10 }}>
    <strong>{title}</strong>
    {items.length === 0 ? <div style={{ marginTop: 5 }}>None</div> : <ul style={{ marginTop: 5, paddingLeft: 20 }}>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>}
  </div>
);

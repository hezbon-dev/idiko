// src/pages/AdminControlPanel.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useRecords } from "../context/RecordContext";
import { usePickupStations } from "../context/PickupStationContext";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

type PeriodOption = "All" | "Custom" | "Yesterday" | "LastMonth" | "LastYear";

export default function AdminControlPanel() {
  const { records, allHistoryRecords, notifyRequests: contextNotify } = useRecords();
  const { stations } = usePickupStations();

  const today = new Date();
  const totalStations = stations.length;

  const [period, setPeriod] = useState<PeriodOption>("All");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Active staff sessions
  const [activeStaffNames, setActiveStaffNames] = useState<string[]>([]);

  // ✅ REAL-TIME Firestore listener for staffSessions (with 10s expiry filter)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "staffSessions"), (snapshot) => {
      const now = Date.now();
      const tenSecondsAgo = now - 10000;

      const active = snapshot.docs
        .map((doc) => doc.data())
        .filter((data) => {
          if (!data.lastActive) return false;
          const lastActiveMillis = data.lastActive.toDate().getTime();
          return lastActiveMillis > tenSecondsAgo;
        })
        .map((data) => data.stationName || data.staffId);

      setActiveStaffNames(active);
    });

    return () => unsubscribe();
  }, []);

  const parseDate = (str?: string) => {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  const matchesPeriod = (dateStr?: string) => {
    if (!dateStr) return true;
    const date = parseDate(dateStr);
    if (!date) return true;
    if (period === "All") return true;
    if (period === "Custom") {
      if (!customFrom || !customTo) return true;
      const from = new Date(customFrom);
      const to = new Date(customTo);
      to.setHours(23, 59, 59, 999);
      return date >= from && date <= to;
    }
    if (period === "Yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return date.toDateString() === y.toDateString();
    }
    if (period === "LastMonth") {
      const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      const lastMonthIndex = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
      return date.getFullYear() === lastMonthYear && date.getMonth() === lastMonthIndex;
    }
    if (period === "LastYear") return date.getFullYear() === today.getFullYear() - 1;
    return true;
  };

  const mergedRecords = [...(records || []), ...(allHistoryRecords || [])];

  const uniqueRecords = Array.from(new Map(mergedRecords.map(r => [r.idNumber, r])).values());
  const filtered = uniqueRecords.filter(r => matchesPeriod(r.uploadDate));

  const filteredStats = {
    totalUploaded: filtered.length,
    pending: filtered.filter(r => r.status && r.status === "Pending").length,
    paid: filtered.filter(r => r.status && r.status === "Paid").length,
    awaiting: contextNotify.filter(n => n.matched === false || n.matched === undefined).length,
    matched: contextNotify.filter(n => n.matched && n.matchedDate && matchesPeriod(n.matchedDate)).length,
  };

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
          <StatBox label="Total Stations" value={totalStations} />
          <StatBox label="Total Uploaded IDs" value={filteredStats.totalUploaded} />
          <StatBox label="Total Pending IDs" value={filteredStats.pending} />
          <StatBox label="Total Paid IDs" value={filteredStats.paid} />
          <StatBox label="Unmatched Notify Requests" value={filteredStats.awaiting} />
          <StatBox label="Matched Notifications" value={filteredStats.matched} />
        </div>
      </section>

<section style={{ marginTop: 40 }}>
  <AlertBox 
    title="Active Staff Sessions" 
    items={activeStaffNames} 
  />
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

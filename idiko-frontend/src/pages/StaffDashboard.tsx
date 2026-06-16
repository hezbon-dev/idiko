import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { StorageService } from "../Services/StorageService";

const StaffDashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // 🔒 Prevent login bypass
  useEffect(() => {

  const verifySession = async () => {

    const token =
      await StorageService.get(
        "staffToken"
      );

    if (
      !token ||
      !isAuthenticated ||
      user !== "staff"
    ) {

      navigate(
        "/staff/login",
        { replace: true }
      );

      return;
    }
  };

  verifySession();

}, [
  isAuthenticated,
  user,
  navigate
]);

  // ✅ Heartbeat system (updates every 10 seconds)
  useEffect(() => {
  let interval: ReturnType<typeof setInterval>;

  const startHeartbeat = async () => {
    const staff = await StorageService.get("currentStaff");
    const sessionId = await StorageService.get("sessionId");

    if (!staff || !sessionId) {
      console.error("Missing staff or sessionId");
      return;
    }

    // Initial write (safe merge update)
    await setDoc(
      doc(db, "staffSessions", sessionId),
      {
        sessionId,
        staffId: staff.id,
        stationName: staff.stationName || "",
        lastActive: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    // heartbeat
    interval = setInterval(async () => {
      try {
        await setDoc(
          doc(db, "staffSessions", sessionId),
          {
            lastActive: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    }, 10000);
  };

  startHeartbeat();

  return () => {
    if (interval) clearInterval(interval);
  };
}, []);
  // ✅ Logout now only clears local storage
 const handleLogout = async () => {

  try {

    const token =
      localStorage.getItem("staffToken");

    if (token) {

      await fetch(
        "https://idiko.onrender.com/staff/logout",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

    }

  } catch (err) {

    console.error(
      "Logout request failed:",
      err
    );

  }

  await StorageService.remove("currentStaff");
  await StorageService.remove("sessionId");

  localStorage.removeItem("staffToken");
};

  return (
    <div
      style={{
        color: "white",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <h1 style={{ marginBottom: "30px" }}></h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          width: "250px",
        }}
      >
        <Link to="/staff/upload" style={buttonStyle}>
          Upload New ID
        </Link>

        <Link to="/staff/manage" style={buttonStyle}>
          Manage IDs
        </Link>

        <Link to="/staff/trash" style={buttonStyle}>
          Trash
        </Link>
      </div>

      <Link
        to="/staff/login"
        onClick={handleLogout}
        style={{
          marginTop: "30px",
          color: "white",
          textDecoration: "none",
          fontSize: "14px",
        }}
      >
        Logout
      </Link>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  display: "block",
  padding: "12px",
  textAlign: "center",
  backgroundColor: "#333",
  color: "white",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  border: "1px solid #555",
};

export default StaffDashboard;
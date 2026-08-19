import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePickupStations } from "../context/PickupStationContext";
import { useAuth } from "../context/AuthContext";
import { StorageService } from "../Services/StorageService";

export default function StaffLogin() {
  const { setCurrentStation } = usePickupStations();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginAttempts, setLoginAttempts] = useState<number>(0);

  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    const loadAttempts = async () => {
      const attempts = await StorageService.get("staffLoginAttempts");
      if (attempts) setLoginAttempts(Number(attempts));
    };
    loadAttempts();
  }, []);

  useEffect(() => {
    StorageService.set("staffLoginAttempts", loginAttempts.toString());
  }, [loginAttempts]);

  const incrementFailedAttempts = async () => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    await StorageService.set("staffLoginAttempts", newAttempts.toString());
    return newAttempts;
  };

  const resetFailedAttempts = async () => {
    setLoginAttempts(0);
    await StorageService.set("staffLoginAttempts", "0");
  };

  const handleLogin = async () => {
    const stationName = username.trim().toLowerCase();
    const pwd = password.trim();

    if (!stationName || !pwd) {
      setError("Please enter both station name and password.");
      return;
    }

    let station = null;

try {

  const response = await fetch(
    "https://idiko.onrender.com/staff/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stationName,
        password: pwd,
      }),
    }
  );

  const data = await response.json();

  if (!data.success) {

    const attempts =
      await incrementFailedAttempts();

    if (attempts >= MAX_ATTEMPTS) {
      setError(
        "Too many failed attempts. Contact Admin."
      );
    } else {
      setError(
        `${data.error}. Attempts left: ${
          MAX_ATTEMPTS - attempts
        }`
      );
    }

    return;
  }

  station = data.station;

  await StorageService.set(
  "staffToken",
  data.token
);

} catch (err) {

  console.error(err);

  setError(
    "Unable to reach login server."
  );

  return;
}

    await resetFailedAttempts();
    setCurrentStation(station);
    await StorageService.set("currentStaff", station);

// ✅ CREATE UNIQUE SESSION ID 
const sessionId = `${station.id}_${Date.now()}`;

// store locally (used everywhere else)
await StorageService.set("sessionId", sessionId);
await StorageService.set("currentStaff", station);

// ✅ END SESSION CREATION

    login("staff");

    navigate("/staff/dashboard");
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
      <h1></h1>

      <input
        type="text"
        placeholder="Station Name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={inputStyle}
      />

      {error && (
        <p style={{ color: "red", marginTop: "5px" }}>{error}</p>
      )}

      <p style={{ marginTop: "5px", fontSize: "14px", color: "#ccc" }}>
        {" "}
      </p>

      <button
        style={buttonStyle}
        onClick={handleLogin}
        disabled={loginAttempts >= MAX_ATTEMPTS}
      >
        Login
      </button>

      <Link to="/" style={backButtonStyle}>
        &lt; Home
      </Link>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "250px",
  padding: "10px",
  margin: "10px 0",
  borderRadius: "6px",
  border: "1px solid gray",
  backgroundColor: "#222",
  color: "white",
};

const buttonStyle: React.CSSProperties = {
  width: "200px",
  padding: "10px",
  margin: "10px 0",
  backgroundColor: "#28a745",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "16px",
};

const backButtonStyle: React.CSSProperties = {
  color: "white",
  textDecoration: "none",
  fontSize: "14px",
  margin: "10px 0",
  cursor: "pointer",
};

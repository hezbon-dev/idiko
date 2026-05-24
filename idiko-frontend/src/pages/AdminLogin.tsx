import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function AdminLogin() {
  


  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

// =========================
// ✅ OTP STATE
// =========================
const [otpRequired, setOtpRequired] = useState(false);
const [otp, setOtp] = useState("");
const [pendingUsername, setPendingUsername] = useState("");

// =========================
// ⏳ OTP COUNTDOWN
// =========================

const [otpCountdown, setOtpCountdown] = useState(60);

  const containerStyle: React.CSSProperties = {
    color: "white",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 100px",
    marginTop: "20px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px",
    marginTop: "10px",
    width: "260px",
    borderRadius: "6px",
    border: "1px solid #555",
    backgroundColor: "#111",
    color: "white",
  };

// =========================
// ⏳ OTP COUNTDOWN EFFECT
// =========================

useEffect(() => {

  if (!otpRequired) return;

  // =========================
  // ⏰ OTP EXPIRED
  // =========================

  if (otpCountdown <= 0) {

    console.log("⌛ OTP expired");

    setOtpRequired(false);

    setOtp("");

    setPendingUsername("");

    setPassword("");

    setError(
      "OTP expired. Please login again."
    );

    return;
  }

  const timer = setInterval(() => {

    setOtpCountdown((prev) => prev - 1);

  }, 1000);

  return () => clearInterval(timer);

}, [otpRequired, otpCountdown]);

  const handleLogin = async () => {

  setError("");

  try {

    console.log("🔐 Starting admin login...");

    
    const res = await axios.post(
  `${import.meta.env.VITE_API_URL}/admin/login`,
  {
    username,
    password,
  }
);

    console.log("✅ Backend Response:", res.data);

    if (!res.data.success) {

      setError("Invalid username or password");

      return;
    }

//=========================
// ✅ OTP REQUIRED
// =========================

if (res.data.otpRequired) {

  console.log("🔐 OTP required");

  setOtpRequired(true);

setPendingUsername(res.data.username);

// =========================
// ⏳ RESET OTP TIMER
// =========================

setOtpCountdown(60);

return;

}

  } catch (err: any) {

    console.error("❌ Login Error:", err);

    setError(
      err?.response?.data?.error ||
      "Login failed"
    );
  }
};

// =========================
// ✅ VERIFY OTP
// =========================

const handleVerifyOTP = async () => {

  setError("");

  try {

    console.log("🔐 Verifying OTP...");

    const res = await axios.post(
  `${import.meta.env.VITE_API_URL}/admin/verify-otp`,
  {
    username: pendingUsername,
    otp,
  }
);

console.log("✅ OTP Verify Response:", res.data);

// =========================
// ✅ STORE JWT TOKEN
// =========================

localStorage.setItem(
  "idiko_admin_token",
  res.data.token
);

// =========================
// ✅ UPDATE AUTH CONTEXT
// =========================

login("admin");

// =========================
// ✅ NAVIGATE TO DASHBOARD
// =========================

navigate("/admin/dashboard");

  } catch (err: any) {

    console.error("❌ OTP Verification Error:", err);

  const backendError =
  err?.response?.data?.error ||
  "OTP verification failed";

setError(backendError);

// =========================
// 🚨 TOO MANY OTP ATTEMPTS
// =========================

if (
  backendError.includes(
    "Too many invalid OTP attempts"
  )
) {

  setOtpRequired(false);

  setOtp("");

  setPendingUsername("");

  setPassword("");
}  
  }
};

  return (
    <div style={containerStyle}>
      <h1></h1>

     {!otpRequired && (

  <input
    type="text"
    placeholder="Username"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    style={inputStyle}
  />

)}

  {!otpRequired && (

  <input
    type="password"
    placeholder="Password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    style={inputStyle}
  />

)}   

{/*=========================
✅ OTP INPUT
=========================*/}

{otpRequired && (

  <input
    type="text"
    placeholder="Enter OTP"
    value={otp}
    onChange={(e) => setOtp(e.target.value)}
    style={inputStyle}
  />

)}

      {error && (
        <div style={{ color: "red", marginTop: "10px", fontSize: "14px" }}>
          {error}
        </div>
      )}

{/*=========================
✅ OTP MESSAGE
=========================*/}

{otpRequired && (

  <div
    style={{
      color: "#00ff99",
      marginTop: "10px",
      fontSize: "14px",
      textAlign: "center",
    }}
  >
    OTP sent to your admin email

    <div
      style={{
        marginTop: "8px",
        color: "#ffaa00",
      }}
    >
      OTP expires in:
      {" "}
      00:
      {otpCountdown < 10
        ? `0${otpCountdown}`
        : otpCountdown}
    </div>

  </div>

)}

{/*=========================
✅ LOGIN BUTTON
=========================*/}

{!otpRequired && (

  <button
    style={buttonStyle}
    onClick={handleLogin}
  >
    Login
  </button>

)}

{/*=========================
✅ VERIFY OTP BUTTON
=========================*/}

{otpRequired && (

  <button
  style={buttonStyle}
  onClick={handleVerifyOTP}
>
  Verify OTP
</button>

)}

      <div style={{ marginTop: "20px" }}>
        <Link
          to="/"
          style={{
            color: "white",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          &lt; Home
        </Link>
      </div>
    </div>
  );
}
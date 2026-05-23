import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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

  const handleLogin = async () => {

  setError("");

  try {

    console.log("🔐 Starting admin login...");

    console.log(
  "🌍 API URL:",
  import.meta.env.VITE_API_URL
);
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

    // ✅ TEMPORARY DIRECT LOGIN
    // OTP comes next phase

    login("admin");

    navigate("/admin/dashboard");

  } catch (err: any) {

    console.error("❌ Login Error:", err);

    setError(
      err?.response?.data?.error ||
      "Login failed"
    );
  }
};

  return (
    <div style={containerStyle}>
      <h1></h1>

      <input
        type="text"
        placeholder="Username"
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
        <div style={{ color: "red", marginTop: "10px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <button style={buttonStyle} onClick={handleLogin}>
        Login
      </button>

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
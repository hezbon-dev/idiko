import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import registerBiometric from "../utils/registerBiometric";
import verifyBiometric from "../utils/verifyBiometric";

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

  const [otpArray, setOtpArray] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const otp =
    otpArray.join("");

  const otpInputs =
    useRef<(HTMLInputElement | null)[]>([]);

  const [pendingUsername, setPendingUsername] =
    useState("");

  // =========================
  // ⏳ OTP COUNTDOWN
  // =========================

  const [otpCountdown, setOtpCountdown] =
    useState(30);

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
  // ✅ OTP BOX STYLE
  // =========================

  const otpBoxStyle: React.CSSProperties = {
    width: "45px",
    height: "55px",
    margin: "5px",
    textAlign: "center",
    fontSize: "24px",
    borderRadius: "10px",
    border: "2px solid #444",
    backgroundColor: "#111",
    color: "white",
    outline: "none",
  };

  // =========================
  // ⏳ OTP COUNTDOWN EFFECT
  // =========================

  useEffect(() => {

    if (!otpRequired) return;

    if (otpCountdown <= 0) {

      console.log("⌛ OTP expired");

      setOtpRequired(false);

      setOtpArray([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

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

  // =========================
  // ✅ AUTO VERIFY OTP
  // =========================

  useEffect(() => {

    if (otp.length === 6) {

      handleVerifyOTP();

    }

  }, [otp]);

  // =========================
  // ✅ HANDLE OTP INPUT
  // =========================

  const handleOtpChange = (
    value: string,
    index: number
  ) => {

    if (!/^\d*$/.test(value)) return;

    const updatedOtp =
      [...otpArray];

    // =========================
    // ✅ HANDLE PASTE
    // =========================

    if (value.length > 1) {

      const pastedOtp =
        value.slice(0, 6).split("");

      for (
        let i = 0;
        i < 6;
        i++
      ) {

        updatedOtp[i] =
          pastedOtp[i] || "";

      }

      setOtpArray(updatedOtp);

      return;
    }

    updatedOtp[index] = value;

    setOtpArray(updatedOtp);

    // =========================
    // ✅ AUTO MOVE
    // =========================

    if (
      value &&
      index < 5
    ) {

      otpInputs.current[
        index + 1
      ]?.focus();
    }
  };

  // =========================
  // ✅ BACKSPACE SUPPORT
  // =========================

  const handleOtpKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {

    if (
      e.key === "Backspace" &&
      !otpArray[index] &&
      index > 0
    ) {

      otpInputs.current[
        index - 1
      ]?.focus();
    }
  };

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

      console.log(
        "✅ Backend Response:",
        res.data
      );

      if (!res.data.success) {

        setError(
          "Invalid username or password"
        );

        return;
      }

      // =========================
      // ✅ OTP REQUIRED
      // =========================

      if (res.data.otpRequired) {

        console.log(
          "🔐 OTP required"
        );

        setOtpRequired(true);

        setPendingUsername(
          res.data.username
        );

        setOtpCountdown(30);

        return;
      }

    } catch (err: any) {

      console.error(
        "❌ Login Error:",
        err
      );

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

      console.log(
        "🔐 Verifying OTP..."
      );

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/verify-otp`,
        {
          username: pendingUsername,
          otp,
        }
      );

      console.log(
        "✅ OTP Verify Response:",
        res.data
      );

      localStorage.setItem(
        "idiko_admin_token",
        res.data.token
      );

      login("admin");

      // =========================
      // ✅ BIOMETRIC REGISTRATION
      // =========================

      const alreadyEnabled =
        localStorage.getItem(
          "biometricEnabled"
        );

      if (!alreadyEnabled) {

        console.log(
          "🟢 Registering trusted biometric device..."
        );

        const biometricResult =
          await registerBiometric(
            pendingUsername
          );

        if (
          biometricResult.success
        ) {

          console.log(
            "✅ Biometric registration completed"
          );

        } else {

          console.log(
            "⚠️ Biometric skipped:",
            biometricResult.error
          );
        }
      }

      // =========================
      // ✅ VERIFY BIOMETRIC
      // =========================

      const biometricCheck =
        await verifyBiometric();

      if (
        biometricCheck.success
      ) {

        console.log(
          "✅ Fingerprint verified"
        );

        navigate(
          "/admin/dashboard"
        );

        return;
      }

      if (
        biometricCheck.skipped
      ) {

        console.log(
          "🟡 Non-trusted device — skipping biometric"
        );

        navigate(
          "/admin/dashboard"
        );

        return;
      }

      setError(
        biometricCheck.error ||
        "Fingerprint verification failed"
      );

      console.log(
        "❌ Biometric verification failed"
      );

    } catch (err: any) {

      console.error(
        "❌ OTP Verification Error:",
        err
      );

      const backendError =
        err?.response?.data?.error ||
        "OTP verification failed";

      setError(
        backendError
      );

      if (
        backendError.includes(
          "Too many invalid OTP attempts"
        )
      ) {

        setOtpRequired(false);

        setOtpArray([
          "",
          "",
          "",
          "",
          "",
          "",
        ]);

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
          onChange={(e) =>
            setUsername(
              e.target.value
            )
          }
          style={inputStyle}
        />

      )}

      {!otpRequired && (

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
          style={inputStyle}
        />

      )}

      {/*=========================
      ✅ OTP BOXES
      =========================*/}

      {otpRequired && (

        <div
          style={{
            display: "flex",
            marginTop: "20px",
          }}
        >

          {otpArray.map(
            (
              digit,
              index
            ) => (

              <input
                key={index}
              ref={(el) => {
                otpInputs.current[index] = el;
            }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) =>
                  handleOtpChange(
                    e.target.value,
                    index
                  )
                }
                onKeyDown={(e) =>
                  handleOtpKeyDown(
                    e,
                    index
                  )
                }
                style={otpBoxStyle}
              />

            )
          )}

        </div>

      )}

      {error && (
        <div
          style={{
            color: "red",
            marginTop: "10px",
            fontSize: "14px",
          }}
        >
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

      <div
        style={{
          marginTop: "20px",
        }}
      >
        <Link
          to="/"
          style={{
            color: "white",
            textDecoration:
              "none",
            fontSize: "14px",
          }}
        >
          &lt; Home
        </Link>
      </div>
    </div>
  );
}
// src/pages/PayToClaim.tsx

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useRecords } from "../context/RecordContext";

interface PayToClaimProps {}

export default function PayToClaim({}: PayToClaimProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { markRecordPaidLocally } = useRecords();



  const state = location.state as {
    recordId: string;
    idNumber: string;
    fullName: string;
    idImages: string[];
    amount: number;
    accountReference: string;
  };


  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentUnresolved, setPaymentUnresolved] = useState(false);
  
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const isCheckingStatusRef = useRef(false);

useEffect(() => {
  return () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  };
}, []);


  if (!state) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <h2>No ID info provided</h2>
      </div>
    );
  }


const handlePay = async () => {
  if (paymentUnresolved) {
    setMessage(
      "Your previous payment is still being checked. Please do not start another payment."
    );
    return;
  }

  if (!phone.trim() || !/^(254|0)\d{9}$/.test(phone.trim())) {
    setMessage("Please enter a valid M-Pesa phone number.");
    return;
  }

  const formattedPhone = phone.trim().startsWith("0")
    ? `254${phone.trim().substring(1)}`
    : phone.trim();

  const recordId = state.recordId;

  if (!recordId) {
    setMessage("The claim reference is missing. Please return and try again.");
    return;
  }

  if (pollIntervalRef.current) {
    clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = null;
  }

  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }

  setLoading(true);
  setMessage("Sending payment request to your phone...");

  let checkoutRequestID = "";

  try {
    const response = await axios.post(
      "https://idiko.onrender.com/mpesa/stkpush",
      {
        phone: formattedPhone,
        amount: state.amount,
        accountReference: recordId,
        description: "ID claim payment",
      }
    );

    checkoutRequestID =
      response.data?.data?.CheckoutRequestID ||
      response.data?.CheckoutRequestID ||
      "";

    if (!checkoutRequestID) {
      // The server response is not enough to prove that Safaricom
      // did not receive the request. Keep retry blocked.
      setPaymentUnresolved(true);
      setLoading(false);
      setMessage(
        "We could not confirm the checkout reference. Do not pay again yet. Please contact support to check your payment."
      );
      return;
    }

    setPaymentUnresolved(true);
    setMessage(
      "Payment request sent. Please complete the M-Pesa prompt on your phone."
    );

const checkPaymentStatus = async (): Promise<boolean> => {
  // Prevent overlapping status requests.
  if (isCheckingStatusRef.current) {
    return false;
  }

  isCheckingStatusRef.current = true;

  try {
    const statusResponse = await axios.get(
      `https://idiko.onrender.com/mpesa/status/${encodeURIComponent(
        checkoutRequestID
      )}`
    );

    const status = String(
      statusResponse.data?.status || "unknown"
    ).toLowerCase();

    if (status === "paid") {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setLoading(false);
      setPaymentUnresolved(true);
      setMessage("Payment confirmed. Opening your claim...");

      markRecordPaidLocally(recordId);

      navigationTimeoutRef.current = setTimeout(() => {
        navigate(`/claimed/${recordId}`);
      }, 1000);

      return true;
    }

    if (status === "failed") {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setLoading(false);
      setPaymentUnresolved(false);
      setMessage(
        "The payment was declined or cancelled. You can try again."
      );

      return true;
    }

    // Pending, unknown, or any non-terminal status:
    // keep retry blocked and continue checking.
    return false;
  } catch (error) {
    // A status-check network error is not proof of payment failure.
    console.error("Payment status check failed:", error);
    return false;
  } finally {
    isCheckingStatusRef.current = false;
  }
};

// Check immediately before creating any timers.
// If payment is already paid or failed, do not start polling.
const isTerminal = await checkPaymentStatus();

if (!isTerminal) {
  pollIntervalRef.current = setInterval(() => {
    void checkPaymentStatus();
  }, 5000);

  timeoutRef.current = setTimeout(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    timeoutRef.current = null;
    setLoading(false);

    // Intentionally keep paymentUnresolved true.
    // A frontend timeout is not a confirmed payment failure.
    setMessage(
      "Payment is taking longer than expected. Do not initiate another payment. Please contact support to check the existing payment before retrying."
    );
  }, 60000);
}

  } catch (error: any) {
    console.error("Payment initiation error:", error);

    setLoading(false);

    if (checkoutRequestID) {
      // The checkout exists; keep retry blocked until its status is definitive.
      setPaymentUnresolved(true);
      setMessage(
        "We could not confirm the payment status. Please do not pay again while we check the existing request."
      );
    } else if (
      error?.response?.status === 400 &&
      error?.response?.data?.status === "error"
    ) {
      // Only show a validation message here. Other errors may be ambiguous.
      setMessage(
        error?.response?.data?.message ||
          "The payment request could not be validated."
      );
    } else {
      // A network error or server error could occur after Safaricom
      // received the request, so do not assume it failed.
      setPaymentUnresolved(true);
      setMessage(
        "We could not confirm whether the payment request was received. Do not try again yet. Please check with support before making another payment."
      );
    }
  }
};


return (
  <div
    style={{
      padding: 20,
      color: "#fff",
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
    }}
  >
<div
  style={{
    width: "100%",
    maxWidth: "700px",
  }}
>

      <h2 style={{ textAlign: "center", marginBottom: 20 }}>
        Pay to Claim Your ID
      </h2>

      <div
  style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  }}
>
        {state.idImages.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`ID Pic ${idx + 1}`}
            style={{ maxWidth: 300, borderRadius: 10, border: "2px solid #fff" }}
          />
        ))}
      </div>

      <div
  style={{
    marginTop: 30,
    maxWidth: 400,
    width: "100%",
    marginLeft: "auto",
    marginRight: "auto",
  }}
>
        <div style={{ marginBottom: 15 }}>
          <label>Amount (KES)</label>
          <input
            type="number"
            value={state.amount}
            readOnly
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 6,
              background: "#111",
              color: "#fff",
              border: "1px solid #333",
            }}
          />
        </div>

        <div style={{ marginBottom: 15 }}>
          <label>Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07"
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 6,
              background: "#111",
              color: "#fff",
              border: "1px solid #333",
            }}
          />
        </div>

        {message && (
          <div
            style={{
              marginBottom: 15,
              color: message.startsWith("✅") ? "lime" : "red",
            }}
          >
            {message}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading || paymentUnresolved}
          style={{
            width: "100%",
            padding: 6,
            background: "green",
            color: "#fff",
            fontWeight: "bold",
            borderRadius: 20,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          {loading ? "Processing..." : "Pay"}
        </button>

        <Link
          to="/"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 15,
            color: "#fff",
          }}
        >
          &lt; Home
        </Link>
      </div>

    </div>

  </div>

  );
}
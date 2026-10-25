
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useRecords } from "../context/RecordContext";

interface PayToClaimProps {}

interface PaymentPageState {
  recordId?: string;
  idNumber?: string;
  fullName?: string;
  idImages?: string[];
  amount?: number;
  accountReference?: string;
  documentType?: string;
}

export default function PayToClaim({}: PayToClaimProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { markRecordPaidLocally } = useRecords();

  const state = location.state as PaymentPageState | null;

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();

      if (redirectRef.current) {
        clearTimeout(redirectRef.current);
      }
    };
  }, []);

  if (!state) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <h2>No claim information provided</h2>
      </div>
    );
  }

  // recordId is the Firestore document ID.
  // accountReference remains as a fallback for older navigation callers.
  const recordId = String(
    state.recordId || state.accountReference || ""
  ).trim();

  const amount = state.amount ?? 1;
  const idImages = state.idImages ?? [];

  const handlePay = async () => {
    if (loading) {
      return;
    }

    if (!recordId) {
      setMessage(
        "❌ Claim information is missing. Please return to the previous page and select the record again."
      );
      return;
    }

    if (!phone.trim()) {
      setMessage("📌 Please enter your phone number");
      return;
    }

    const cleanPhone = phone.replace(/[\s-]/g, "");
    let formattedPhone = cleanPhone;

    if (/^0[17]\d{8}$/.test(cleanPhone)) {
      formattedPhone = `254${cleanPhone.slice(1)}`;
    } else if (/^254[17]\d{8}$/.test(cleanPhone)) {
      formattedPhone = cleanPhone;
    } else if (/^\+254[17]\d{8}$/.test(cleanPhone)) {
      formattedPhone = cleanPhone.slice(1);
    } else {
      setMessage(
        "📌 Enter a valid Kenyan mobile number, for example 0712345678 or 254712345678."
      );
      return;
    }

    setLoading(true);
    setMessage(null);
    stopPolling();

    try {
      const response = await axios.post(
        "https://idiko.onrender.com/mpesa/stkpush",
        {
          phone: formattedPhone,
          amount,

          // Keep the account reference for compatibility.
          accountReference: state.accountReference || recordId,

          // Identify the exact Firestore claim and document type.
          recordId,
          documentType: state.documentType,
          fullName: state.fullName,

          description: "ID Claim Payment",
        }
      );

      console.log("MPESA payment response:", response.data);

      const checkoutRequestID =
        response.data?.data?.CheckoutRequestID ||
        response.data?.CheckoutRequestID;

      if (!response.data?.success || !checkoutRequestID) {
        setLoading(false);
        setMessage(
          "❌ Payment request failed. Please check your phone number and try again."
        );
        return;
      }

      setMessage(
        "✅ Payment request sent! Check your phone for the M-Pesa prompt."
      );

      let finished = false;
      let checkingStatus = false;

      const finishPolling = () => {
        finished = true;
        stopPolling();
        setLoading(false);
      };

      const checkPaymentStatus = async () => {
        if (finished || checkingStatus) {
          return;
        }

        checkingStatus = true;

        try {
          const statusResponse = await axios.get(
            `https://idiko.onrender.com/mpesa/status/${encodeURIComponent(
              checkoutRequestID
            )}`
          );

          const status = String(
            statusResponse.data?.status || "pending"
          ).toLowerCase();

          console.log("📡 Payment status:", status);

          if (status === "paid") {
            finishPolling();

            markRecordPaidLocally(recordId);
            setMessage("✅ Payment successful! Redirecting...");

            redirectRef.current = setTimeout(() => {
              navigate(`/claimed/${encodeURIComponent(recordId)}`);
            }, 1000);

            return;
          }

          if (status === "failed") {
            finishPolling();
            setMessage("❌ Payment failed. Please try again.");
          }
        } catch (error) {
          console.error("❌ Status polling failed", error);
        } finally {
          checkingStatus = false;
        }
      };

      // Check immediately, then poll every 5 seconds.
      await checkPaymentStatus();

      if (!finished) {
        pollIntervalRef.current = setInterval(() => {
          void checkPaymentStatus();
        }, 5000);

        timeoutRef.current = setTimeout(() => {
          finishPolling();
          setMessage(
            "❌ Payment timed out. Please check your M-Pesa messages before trying again."
          );
        }, 60000);
      }
    } catch (error: any) {
      console.error("❌ STK Push request error:", error);

      setLoading(false);
      setMessage(
        "❌ Payment request failed. Make sure your phone number is correct and try again."
      );
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
          {idImages.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`ID Pic ${idx + 1}`}
              style={{
                maxWidth: 300,
                borderRadius: 10,
                border: "2px solid #fff",
              }}
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
              value={amount}
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
              disabled={loading}
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
            disabled={loading}
            style={{
              width: "100%",
              padding: 6,
              background: "green",
              color: "#fff",
              fontWeight: "bold",
              borderRadius: 20,
              cursor:"pointer",
              fontSize: 16,
              opacity: loading ? 0.7 : 1,
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

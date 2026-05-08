import { useState } from "react";
import axios from "axios";
import { useLocation, Link, useNavigate } from "react-router-dom";

interface PayToClaimProps {}

/**
 * Expected location.state:
 * {
 *   idNumber: string;
 *   fullName: string;
 *   idImages: string[];
 *   amount: number;
 *   accountReference: string;
 * }
 */
export default function PayToClaim({}: PayToClaimProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    idNumber: string;
    fullName: string;
    idImages: string[];
    amount: number;
    accountReference: string;
  };

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!state) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <h2>No ID info provided</h2>
      </div>
    );
  }

  const handlePay = async () => {
    if (!phone) {
      setMessage("📌 Please enter your phone number");
      return;
    }

    let formattedPhone = phone;
    if (phone.startsWith("0")) {
      formattedPhone = "254" + phone.slice(1);
    } else if (!phone.startsWith("254")) {
      setMessage("📌 Phone number must start with 0 or 254");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post(
        "/mpesa/stkpush",
        {
          phone: formattedPhone,
          amount: state.amount,
          accountReference: state.accountReference,
          description: "ID Claim Payment",
        }
      );

      console.log("MPESA payment response:", response.data);

      setMessage(
        "✅ Payment request sent! Check your phone for the M-Pesa prompt."
      );

      // ✅ START PAYMENT STATUS POLLING
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `/mpesa/status/${state.accountReference}`
          );

          console.log("📡 Payment status:", statusResponse.data.status);

          if (statusResponse.data.status === "paid") {
            clearInterval(pollInterval);

            setMessage("✅ Payment successful! Redirecting...");

            navigate(`/claimed/${state.idNumber}`);
          }
        } catch (err) {
          console.error("❌ Status polling failed", err);
        }
      }, 3000);

    } catch (error: any) {
      console.error(error);

      setMessage(
        "❌ Payment failed. Make sure your phone number is correct and try again."
      );

      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, color: "#fff", minHeight: "100vh" }}>
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>
        Pay to Claim Your ID
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {state.idImages.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`ID Pic ${idx + 1}`}
            style={{ maxWidth: 300, borderRadius: 10, border: "2px solid #fff" }}
          />
        ))}
      </div>

      <div style={{ marginTop: 30, maxWidth: 400 }}>
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
            placeholder="2547XXXXXXXX"
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
            width: "105%",
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
  );
}
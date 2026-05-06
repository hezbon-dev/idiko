/**
 * pesapalPayment.js
 *
 * This file handles:
 * 1. Authenticating with Pesapal (OAuth)
 * 2. Submitting a payment order to Pesapal
 * 3. Triggering M-Pesa STK Push via Pesapal (sandbox-ready)
 *
 * IMPORTANT:
 * - Pesapal decides whether STK Push is used
 * - We do NOT talk to Safaricom directly
 * - Amount is verified by Pesapal + M-Pesa
 */

const axios = require("axios");

/**
 * ============================================
 * PESAPAL SANDBOX BASE URL
 * ============================================
 * Sandbox:
 * https://cybqa.pesapal.com/pesapalv3
 *
 * Live:
 * https://pay.pesapal.com/v3
 */
const PESAPAL_BASE_URL = "https://pay.pesapal.com/v3";

/**
 * ============================================
 * STEP 1: GET PESAPAL ACCESS TOKEN (OAuth)
 * ============================================
 * Pesapal uses Consumer Key & Secret
 */
async function getPesapalAccessToken() {
  try {
    const response = await axios.post(
      `${PESAPAL_BASE_URL}/api/Auth/RequestToken`,
      {
        consumer_key: process.env.PESAPAL_CONSUMER_KEY,
        consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.token;
  } catch (error) {
    console.error("❌ PESAPAL AUTH ERROR");
    console.error(error.response?.data || error.message);
    throw new Error("Failed to authenticate with Pesapal");
  }
}

/**
 * ============================================
 * STEP 2: INITIATE PESAPAL PAYMENT
 * ============================================
 * This replaces Daraja STK Push
 *
 * Expected frontend payload:
 * {
 *   amount: number,
 *   phone: string,
 *   description: string,
 *   accountReference: string
 * }
 */
async function pesapalInitiatePayment(req, res) {
  console.log("🚨 /pesapal/pay ROUTE HIT");

  const { amount, phone, description, accountReference } = req.body;

  // Basic validation
  if (!amount || !phone || !accountReference) {
    console.error("❌ Missing required payment fields");
    return res.status(400).json({
      success: false,
      error: "amount, phone, and accountReference are required",
    });
  }

  try {
    // 1️⃣ Get Pesapal OAuth token
    console.log("🔐 Requesting Pesapal access token...");
    const accessToken = await getPesapalAccessToken();

    // 2️⃣ Build payment request
    const paymentPayload = {
      id: accountReference,
      currency: "KES",
      amount: amount,
      description: description || "IDiko Payment",

      // ✅ REQUIRED BY PESAPAL (ADDED)
      callback_url: process.env.PESAPAL_CALLBACK_URL,

      billing_address: {
        phone_number: phone,
        country_code: "KE",
      },
    };

    console.log("📤 Sending payment request to Pesapal...");
    console.log(paymentPayload);

    // 3️⃣ Submit order to Pesapal
    const response = await axios.post(
      `${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`,
      paymentPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Pesapal order created");
    console.log(response.data);

    return res.json({
      success: true,
      message: "Payment request sent successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("❌ PESAPAL PAYMENT ERROR");
    console.error(error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: "Failed to initiate Pesapal payment",
    });
  }
}

module.exports = {
  pesapalInitiatePayment,
};

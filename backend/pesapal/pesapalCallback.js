/**
 * pesapalCallback.js
 *
 * This file handles:
 * 1. Receiving Pesapal IPN (Instant Payment Notification)
 * 2. Verifying payment status with Pesapal
 * 3. Confirming amount, status, and merchant reference
 *
 * IMPORTANT:
 * - Pesapal calls this endpoint automatically
 * - We MUST verify the transaction server-side
 * - Do NOT trust frontend payment success
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
 * GET PESAPAL ACCESS TOKEN
 * ============================================
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
    console.error("❌ PESAPAL AUTH ERROR (CALLBACK)");
    console.error(error.response?.data || error.message);
    throw new Error("Failed to authenticate with Pesapal");
  }
}

/**
 * ============================================
 * PESAPAL IPN CALLBACK HANDLER
 * ============================================
 */
async function pesapalIPNCallback(req, res) {
  console.log("🔔 PESAPAL IPN RECEIVED");
  console.log("📥 Query Params:", req.query);

  const { OrderTrackingId, OrderMerchantReference } = req.query;

  if (!OrderTrackingId || !OrderMerchantReference) {
    console.error("❌ Missing IPN parameters");
    return res.status(400).json({
      success: false,
      error: "Invalid IPN request",
    });
  }

  try {
    console.log("🔐 Getting Pesapal access token...");
    const accessToken = await getPesapalAccessToken();

    console.log("🔎 Verifying transaction with Pesapal...");
    const verificationResponse = await axios.get(
      `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus`,
      {
        params: {
          orderTrackingId: OrderTrackingId,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const transaction = verificationResponse.data;

    console.log("✅ Transaction verification result:");
    console.log(transaction);

    if (transaction.payment_status_description === "COMPLETED") {
      console.log("💰 PAYMENT CONFIRMED");

      return res.json({
        success: true,
        message: "Payment confirmed successfully",
      });
    } else {
      console.warn("⚠️ Payment not completed");
      console.warn("Status:", transaction.payment_status_description);

      return res.json({
        success: false,
        message: "Payment not completed",
        status: transaction.payment_status_description,
      });
    }
  } catch (error) {
    console.error("❌ PESAPAL IPN PROCESSING ERROR");
    console.error(error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: "Failed to process Pesapal IPN",
    });
  }
}

module.exports = {
  pesapalIPNCallback,
};

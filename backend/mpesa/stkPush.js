const axios = require("axios");
const { getMpesaAccessToken } = require("./mpesaAuth");
const { generateTimestamp, generatePassword } = require("./mpesaUtils");

/**
 * Send STK Push
 */
async function stkPush(req, res) {
  console.log("🔥 STK PUSH ROUTE HIT");

  const { phone, amount, accountReference } = req.body;

  if (!phone || !amount || !accountReference) {
    console.error("❌ Missing required fields");
    return res.status(400).json({
      success: false,
      error: "phone, amount and accountReference are required",
    });
  }

  try {
    // 1️⃣ Get access token
    const accessToken = await getMpesaAccessToken();

    // 2️⃣ Generate timestamp & password
    const timestamp = generateTimestamp();
    const password = generatePassword(timestamp);

    // 3️⃣ Build request payload
    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: "ID Claim Payment",
    };

    console.log("📤 STK PUSH PAYLOAD:", payload);

    // 4️⃣ Send request
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ STK PUSH RESPONSE:", response.data);

    res.json({
      success: true,
      message: "STK Push sent successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("❌ STK PUSH FAILED");

    if (error.response) {
      console.error("🔴 Response error:", error.response.data);
      return res.status(500).json({
        success: false,
        error: error.response.data,
      });
    }

    console.error(error.message);
    res.status(500).json({
      success: false,
      error: error.message || "STK Push failed",
    });
  }
}

module.exports = { stkPush };
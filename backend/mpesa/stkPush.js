const axios = require("axios");
const fs = require("fs");
const path = require("path");

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

    // ✅ SAVE PAYMENT MAPPING LOCALLY
    const FILE_PATH = path.join(__dirname, "payments.json");

    // ✅ ENSURE FILE EXISTS
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, "[]");
      console.log("📂 payments.json created");
    }

    let payments = [];

    try {
      const fileData = fs.readFileSync(FILE_PATH, "utf8");

      payments =
        fileData && fileData.trim() !== ""
          ? JSON.parse(fileData)
          : [];

      if (!Array.isArray(payments)) {
        payments = [];
      }

    } catch (err) {
      console.error("❌ Failed to read payments file", err);
      payments = [];
    }

    console.log("📦 Existing payments:", payments);

    const existingIndex = payments.findIndex(
      p => p.checkoutRequestID === response.data.CheckoutRequestID
    );

    const paymentRecord = {
      checkoutRequestID: response.data.CheckoutRequestID,
      accountReference,
      status: "pending",
    };

    if (existingIndex >= 0) {
      payments[existingIndex] = {
        ...payments[existingIndex],
        ...paymentRecord,
      };

      console.log("♻️ Existing payment updated");
    } else {
      payments.push(paymentRecord);

      console.log("🆕 New payment added");
    }

    try {
      fs.writeFileSync(FILE_PATH, JSON.stringify(payments, null, 2));

      console.log("✅ PAYMENT SAVED");
      console.log("📂 FILE PATH:", FILE_PATH);
      console.log("📦 SAVED RECORD:", paymentRecord);
      console.log("📦 ALL PAYMENTS:", payments);

    } catch (err) {
      console.error("❌ Failed to write payments file", err);
    }

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
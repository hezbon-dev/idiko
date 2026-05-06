const axios = require("axios");

/**
 * Get Safaricom Daraja OAuth access token
 */
async function getMpesaAccessToken() {
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;


    // 🔍 DEBUG CHECK (ADD THESE TWO LINES)
    console.log("MPESA KEY:", consumerKey ? "LOADED" : "MISSING");
    console.log("MPESA SECRET:", consumerSecret ? "LOADED" : "MISSING");
    
    if (!consumerKey || !consumerSecret) {
      throw new Error("Missing Mpesa consumer key or secret");
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    console.log("✅ Mpesa access token generated");

    return response.data.access_token;
  } catch (error) {
    console.error("❌ Failed to get Mpesa access token");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }

    throw new Error("Mpesa authentication failed");
  }
}

module.exports = {
  getMpesaAccessToken,
};

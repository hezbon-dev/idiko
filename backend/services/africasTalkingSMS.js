// backend/services/africasTalkingSMS.js
const Africastalking = require("africastalking");

// ✅ MUST be strings
// If you are using sandbox:
const AT_USERNAME = "HEZBON";

// ⚠️ API KEY MUST ALSO BE A STRING
const AT_API_KEY =
  "atsk_e0005212b23101dc7bf293ccdf638c13c2d65045e66cc9983f03e0c0d4047a41111e6657";

// Initialize Africa's Talking
console.log("🔥 Initializing Africa's Talking SDK...");
console.log("🔑 AT_USERNAME =", AT_USERNAME);

const africasTalking = Africastalking({
  apiKey: AT_API_KEY,
  username: AT_USERNAME,
});

const sms = africasTalking.SMS;

/**
 * Send SMS using Africa's Talking
 * @param {string} phoneNumber - recipient phone number in international format, e.g. +2547xxxxxxx
 * @param {string} message - text message to send
 */
async function sendSMS(phoneNumber, message) {
  console.log("======================================");
  console.log("📡 sendSMS() FUNCTION ENTERED");
  console.log("📝 Preparing to send SMS...");
  console.log("🔑 Username:", AT_USERNAME);
  console.log("📞 Phone:", phoneNumber);
  console.log("📨 Message:", message);

  // 🧪 Basic validation (logs only, no logic change)
  if (!phoneNumber || !message) {
    console.error("❌ INVALID SMS INPUT");
    console.error("➡️ phoneNumber:", phoneNumber);
    console.error("➡️ message:", message);
  }

  try {
    const options = {
      to: [phoneNumber],
      message,
      // ❗ Sender ID is NOT allowed in sandbox
      // Do NOT add "from" here
    };

    console.log("📦 SMS PAYLOAD:");
    console.log(JSON.stringify(options, null, 2));

    console.log("🚀 Sending SMS request to Africa's Talking...");
    const response = await sms.send(options);

    console.log("✅ SMS API call SUCCESS");
    console.log("📜 Full API Response:");
    console.log(JSON.stringify(response, null, 2));

    // 🧾 Extra safety log
    if (
      response?.SMSMessageData?.Recipients &&
      response.SMSMessageData.Recipients.length > 0
    ) {
      const r = response.SMSMessageData.Recipients[0];
      console.log("📬 DELIVERY STATUS:");
      console.log("➡️ Number:", r.number);
      console.log("➡️ Status:", r.status);
      console.log("➡️ Cost:", r.cost);
      console.log("➡️ MessageId:", r.messageId);
    } else {
      console.warn("⚠️ No recipients found in API response");
    }

    console.log("📡 sendSMS() FUNCTION COMPLETED");
    console.log("======================================");

    return response;
  } catch (error) {
    console.error("❌ SMS sending FAILED");
    console.log("======================================");

    if (error.response) {
      console.error("📛 API RESPONSE ERROR:");
      console.error(JSON.stringify(error.response, null, 2));
    } else if (error.request) {
      console.error("📛 NO RESPONSE FROM API (network / credentials issue)");
    } else {
      console.error("📛 ERROR MESSAGE:", error.message);
    }

    console.error("🔍 FULL ERROR OBJECT:");
    console.error(error);

    console.log("📡 sendSMS() FUNCTION FAILED");
    console.log("======================================");

    throw error;
  }
}

module.exports = { sendSMS };

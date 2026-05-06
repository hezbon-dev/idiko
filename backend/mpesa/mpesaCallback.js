/**
 * Mpesa STK Push Callback Handler
 */

const fs = require("fs");
const path = require("path");

// Helper function to update payment status
function updatePaymentStatus(checkoutRequestID) {
  const FILE_PATH = path.join(__dirname, "payments.json");
  let payments = [];

  try {
    if (fs.existsSync(FILE_PATH)) {
      payments = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
    }
  } catch (err) {
    console.error("❌ Failed to read payments file", err);
  }

  // Update or add the payment
  const existingIndex = payments.findIndex(p => p.checkoutRequestID === checkoutRequestID);
  if (existingIndex >= 0) {
    payments[existingIndex].status = "paid";
  } else {
    payments.push({ checkoutRequestID, status: "paid" });
  }

  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(payments, null, 2));
  } catch (err) {
    console.error("❌ Failed to write payments file", err);
  }
}

// Route handler
function mpesaCallback(req, res) {
  console.log("🔥 MPESA CALLBACK RECEIVED");
  console.log("📩 FULL CALLBACK BODY:");
  console.dir(req.body, { depth: null });

  try {
    const callback = req.body?.Body?.stkCallback;

    if (!callback) {
      console.error("❌ Invalid callback structure");
      return res.status(400).json({ ResultCode: 1 });
    }

    const {
      ResultCode,
      ResultDesc,
      CheckoutRequestID,
      CallbackMetadata,
    } = callback;

    console.log("📌 ResultCode:", ResultCode);
    console.log("📌 ResultDesc:", ResultDesc);
    console.log("📌 CheckoutRequestID:", CheckoutRequestID);

    // ❌ Payment cancelled or failed
    if (ResultCode !== 0) {
      console.warn("❌ PAYMENT FAILED OR CANCELLED");
      return res.status(200).json({ ResultCode: 0 });
    }

    // ✅ Payment successful
    console.log("✅ PAYMENT SUCCESSFUL");

    let paymentData = {};
    if (CallbackMetadata && CallbackMetadata.Item) {
      CallbackMetadata.Item.forEach(item => {
        paymentData[item.Name] = item.Value;
      });
    }

    console.log("💰 PAYMENT DETAILS:");
    console.log("➡️ Amount:", paymentData.Amount);
    console.log("➡️ MpesaReceipt:", paymentData.MpesaReceiptNumber);
    console.log("➡️ Phone:", paymentData.PhoneNumber);
    console.log("➡️ TransactionDate:", paymentData.TransactionDate);

    // ✅ Real-time confirmation: save status
    updatePaymentStatus(CheckoutRequestID);

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Success",
    });
  } catch (error) {
    console.error("❌ CALLBACK PROCESSING ERROR");
    console.error(error);
    return res.status(500).json({ ResultCode: 1 });
  }
}

// Extra route to allow frontend polling
function getPaymentStatus(req, res) {
  const { checkoutRequestID } = req.params;
  const FILE_PATH = path.join(__dirname, "payments.json");
  let payments = [];

  try {
    if (fs.existsSync(FILE_PATH)) {
      payments = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
    }
  } catch (err) {
    console.error("❌ Failed to read payments file", err);
  }

  const payment = payments.find(p => p.checkoutRequestID === checkoutRequestID);
  res.json({ status: payment?.status || "pending" });
}

module.exports = { mpesaCallback, getPaymentStatus };

/**
 * Generate Mpesa timestamp (YYYYMMDDHHmmss)
 */
function generateTimestamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generate Mpesa password
 * Base64(Shortcode + Passkey + Timestamp)
 */
function generatePassword(timestamp) {
  const shortcode = process.env.MPESA_SHORTCODE?.trim();
  const passkey = process.env.MPESA_PASSKEY?.trim();

  if (!shortcode || !passkey) {
    throw new Error("Missing Mpesa shortcode or passkey");
  }

  const dataToEncode = `${shortcode}${passkey}${timestamp}`;
  return Buffer.from(dataToEncode).toString("base64");
}

module.exports = {
  generateTimestamp,
  generatePassword,
};

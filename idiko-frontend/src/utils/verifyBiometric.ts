// =========================
// ✅ VERIFY BIOMETRIC
// =========================

const verifyBiometric = async () => {

  try {

    console.log(
      "🟢 Starting biometric verification..."
    );

    // =========================
    // ✅ CHECK SUPPORT
    // =========================

    if (
      !window.PublicKeyCredential
    ) {

      return {
        success: false,
        error:
          "WebAuthn not supported",
      };
    }

    // =========================
    // ✅ CHECK TRUSTED DEVICE
    // =========================

    const trusted =
      localStorage.getItem(
        "trustedDevice"
      );

    const credentialId =
      localStorage.getItem(
        "credentialId"
      );

    if (
      !trusted ||
      !credentialId
    ) {

      return {
        success: false,
        skipped: true,
      };
    }

    // =========================
    // ✅ CREATE CHALLENGE
    // =========================

    const challenge =
      new Uint8Array(32);

    window.crypto.getRandomValues(
      challenge
    );

    // =========================
    // ✅ DECODE CREDENTIAL ID
    // =========================

    const credentialBuffer =
      Uint8Array.from(
        atob(credentialId),
        (c) => c.charCodeAt(0)
      );

    // =========================
    // ✅ REQUEST BIOMETRIC
    // =========================

    const assertion =
      await navigator.credentials.get({
        publicKey: {

          challenge,

          allowCredentials: [
            {
              id: credentialBuffer,
              type: "public-key",
            },
          ],

          userVerification:
            "required",

          timeout: 60000,
        },
      });

    // =========================
    // ✅ SUCCESS
    // =========================

    if (assertion) {

      console.log(
        "✅ Biometric verified"
      );

      return {
        success: true,
      };
    }

    return {
      success: false,
      error:
        "Biometric verification failed",
    };

  } catch (err: any) {

    console.error(
      "❌ Biometric verify error:",
      err
    );

    return {
      success: false,
      error:
        err.message ||
        "Biometric verification failed",
    };
  }
};

export default verifyBiometric;
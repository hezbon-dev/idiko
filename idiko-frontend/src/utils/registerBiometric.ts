// =========================
// ✅ REGISTER BIOMETRIC
// =========================

const registerBiometric = async (
  username: string
): Promise<{
  success: boolean;
  error?: string;
}> => {

  try {

    console.log(
      "🟢 Starting biometric registration..."
    );

    // =========================
    // ✅ CHECK SUPPORT
    // =========================

    if (
      !window.PublicKeyCredential
    ) {

      throw new Error(
        "WebAuthn not supported"
      );
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
    // ✅ USER ID
    // =========================

    const userId =
      new TextEncoder().encode(
        username
      );

    // =========================
    // ✅ CREATE CREDENTIAL
    // =========================

    const credential =
      await navigator.credentials.create({
        publicKey: {

          challenge,

          rp: {
            name: "IDiko Admin",
          },

          user: {
            id: userId,
            name: username,
            displayName: username,
          },

          pubKeyCredParams: [
            {
              type: "public-key",
              alg: -7,
            },
          ],

          authenticatorSelection: {
            authenticatorAttachment:
              "platform",

            userVerification:
              "required",
          },

          timeout: 60000,

          attestation: "none",
        },
      });

    // =========================
    // ✅ NULL CHECK
    // =========================

    if (!credential) {

      throw new Error(
        "Biometric credential creation failed"
      );
    }

    // =========================
    // ✅ CAST TO PublicKeyCredential
    // =========================

    const publicKeyCredential =
      credential as PublicKeyCredential;

    console.log(
      "✅ Biometric credential created:",
      publicKeyCredential
    );

    // =========================
    // ✅ STORE TRUSTED DEVICE
    // =========================

    localStorage.setItem(
      "trustedDevice",
      "true"
    );

    localStorage.setItem(
      "biometricEnabled",
      "true"
    );

    localStorage.setItem(
      "credentialId",
      btoa(
        String.fromCharCode(
          ...new Uint8Array(
            publicKeyCredential.rawId
          )
        )
      )
    );

    console.log(
      "✅ Trusted device registered"
    );

    return {
      success: true,
    };

  } catch (err: any) {

    console.error(
      "❌ Biometric registration error:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Biometric registration failed",
    };
  }
};

export default registerBiometric;
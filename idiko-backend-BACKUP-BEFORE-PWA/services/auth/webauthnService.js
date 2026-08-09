const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} = require("@simplewebauthn/server");

// =========================
// ✅ GENERATE REGISTRATION
// =========================

const generateWebAuthnRegistration = (
  username
) => {

  const options =
    generateRegistrationOptions({

      rpName: "IDiko Admin Security",

      rpID: "idiko-81906.web.app",

      userID: username,

      userName: username,

      timeout: 60000,

      attestationType: "none",

      authenticatorSelection: {

        authenticatorAttachment:
          "platform",

        residentKey: "preferred",

        userVerification:
          "required",
      },
    });

  return options;
};

// =========================
// ✅ VERIFY REGISTRATION
// =========================

const verifyWebAuthnRegistration =
  async (credential) => {

    try {

      const verification =
        await verifyRegistrationResponse({

          response: credential,

          expectedChallenge:
            credential.response.clientDataJSON,

          expectedOrigin:
            "https://idiko-81906.web.app",

          expectedRPID:
            "idiko-81906.web.app",
        });

      if (!verification.verified) {

        return {
          verified: false,
        };
      }

      const registrationInfo =
        verification.registrationInfo;

      return {

        verified: true,

        credentialID:
          registrationInfo.credentialID.toString(
            "base64url"
          ),

        publicKey:
          registrationInfo.credentialPublicKey.toString(
            "base64url"
          ),

        counter:
          registrationInfo.counter,
      };

    } catch (err) {

      console.error(
        "❌ WebAuthn Verification Error:",
        err
      );

      return {
        verified: false,
      };
    }
  };

// =========================
// ✅ EXPORTS
// =========================

module.exports = {
  generateWebAuthnRegistration,
  verifyWebAuthnRegistration,
};
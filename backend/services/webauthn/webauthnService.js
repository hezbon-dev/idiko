const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} = require("@simplewebauthn/server");

// =========================
// ✅ TEMP MEMORY STORE
// =========================

const challenges = {};

// =========================
// ✅ GENERATE REGISTRATION OPTIONS
// =========================

const generateWebAuthnRegistration = (
  username
) => {

  const options = generateRegistrationOptions({

    rpName: "IDiko Admin Security",

    rpID: "idiko-81906.web.app",

    userID: username,

    userName: username,

    timeout: 60000,

    attestationType: "none",

    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  // =========================
  // ✅ STORE CHALLENGE
  // =========================

  challenges[username] =
    options.challenge;

  return options;
};

// =========================
// ✅ VERIFY REGISTRATION
// =========================

const verifyWebAuthnRegistration =
  async (
    username,
    credential
  ) => {

    try {

      const expectedChallenge =
        challenges[username];

      const verification =
        await verifyRegistrationResponse({

          response: credential,

          expectedChallenge,

          expectedOrigin:
            "https://idiko-81906.web.app",

          expectedRPID:
            "idiko-81906.web.app",
        });

      return verification;

    } catch (err) {

      console.error(
        "❌ WebAuthn Verification Error:",
        err
      );

      return null;
    }
  };

// =========================
// ✅ EXPORTS
// =========================

module.exports = {
  generateWebAuthnRegistration,
  verifyWebAuthnRegistration,
};
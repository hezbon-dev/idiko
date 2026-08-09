const { Resend } = require("resend");

// =========================
// ✅ RESEND CLIENT
// =========================

const resend = new Resend(
  process.env.RESEND_API_KEY
);

// =========================
// ✅ SEND OTP EMAIL
// =========================

const sendOTPEmail = async (
  email,
  otp
) => {

  try {

    const response = await resend.emails.send({

      from: "onboarding@resend.dev",

      to: email,

      subject: "IDIKO Admin Login Verification",

      html: `
        <div style="font-family: Arial;">

          <h2>IDIKO Admin Login Verification</h2>

          <p>Your OTP code is:</p>

          <h1>${otp}</h1>

          <p>
            This code expires in 30 seconds.
          </p>

          <p>
            If this was not you,
            secure your account immediately.
          </p>

        </div>
      `,
    });

    console.log(
      "✅ OTP email sent:",
      response
    );

  } catch (err) {

    console.error(
      "❌ RESEND EMAIL ERROR:",
      err
    );

    throw err;
  }
};

module.exports = sendOTPEmail;
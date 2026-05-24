const transporter = require("./mailer");

// =========================
// ✅ SEND OTP EMAIL
// =========================

const sendOTPEmail = async (email, otp) => {

  const mailOptions = {

    from: process.env.EMAIL_USER,

    to: email,

    subject: "Your IDIKO Admin OTP Code",

    html: `
      <div style="font-family: Arial; padding: 20px;">

        <h2>IDIKO Admin Login Verification</h2>

        <p>Your OTP code is:</p>

        <h1 style="letter-spacing: 5px;">
          ${otp}
        </h1>

        <p>
          This code expires in 1 minute.
        </p>

        <p>
          If this was not you, secure your account immediately.
        </p>

      </div>
    `,
  };

  await transporter.sendMail(mailOptions);

  console.log("✅ OTP email sent to:", email);
};

module.exports = sendOTPEmail;
const { MailerSend, EmailParams, Recipient, Sender } = require("mailersend");

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Reusable sender
const sentFrom = new Sender(
  process.env.MAILERSEND_EMAIL,
  "Task Manager"
);

const sendVerificationEmail = async (email, username, otp) => {
  try {
    const recipients = [new Recipient(email)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("Verify Your Email - Task Manager")
      .setHtml(`
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Hi <strong>${username}</strong>,</p>
          <p>Use the OTP below to verify your email:</p>
          <div style="
            background:#f4f4f4; 
            padding:15px;
            font-size:24px;
            text-align:center;
            letter-spacing:5px;
            font-weight:bold;
          ">
            ${otp}
          </div>
          <p>This OTP expires in 10 minutes.</p>
        </div>
      `);

    await mailerSend.email.send(emailParams);
    console.log("Verification email sent to:", email);
    return true;

  } catch (error) {
    console.error("MailerSend verification email error:", error);
    throw new Error("Failed to send verification email");
  }
};

const sendPasswordResetEmail = async (email, username, otp) => {
  try {
    const recipients = [new Recipient(email)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("Password Reset - Task Manager")
      .setHtml(`
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset</h2>
          <p>Hi <strong>${username}</strong>,</p>
          <p>Use the OTP below to reset your password:</p>
          <div style="
            background:#f4f4f4; 
            padding:15px;
            font-size:24px;
            text-align:center;
            letter-spacing:5px;
            font-weight:bold;
          ">
            ${otp}
          </div>
          <p>This OTP expires in 10 minutes.</p>
        </div>
      `);

    await mailerSend.email.send(emailParams);
    console.log("Password reset email sent to:", email);
    return true;

  } catch (error) {
    console.error("MailerSend password reset email error:", error);
    throw new Error("Failed to send password reset email");
  }
};

module.exports = {
  generateOTP,
  sendVerificationEmail,
  sendPasswordResetEmail,
};

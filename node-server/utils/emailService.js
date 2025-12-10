const Mailjet = require('node-mailjet');

// Initialize Mailjet
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
const sendVerificationEmail = async (email, username, otp) => {
  try {
    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL || 'noreply@yourdomain.com',
              Name: 'Task Manager'
            },
            To: [
              {
                Email: email,
                Name: username
              }
            ],
            Subject: 'Verify Your Email - Task Manager',
            TextPart: `Hi ${username}, Your verification code is: ${otp}. This code expires in 10 minutes.`,
            HTMLPart: `
              <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Email Verification</h2>
                <p>Hi <strong>${username}</strong>,</p>
                <p>Thank you for registering! Please use the following OTP to verify your email:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
                  ${otp}
                </div>
                <p style="color: #666;">This OTP will expire in <strong>10 minutes</strong>.</p>
                <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
              </div>
            `
          }
        ]
      });

    const result = await request;
    console.log('✅ Email sent successfully to:', email);
    console.log('Response:', result.body);
    return true;
  } catch (error) {
    console.error('❌ Mailjet error:', error.statusCode || error.message);
    console.error('Full error:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, username, otp) => {
  try {
    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL || 'noreply@yourdomain.com',
              Name: 'Task Manager'
            },
            To: [
              {
                Email: email,
                Name: username
              }
            ],
            Subject: 'Password Reset Request - Task Manager',
            TextPart: `Hi ${username}, Your password reset code is: ${otp}. This code expires in 10 minutes.`,
            HTMLPart: `
              <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>Hi <strong>${username}</strong>,</p>
                <p>We received a request to reset your password. Use the following OTP to proceed:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
                  ${otp}
                </div>
                <p style="color: #666;">This OTP will expire in <strong>10 minutes</strong>.</p>
                <p style="color: #ff4444; font-weight: bold;">If you didn't request this, please secure your account immediately.</p>
              </div>
            `
          }
        ]
      });

    const result = await request;
    console.log('✅ Password reset email sent to:', email);
    console.log('Response:', result.body);
    return true;
  } catch (error) {
    console.error('❌ Mailjet error:', error.statusCode || error.message);
    console.error('Full error:', error);
    throw new Error('Failed to send password reset email');
  }
};

module.exports = {
  generateOTP,
  sendVerificationEmail,
  sendPasswordResetEmail
};
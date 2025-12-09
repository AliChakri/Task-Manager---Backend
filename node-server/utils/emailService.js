const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
const sendVerificationEmail = async (email, username, otp) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Task Manager <onboarding@resend.dev>', // Use their test domain
      to: email,
      subject: 'Verify Your Email - Task Manager',
      html: `
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
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send verification email');
    }

    console.log('✅ Email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, username, otp) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Task Manager <onboarding@resend.dev>',
      to: email,
      subject: 'Password Reset Request - Task Manager',
      html: `
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
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send password reset email');
    }

    console.log('✅ Password reset email sent:', data);
    return true;
  } catch (error) {
    console.error('Error sending reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

module.exports = {
  generateOTP,
  sendVerificationEmail,
  sendPasswordResetEmail
};
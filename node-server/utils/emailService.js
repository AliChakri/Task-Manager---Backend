const nodemailer = require('nodemailer');

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 465,
    secure: true,
    auth: {
      user: 'apikey',
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send verification email
const sendVerificationEmail = async (email, username, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    // NOTE: The 'from' address must be a verified sender in your SendGrid account!
    from: `"Task Manager" <${process.env.EMAIL_USER}>`,
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
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent to:', email);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    if (error.response) {
        console.error('SMTP Response:', error.response);
    }
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, username, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    // NOTE: The 'from' address must be a verified sender in your SendGrid account!
    from: `"Task Manager" <${process.env.EMAIL_USER}>`,
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
        <p style="color: #999; font-size: 12px;">This is an automated email, please do not reply.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', email);
    return true;
  } catch (error) {
    console.error('Error sending reset email:', error);
    if (error.response) {
        console.error('SMTP Response:', error.response);
    }
    throw new Error('Failed to send password reset email');
  }
};

module.exports = {
  generateOTP,
  sendVerificationEmail,
  sendPasswordResetEmail
};
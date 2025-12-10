const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken, verifyToken } = require('../middleware/authMiddleware');
const User = require('../models/User');
const { generateOTP, sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const Task = require('../models/Task');

const router = express.Router();

// Créer un nouveau compte utilisateur.
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      verificationOTP: otp,
      verificationOTPExpires: otpExpires
    });

    await user.save();

    try {
      await sendVerificationEmail(email, username, otp);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for OTP verification.',
      data: {
        userId: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: err.message
    });
  }
});

// Valider l'adresse e-mail de l'utilisateur avec le code OTP envoyé lors de l'inscription.
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    if (user.verificationOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (new Date() > user.verificationOTPExpires) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    user.isVerified = true;
    user.verificationOTP = null;
    user.verificationOTPExpires = null;
    await user.save();

    return res.json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        userId: user._id,
        username: user.username,
        email: user.email,
        isVerified: true,
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: err.message
    });
  }
});

// Générer un nouvel OTP et le renvoyer à l'utilisateur.
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationOTP = otp;
    user.verificationOTPExpires = otpExpires;
    await user.save();

    await sendVerificationEmail(email, user.username, otp);

    res.json({
      success: true,
      message: 'Verification OTP sent to your email'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: err.message
    });
  }
});

// Authentifier l'utilisateur et lui fournir un jeton d'accès.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
        requiresVerification: true
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    user.lastLogin = new Date();
    await user.save();

      const token = generateToken(user._id, user.username);
      
    res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
      });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user._id,
        username: user.username,
        email: user.email,
        token
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: err.message
    });
  }
});

// Initier la procédure de réinitialisation de mot de passe.
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists, a password reset OTP has been sent to your email'
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpires;
    await user.save();

    await sendPasswordResetEmail(email, user.username, otp);

    return res.json({
      success: true,
      message: 'Password reset OTP sent to your email'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: err.message
    });
  }
});

// Confirmer que l'utilisateur détient le bon OTP de réinitialisation.
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (new Date() > user.resetPasswordOTPExpires) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    res.json({
      success: true,
      message: 'OTP verified. You can now reset your password.'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: err.message
    });
  }
});

// Changer le mot de passe après vérification de l'OTP.
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (new Date() > user.resetPasswordOTPExpires) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: err.message
    });
  }
});

// Permettre à un utilisateur connecté de modifier son mot de passe.
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isMatched = await bcrypt.compare(currentPassword, user.password);

    if (!isMatched) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: err.message
    });
  }
});

// Supprimer le jeton de la session. (Deconnecter)
router.post('/logout', async (req, res) => {
  try {
    res.clearCookie('token',  {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: err.message
    });
  }
});

// Supprimer définitivement le compte utilisateur et toutes les tâches associées.
router.delete('/delete-account',  verifyToken,async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. User ID missing."
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    await Task.deleteMany({ userId });

    await User.findByIdAndDelete(userId);

      res.clearCookie('token',  {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    return res.json({
      success: true,
      message: "Account and all associated tasks deleted successfully."
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to delete account",
      error: err.message
    });
  }
});


// Récupérer les informations du profil de l'utilisateur connecté.
router.get('/me', verifyToken, async (req, res) => {
    try {
      
    const user = await User.findById(req.userId).select('-password -verificationOTP -resetPasswordOTP');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: err.message
    });
  }
});

module.exports = router;
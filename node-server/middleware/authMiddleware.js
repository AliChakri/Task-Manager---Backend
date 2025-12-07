const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Generate JWT token
const generateToken = (userId, username) => {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = {
  verifyToken,
  generateToken,
  JWT_SECRET
};
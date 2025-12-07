const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');
require('dotenv').config();

// Middleware to verify JWT tokens
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // Handle cases where the token might be wrapped in quotes: Bearer "TOKEN"
  if (typeof token === 'string') {
    token = token.trim();
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
  }

  try {
    // Verify the JWT token
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      logger.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT secret not set'
      });
    }

    const decoded = jwt.verify(token, jwtSecret);
    
    // Get user from database to ensure they still exist and are active
    const users = await query(
      "SELECT id, email, phone, full_name, user_type, status FROM users WHERE id = ? AND status = 'active'",
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Add user info to request object
    req.user = {
      id: users[0].id,
      email: users[0].email,
      phone: users[0].phone,
      full_name: users[0].full_name,
      user_type: users[0].user_type,
      status: users[0].status
    };

    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

// Middleware to check if user is a bundle owner
const requireOwner = (req, res, next) => {
  if (req.user.user_type !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Bundle owner access required'
    });
  }
  next();
};

// Middleware to check if user is admin (for future use)
const requireAdmin = (req, res, next) => {
  if (req.user.user_type !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access required'
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireOwner,
  requireAdmin
};
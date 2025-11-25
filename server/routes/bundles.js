const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireOwner } = require('../middleware/auth');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/bundles
// @desc    Get available bundles
// @access  Public
router.get('/', async (req, res) => {
  try {
    const bundles = await query(`
      SELECT 
        b.id, b.name, b.description, b.data_limit, b.speed_limit,
        b.duration_hours, b.price, b.currency, b.max_clients,
        b.current_clients, b.status, b.created_at,
        u.full_name as owner_name
      FROM bundles b
      JOIN users u ON b.owner_id = u.id
      WHERE b.status = 'active'
      ORDER BY b.created_at DESC
    `);
    
    res.json({
      success: true,
      message: 'Bundles retrieved successfully',
      data: bundles
    });
  } catch (error) {
    logger.error('Bundles fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bundles'
    });
  }
});

// @route   POST /api/bundles
// @desc    Create a new bundle
// @access  Private (Owner only)
router.post('/', [
  authenticateToken,
  requireOwner,
  body('name').trim().isLength({ min: 3, max: 255 }).withMessage('Bundle name must be 3-255 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description too long'),
  body('data_limit').isFloat({ min: 0.1 }).withMessage('Data limit must be positive'),
  body('price').isFloat({ min: 1 }).withMessage('Price must be positive'),
  body('duration_hours').isInt({ min: 1, max: 168 }).withMessage('Duration must be 1-168 hours'),
  body('max_clients').optional().isInt({ min: 1, max: 100 }).withMessage('Max clients must be 1-100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name, description, data_limit, speed_limit, duration_hours,
      price, currency = 'TZS', max_clients = 10
    } = req.body;
    
    const result = await query(`
      INSERT INTO bundles (owner_id, name, description, data_limit, speed_limit, duration_hours, price, currency, max_clients, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `, [req.user.id, name, description, data_limit, speed_limit, duration_hours, price, currency, max_clients]);
    
    const bundleId = result.insertId;
    
    res.status(201).json({
      success: true,
      message: 'Bundle created successfully',
      data: {
        id: bundleId,
        name,
        description,
        data_limit,
        speed_limit,
        duration_hours,
        price,
        currency,
        max_clients
      }
    });
    
  } catch (error) {
    logger.error('Bundle creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bundle'
    });
  }
});

// @route   POST /api/bundles/purchase
// @desc    Purchase a bundle (create subscription)
// @access  Private
router.post('/purchase', [
  authenticateToken,
  body('bundle_id').isInt({ min: 1 }).withMessage('Valid bundle ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { bundle_id } = req.body;
    const userId = req.user.id;
    
    // Check if bundle exists
    const bundles = await query(
      "SELECT * FROM bundles WHERE id = ? AND status = 'active'",
      [bundle_id]
    );
    
    if (bundles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found or not available'
      });
    }
    
    const bundle = bundles[0];
    
    // Check if user already has an active subscription for this bundle
    const existing = await query(
      "SELECT * FROM subscriptions WHERE user_id = ? AND bundle_id = ? AND status = 'active'",
      [user_id, bundle_id]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active subscription to this bundle'
      });
    }
    
    // Create subscription (simplified - no payment processing for now)
    const expiresAt = new Date(Date.now() + bundle.duration_hours * 60 * 60 * 1000);
    
    const result = await query(`
      INSERT INTO subscriptions (user_id, bundle_id, status, expires_at)
      VALUES (?, ?, 'active', ?)
    `, [userId, bundle_id, expiresAt]);
    
    res.status(201).json({
      success: true,
      message: 'Bundle purchased successfully',
      data: {
        subscription_id: result.insertId,
        bundle_id,
        expires_at: expiresAt
      }
    });
    
  } catch (error) {
    logger.error('Bundle purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase bundle'
    });
  }
});

module.exports = router;

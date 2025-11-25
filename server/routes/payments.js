const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const paymentManager = require('../services/PaymentManager');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/payments/providers
// @desc    Get available payment providers (PesaPal)
// @access  Public
router.get('/providers', async (req, res) => {
  try {
    await paymentManager.initialize();
    const providers = paymentManager.getAvailableProviders();
    
    res.json({
      success: true,
      message: 'Payment providers retrieved',
      data: providers
    });
  } catch (error) {
    logger.error('Error getting payment providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment providers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/payments/initiate
// @desc    Initiate payment for bundle purchase
// @access  Private
router.post('/initiate', [
  authenticateToken,
  body('bundle_id')
    .isInt({ min: 1 })
    .withMessage('Valid bundle ID is required'),
  body('payment_method')
    .equals('pesapal')
    .withMessage('Valid payment method is required'),
  body('phone_number')
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  body('description')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Description must be less than 255 characters')
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

    const { bundle_id, payment_method, phone_number, description } = req.body;
    const userId = req.user.id;
    const user = req.user;

    // Check if bundle exists and is active
    const bundles = await query(
      'SELECT * FROM bundles WHERE id = ? AND status = "active"',
      [bundle_id]
    );

    if (bundles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bundle not found or inactive'
      });
    }

    const bundle = bundles[0];

    // Check if bundle has capacity
    if (bundle.current_clients >= bundle.max_clients) {
      return res.status(400).json({
        success: false,
        message: 'Bundle is full, no more slots available'
      });
    }

    // Check if user already has active subscription for this bundle
    const existingSubscriptions = await query(
      'SELECT * FROM subscriptions WHERE user_id = ? AND bundle_id = ? AND status = "active" AND expires_at > NOW()',
      [userId, bundle_id]
    );

    if (existingSubscriptions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription for this bundle'
      });
    }

    // Validate phone number (basic server-side check; detailed formatting is done on mobile)
    try {
      paymentManager.validateProviderPhone(payment_method, phone_number);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Create payment record
    const paymentResult = await query(
      `INSERT INTO payments (user_id, bundle_id, amount, currency, payment_method, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [userId, bundle_id, bundle.price, bundle.currency, 'pesapal']
    );

    const paymentId = paymentResult.insertId;

    // Initiate payment with PesaPal (orderReference will be generated inside PaymentManager)
    const paymentResponse = await paymentManager.initiatePayment(
      'pesapal',
      paymentId,
      bundle.price,
      phone_number,
      description || `${bundle.name} - VPN Bundle`,
      user
    );

    const orderReference = paymentResponse.orderReference;

    logger.info(`Payment initiated via PesaPal for user ${userId}, bundle ${bundle_id}, payment ${paymentId}`);
    logger.info('PesaPal initiate response (server):', JSON.stringify(paymentResponse, null, 2));
    // Also log to stdout for easier debugging
    console.log('PesaPal initiate response (server) raw:', JSON.stringify(paymentResponse, null, 2));

    res.json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        payment_id: paymentId,
        transaction_reference: orderReference,
        bundle_name: bundle.name,
        amount: bundle.price,
        currency: bundle.currency,
        payment_method: 'pesapal',
        redirect_url: paymentResponse?.provider_response?.redirect_url || paymentResponse?.redirect_url,
        provider_response: paymentResponse,
      }
    });

  } catch (error) {
    logger.error('Payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/payments/status/:payment_id
// @desc    Get payment status
// @access  Private
router.get('/status/:payment_id', authenticateToken, async (req, res) => {
  try {
    const { payment_id } = req.params;
    const userId = req.user.id;

    // Get payment details
    const payments = await query(`
      SELECT p.*, b.name as bundle_name
      FROM payments p
      LEFT JOIN bundles b ON p.bundle_id = b.id
      WHERE p.id = ? AND p.user_id = ?
    `, [payment_id, userId]);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    let payment = payments[0];

    // If still pending and using PesaPal, optionally refresh status from provider
    if (payment.status === 'pending' && payment.payment_method === 'pesapal' && payment.transaction_id) {
      try {
        const statusResult = await paymentManager.queryPaymentStatus(payment.transaction_id);
        const rawDesc = statusResult.payment_status_description || '';
        const statusDesc = rawDesc.toUpperCase();

        let newStatus = payment.status;
        if (statusDesc === 'COMPLETED') {
          newStatus = 'completed';
        } else if (statusDesc === 'FAILED' || statusDesc === 'REVERSED' || statusDesc === 'CANCELLED') {
          newStatus = 'failed';
        } else {
          // For statuses like INVALID / UNKNOWN / PENDING, keep as pending instead of forcing failed
          logger.info(`PesaPal returned intermediate status "${rawDesc}" for payment ${payment.id}; keeping status as ${payment.status}`);
        }

        if (newStatus !== payment.status) {
          await query(
            'UPDATE payments SET status = ?, paid_at = ? WHERE id = ?',
            [newStatus, newStatus === 'completed' ? new Date() : null, payment.id]
          );

          // If the payment just completed, attempt to activate the subscription
          if (newStatus === 'completed') {
            try {
              await paymentManager.activateSubscription(payment.id);
            } catch (subErr) {
              logger.error('Failed to activate subscription after completed payment:', subErr);
            }
          }

          // Reload updated payment row
          const updated = await query(
            'SELECT p.*, b.name as bundle_name FROM payments p LEFT JOIN bundles b ON p.bundle_id = b.id WHERE p.id = ?',
            [payment.id]
          );
          if (updated.length > 0) {
            payment = updated[0];
          }
        }
      } catch (err) {
        logger.error('Error refreshing PesaPal status:', err);
      }
    }

    res.json({
      success: true,
      message: 'Payment status retrieved',
      data: {
        payment_id: payment.id,
        bundle_name: payment.bundle_name,
        amount: payment.amount,
        currency: payment.currency,
        payment_method: payment.payment_method,
        status: payment.status,
        // provider_status is not tracked separately for PesaPal; statusResult is used to update status
        created_at: payment.created_at,
        paid_at: payment.paid_at
      }
    });

  } catch (error) {
    logger.error('Payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/payments/history
// @desc    Get user payment history
// @access  Private
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get payment history
    const payments = await query(`
      SELECT p.*, b.name as bundle_name, b.data_limit, b.duration_hours
      FROM payments p
      LEFT JOIN bundles b ON p.bundle_id = b.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM payments WHERE user_id = ?',
      [userId]
    );

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: 'Payment history retrieved',
      data: {
        payments,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_items: total,
          items_per_page: limit
        }
      }
    });

  } catch (error) {
    logger.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/payments/query/:payment_id
// @desc    Query payment status from provider
// @access  Private
router.post('/query/:payment_id', authenticateToken, async (req, res) => {
  try {
    const { payment_id } = req.params;
    const userId = req.user.id;

    // Get payment and transaction details
    const payments = await query(`
      SELECT p.*
      FROM payments p
      WHERE p.id = ? AND p.user_id = ?
    `, [payment_id, userId]);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = payments[0];

    if (!payment.provider || !payment.provider_transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'Payment provider information not available'
      });
    }

    // Query status from provider
    const statusResult = await paymentManager.queryPaymentStatus(
      payment.transaction_id
    );

    logger.info(`Payment status query for ${payment_id}:`, statusResult);

    res.json({
      success: true,
      message: 'Payment status queried from provider',
      data: statusResult,
    });

  } catch (error) {
    logger.error('Payment query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to query payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

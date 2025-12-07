const express = require('express');
const paymentManager = require('../services/PaymentManager');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware to parse raw body for webhook signature verification
const rawBodyParser = (req, res, buf) => {
  if (req.path.startsWith('/api/webhooks/')) {
    req.rawBody = buf.toString('utf8');
  }
};

// @route   POST /api/webhook/pesapal
// @desc    Handle PesaPal payment callbacks (skeleton)
// @access  Public (called by PesaPal IPN)
router.post('/pesapal', express.json(), async (req, res) => {
  try {
    logger.info('Received PesaPal webhook callback');

    const callbackData = req.body;
    logger.info('PesaPal callback data:', JSON.stringify(callbackData, null, 2));

    // TODO: Verify PesaPal IPN signature/auth here based on official docs

    // Process the callback via PaymentManager (currently skeleton and will throw)
    const result = await paymentManager.processWebhook(callbackData);

    if (result.success) {
      logger.info('PesaPal webhook processed successfully:', result);

      res.status(200).json({
        success: true,
        message: 'Callback processed successfully',
      });
    } else {
      logger.warn('PesaPal webhook processing failed:', result);
      res.status(400).json({
        success: false,
        message: 'Failed to process callback',
      });
    }

  } catch (error) {
    logger.error('PesaPal webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   POST /api/webhooks/tigo-pesa
// @desc    Handle Tigo Pesa payment callbacks
// @access  Public (called by Tigo Pesa API)
router.post('/tigo-pesa', express.json(), async (req, res) => {
  try {
    logger.info('Received Tigo Pesa webhook callback');
    
    const callbackData = req.body;
    logger.info('Tigo Pesa callback data:', JSON.stringify(callbackData, null, 2));

    // Process the callback
    const result = await paymentManager.processWebhook('tigo_pesa', callbackData);

    if (result.success) {
      logger.info('Tigo Pesa webhook processed successfully:', result);
      
      // Tigo Pesa expects a success response
      res.status(200).json({
        status: 'success',
        message: 'Callback processed successfully'
      });
    } else {
      logger.warn('Tigo Pesa webhook processing failed:', result);
      res.status(400).json({
        status: 'error',
        message: 'Failed to process callback'
      });
    }

  } catch (error) {
    logger.error('Tigo Pesa webhook error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/webhooks/airtel-money
// @desc    Handle Airtel Money payment callbacks
// @access  Public (called by Airtel Money API)
router.post('/airtel-money', express.json(), async (req, res) => {
  try {
    logger.info('Received Airtel Money webhook callback');
    
    const callbackData = req.body;
    logger.info('Airtel Money callback data:', JSON.stringify(callbackData, null, 2));

    // Process the callback
    const result = await paymentManager.processWebhook('airtel_money', callbackData);

    if (result.success) {
      logger.info('Airtel Money webhook processed successfully:', result);
      
      // Airtel Money expects a success response
      res.status(200).json({
        status: {
          code: '200',
          message: 'Callback processed successfully'
        }
      });
    } else {
      logger.warn('Airtel Money webhook processing failed:', result);
      res.status(400).json({
        status: {
          code: '400',
          message: 'Failed to process callback'
        }
      });
    }

  } catch (error) {
    logger.error('Airtel Money webhook error:', error);
    res.status(500).json({
      status: {
        code: '500',
        message: 'Internal server error'
      }
    });
  }
});

// @route   GET /api/webhooks/health
// @desc    Health check endpoint for webhooks
// @access  Public
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoints are healthy',
    timestamp: new Date().toISOString(),
    gateway: 'Beem Gateway (Unified Mobile Money)',
    supported_providers: ['M-Pesa', 'Tigo Pesa', 'Airtel Money'],
    endpoints: [
      'POST /api/webhooks/beem'
    ]
  });
});

// @route   POST /api/webhooks/test/:provider
// @desc    Test webhook endpoint for development
// @access  Public (development only)
router.post('/test/:provider', express.json(), async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      message: 'Test endpoints not available in production'
    });
  }

  try {
    const { provider } = req.params;
    const testData = req.body;

    logger.info(`Testing webhook for provider: ${provider}`);
    logger.info('Test data:', JSON.stringify(testData, null, 2));

    // Process test webhook
    const result = await paymentManager.processWebhook(provider, testData);

    res.json({
      success: true,
      message: 'Test webhook processed',
      result
    });

  } catch (error) {
    logger.error('Test webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Test webhook failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
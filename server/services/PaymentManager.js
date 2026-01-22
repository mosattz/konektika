const PesapalService = require('./PesapalService');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const wireguardManager = require('../utils/wireguardManager');

/**
 * Payment Manager
 * Coordinates payment gateway integrations (currently PesaPal skeleton).
 */
class PaymentManager {
  constructor() {
    this.pesapalService = null;
    this.initialized = false;
  }

  /**
   * Initialize PesaPal gateway
   */
  async initialize() {
    try {
      if (this.initialized) return;

      logger.info('Initializing Payment Manager with PesaPal Gateway...');
      this.pesapalService = new PesapalService();
      this.initialized = true;
      logger.info('Payment Manager initialized with PesaPal Gateway');

    } catch (error) {
      logger.error('Failed to initialize Payment Manager:', error);
      throw error;
    }
  }

  /**
   * Get available payment providers (single PesaPal gateway)
   */
  getAvailableProviders() {
    if (!this.initialized) {
      throw new Error('Payment Manager not initialized');
    }

    return [
      {
        provider: 'pesapal',
        name: 'PesaPal (Mobile Money & Cards)',
        enabled: true,
      },
    ];
  }

  /**
   * Initiate payment via PesaPal.
   *
   * NOTE: This currently calls PesapalService.initiatePayment, which is a skeleton.
   * It will throw until implemented with real PesaPal endpoints.
   */
  async initiatePayment(provider, paymentId, amount, phoneNumber, description, user) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (provider !== 'pesapal') {
        throw new Error(`Unsupported payment provider: ${provider}`);
      }

      logger.info(`Initiating payment via PesaPal for payment ID: ${paymentId}`);

      // Normalize amount
      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        throw new Error('Invalid amount');
      }

      const normalizedPhone = String(phoneNumber).trim();

      // Build minimal billing address from user profile
      const fullName = (user && user.full_name) || '';
      const nameParts = fullName.trim().split(' ').filter(Boolean);
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      const billingAddress = {
        email_address: (user && user.email) || '',
        phone_number: normalizedPhone,
        country_code: 'TZ',
        first_name: firstName,
        middle_name: '',
        last_name: lastName,
        line_1: 'N/A',
        city: 'N/A',
        state: '',
        postal_code: '',
        zip_code: '',
      };

      // Generate orderReference used as merchant reference with PesaPal
      const orderReference = `KNK-${paymentId}-${Date.now()}`;

      // Call PesaPal SubmitOrderRequest via service
      const result = await this.pesapalService.initiatePayment({
        amount: numAmount,
        currency: 'TZS',
        phoneNumber: normalizedPhone,
        orderReference,
        description,
        billingAddress,
      });

      // Persist linkage between payments and PesaPal order reference
      const orderTrackingId = result.order_tracking_id;

      // Keep payment_method aligned with the ENUM column in the DB to avoid
      // truncation issues. The gateway/provider is still PesaPal; we only
      // classify it in the DB under 'mobile_money'.
      const dbPaymentMethod = 'mobile_money';

      await query(
        'UPDATE payments SET transaction_id = ?, payment_method = ? WHERE id = ?',
        [orderTrackingId, dbPaymentMethod, paymentId]
      );

      return {
        success: true,
        orderReference,
        orderTrackingId,
        provider_response: result,
      };

    } catch (error) {
      logger.error('Payment initiation failed via PesaPal:', error);
      throw error;
    }
  }

  /**
   * Query payment status via PesaPal using orderReference.
   */
  async queryPaymentStatus(orderReference) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const result = await this.pesapalService.getPaymentStatus(orderReference);
      logger.info('PesaPal payment status query result:', result);
      return result;

    } catch (error) {
      logger.error('PesaPal payment status query failed:', error);
      throw error;
    }
  }

  /**
   * Process PesaPal webhook callback (skeleton).
   *
   * TODO: Implement based on PesaPal IPN payload structure.
   */
  async processWebhook(callbackData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      logger.info('Processing PesaPal webhook (skeleton)');
      throw new Error('PesaPal webhook processing not implemented. Configure based on PesaPal IPN docs.');

    } catch (error) {
      logger.error('PesaPal webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Activate subscription after successful payment
   */
  async activateSubscription(paymentId) {
    try {
      logger.info(`Activating subscription for payment: ${paymentId}`);

      // Get payment and bundle details
      const rows = await query(
        'SELECT p.*, b.duration_hours, b.id as bundle_id FROM payments p JOIN bundles b ON p.bundle_id = b.id WHERE p.id = ?',
        [paymentId]
      );

      if (rows.length === 0) {
        throw new Error('Payment not found for subscription activation');
      }

      const { bundle_id, user_id } = rows[0];

      // Get bundle details
      const bundle = await query(
        'SELECT * FROM bundles WHERE id = ?',
        [bundle_id]
      );

      if (bundle.length === 0) {
        throw new Error('Bundle not found for subscription activation');
      }

      const bundleData = bundle[0];

      // Calculate subscription expiry
      const expiresAt = new Date(Date.now() + (bundleData.duration_hours * 60 * 60 * 1000));

      // Create or update subscription
      await query(`
        INSERT INTO subscriptions (user_id, bundle_id, payment_id, status, expires_at)
        VALUES (?, ?, ?, 'active', ?)
        ON DUPLICATE KEY UPDATE
        status = 'active',
        expires_at = VALUES(expires_at)
      `, [user_id, bundle_id, paymentId, expiresAt]);

      // Update bundle client count
      await query(
        'UPDATE bundles SET current_clients = current_clients + 1 WHERE id = ?',
        [bundle_id]
      );

      logger.info(`Subscription activated for user ${user_id}, bundle ${bundle_id}`);

      // Ensure the user has at least one active VPN configuration for this bundle.
      // To avoid duplicating configs, only generate a new one if there is no
      // active (non-expired) config for (user, bundle).
      try {
        const existingConfigs = await query(
          `SELECT id, status, expires_at
             FROM vpn_configs
            WHERE user_id = ? AND bundle_id = ?
            ORDER BY created_at DESC
            LIMIT 1`,
          [user_id, bundle_id]
        );

        const now = new Date();
        const hasActiveConfig =
          existingConfigs.length > 0 &&
          existingConfigs[0].status === 'active' &&
          existingConfigs[0].expires_at &&
          new Date(existingConfigs[0].expires_at) > now;

        if (!hasActiveConfig) {
          logger.info(
            `No active VPN config found for user ${user_id}, bundle ${bundle_id}; generating a new one.`,
          );
          await wireguardManager.generateClientConfig(user_id, bundle_id);
        } else {
          logger.info(
            `Active VPN config already exists for user ${user_id}, bundle ${bundle_id}; skipping generation.`,
          );
        }
      } catch (vpnError) {
        // Log VPN config generation issues but do not fail the payment flow.
        logger.error(
          `Failed to ensure VPN config for user ${user_id}, bundle ${bundle_id}:`,
          vpnError,
        );
      }

    } catch (error) {
      logger.error('Failed to activate subscription:', error);
      // Don't throw here to avoid affecting webhook response
    }
  }

  /**
   * Validate phone number compatibility (delegated to mobile app formatting).
   */
  validateProviderPhone(_provider, phoneNumber) {
    // Simple server-side format sanity check; initialization is not required here
    if (!phoneNumber || String(phoneNumber).trim().length < 6) {
      throw new Error('Invalid phone number');
    }

    return String(phoneNumber).trim();
  }
}

// Export singleton instance
module.exports = new PaymentManager();

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * Beem Gateway Service Implementation
 * Unified service for all Tanzania mobile money providers via Beem
 */
class BeemService {
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://checkout.beem.africa/v1' 
      : 'https://checkout-sandbox.beem.africa/v1';
    
    this.apiKey = process.env.BEEM_API_KEY || '5d74d43761ddab40';
    this.secretKey = process.env.BEEM_SECRET_KEY || 'NDEwNzA1NWZlN2Q2MjgxZGU0NzBlZGNiMWY0MjliYzAyOTkxNDQyYWEzZGViMTg1NzE2NDU1MGVhZmJlYzg4NA==';
    this.timeout = 30000; // 30 seconds
    this.callbackUrl = process.env.BEEM_CALLBACK_URL || 'https://your-domain.com/api/webhooks/beem';
  }

  /**
   * Create a mobile money transaction record
   */
  async createTransaction(paymentId, provider, customerPhone, amount) {
    try {
      const expiresAt = new Date(Date.now() + (10 * 60 * 1000)); // 10 minutes
      
      const result = await query(
        `INSERT INTO mobile_money_transactions 
         (payment_id, provider, customer_phone, status, expires_at, created_at) 
         VALUES (?, ?, ?, 'initiated', ?, NOW())`,
        [paymentId, provider, customerPhone, expiresAt]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Failed to create mobile money transaction:', error);
      throw error;
    }
  }

  /**
   * Update mobile money transaction
   */
  async updateTransaction(transactionId, updates) {
    try {
      const fields = [];
      const values = [];

      Object.keys(updates).forEach(key => {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      });

      values.push(transactionId);

      await query(
        `UPDATE mobile_money_transactions 
         SET ${fields.join(', ')}, updated_at = NOW() 
         WHERE id = ?`,
        values
      );

      logger.info(`Mobile money transaction ${transactionId} updated`);
    } catch (error) {
      logger.error('Failed to update mobile money transaction:', error);
      throw error;
    }
  }

  /**
   * Generate authentication signature for Beem API
   */
  generateSignature(data, timestamp) {
    const payload = JSON.stringify(data) + timestamp;
    const decodedSecret = Buffer.from(this.secretKey, 'base64').toString('utf8');
    
    return crypto
      .createHmac('sha256', decodedSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Make authenticated request to Beem API
   */
  async makeRequest(method, endpoint, data = null) {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = this.generateSignature(data || {}, timestamp);
      
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Beem-Timestamp': timestamp,
          'X-Beem-Signature': signature,
          'User-Agent': 'Konektika-VPN/1.0'
        },
        timeout: this.timeout
      };

      if (data) {
        config.data = data;
      }

      logger.info(`Making ${method} request to Beem: ${endpoint}`);
      const response = await axios(config);
      
      logger.info(`Beem API response: ${response.status}`);
      return response;

    } catch (error) {
      if (error.response) {
        logger.error(`Beem API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        throw new Error(`Beem API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        logger.error('Beem Network Error: No response received');
        throw new Error('Network Error: Unable to connect to Beem Gateway');
      } else {
        logger.error('Beem Request Error:', error.message);
        throw error;
      }
    }
  }

  /**
   * Validate phone number format for Tanzania
   */
  validatePhoneNumber(phone) {
    // Remove spaces and special characters
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Tanzania phone number validation
    const tzPhoneRegex = /^(\+255|255|0)?([67]\d{8})$/;
    const match = cleanPhone.match(tzPhoneRegex);
    
    if (!match) {
      throw new Error('Invalid Tanzania phone number format');
    }

    // Format to international format
    return `255${match[2]}`;
  }

  /**
   * Validate amount
   */
  validateAmount(amount, minAmount = 500, maxAmount = 1000000) {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Invalid amount');
    }

    if (numAmount < minAmount) {
      throw new Error(`Minimum amount is TZS ${minAmount}`);
    }

    if (numAmount > maxAmount) {
      throw new Error(`Maximum amount is TZS ${maxAmount}`);
    }

    return Math.round(numAmount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Generate unique transaction reference
   */
  generateTransactionRef(prefix = 'KNK') {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Map provider names to Beem channel codes
   */
  getBeemChannel(provider) {
    const channelMap = {
      'vodacom_mpesa': 'MPESA',
      'tigo_pesa': 'TIGOPESA',
      'airtel_money': 'AIRTELMONEY',
      'mobile_money': 'ALL' // For when user can choose any provider
    };
    
    return channelMap[provider] || 'ALL';
  }

  /**
   * Initiate payment with Beem Gateway
   */
  async initiatePayment(paymentId, amount, phoneNumber, provider = 'mobile_money', description = 'VPN Bundle Purchase') {
    let transactionId = null;

    try {
      logger.info(`Initiating Beem payment for payment ID: ${paymentId}`);

      // Validate inputs
      const validAmount = this.validateAmount(amount);
      const validPhone = this.validatePhoneNumber(phoneNumber);

      // Create transaction record
      transactionId = await this.createTransaction(paymentId, provider, validPhone, validAmount);

      // Generate transaction reference
      const transactionRef = this.generateTransactionRef('BEEM');

      // Prepare payment request
      const paymentData = {
        amount: validAmount,
        currency: 'TZS',
        mobile: validPhone,
        reference: transactionRef,
        description: description,
        channel: this.getBeemChannel(provider),
        callback_url: this.callbackUrl,
        metadata: {
          payment_id: paymentId,
          transaction_id: transactionId,
          user_phone: validPhone
        }
      };

      // Update transaction with request data
      await this.updateTransaction(transactionId, {
        provider_reference: transactionRef,
        api_request: JSON.stringify(paymentData),
        status: 'pending'
      });

      logger.info(`Sending Beem payment request for transaction ${transactionId}`);

      // Make payment request to Beem
      const response = await this.makeRequest('POST', '/payments', paymentData);

      // Update transaction with response
      await this.updateTransaction(transactionId, {
        provider_transaction_id: response.data.id || response.data.reference,
        provider_status: response.data.status,
        api_response: JSON.stringify(response.data)
      });

      const isSuccess = response.data.status === 'PENDING' || response.data.status === 'SUCCESS';

      logger.info(`Beem payment initiated for transaction ${transactionId}: ${response.data.status}`);

      return {
        success: isSuccess,
        transaction_id: transactionId,
        provider_transaction_id: response.data.id || response.data.reference,
        message: response.data.message || 'Payment initiated',
        reference_id: transactionRef,
        status: response.data.status,
        checkout_url: response.data.checkout_url || null
      };

    } catch (error) {
      logger.error('Beem payment initiation failed:', error);
      
      // Update transaction with error
      if (transactionId) {
        await this.updateTransaction(transactionId, {
          status: 'failed',
          error_message: error.message
        });
      }

      throw error;
    }
  }

  /**
   * Query payment status from Beem
   */
  async queryPaymentStatus(referenceId) {
    try {
      logger.info(`Querying Beem payment status for: ${referenceId}`);

      const response = await this.makeRequest('GET', `/payments/${referenceId}`);

      const isSuccess = response.data.status === 'SUCCESS' || response.data.status === 'COMPLETED';

      return {
        success: response.status === 200,
        status: isSuccess ? 'completed' : response.data.status.toLowerCase(),
        message: response.data.message || 'Status retrieved',
        data: response.data
      };

    } catch (error) {
      logger.error('Beem payment query failed:', error);
      throw error;
    }
  }

  /**
   * Process Beem callback/webhook
   */
  async processCallback(callbackData) {
    try {
      logger.info('Processing Beem callback:', JSON.stringify(callbackData));

      const referenceId = callbackData.reference;
      const status = callbackData.status;
      
      // Find transaction by reference ID
      const transactions = await query(
        'SELECT * FROM mobile_money_transactions WHERE provider_reference = ?',
        [referenceId]
      );

      if (transactions.length === 0) {
        logger.warn(`No transaction found for ReferenceID: ${referenceId}`);
        return { success: false, message: 'Transaction not found' };
      }

      const transaction = transactions[0];
      const isSuccess = status === 'SUCCESS' || status === 'COMPLETED';

      // Prepare update data
      const updateData = {
        webhook_data: JSON.stringify(callbackData),
        provider_status: status,
        status: isSuccess ? 'completed' : 'failed'
      };

      if (!isSuccess && callbackData.error) {
        updateData.error_code = callbackData.error.code;
        updateData.error_message = callbackData.error.message;
      }

      // Update transaction
      await this.updateTransaction(transaction.id, updateData);

      // Update main payment record
      await query(
        'UPDATE payments SET status = ?, paid_at = ? WHERE id = ?',
        [isSuccess ? 'completed' : 'failed', isSuccess ? new Date() : null, transaction.payment_id]
      );

      logger.info(`Beem callback processed for transaction ${transaction.id}: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);

      return {
        success: true,
        transaction_id: transaction.id,
        payment_status: isSuccess ? 'completed' : 'failed'
      };

    } catch (error) {
      logger.error('Failed to process Beem callback:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature from Beem
   */
  verifyWebhookSignature(payload, signature, timestamp) {
    try {
      const expectedSignature = this.generateSignature(payload, timestamp);
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      return false;
    }
  }
}

module.exports = BeemService;
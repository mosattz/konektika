const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * Base Mobile Money Service Class
 * Provides common functionality for all mobile money providers
 */
class MobileMoneyService {
  constructor(config) {
    this.config = config;
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Create a mobile money transaction record
   */
  async createTransaction(paymentId, provider, customerPhone, amount) {
    try {
      const expiresAt = new Date(Date.now() + (this.config.timeout_minutes * 60 * 1000));
      
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
   * Get mobile money transaction by ID
   */
  async getTransaction(transactionId) {
    try {
      const transactions = await query(
        'SELECT * FROM mobile_money_transactions WHERE id = ?',
        [transactionId]
      );

      return transactions[0] || null;
    } catch (error) {
      logger.error('Failed to get mobile money transaction:', error);
      throw error;
    }
  }

  /**
   * Get mobile money transaction by payment ID
   */
  async getTransactionByPayment(paymentId) {
    try {
      const transactions = await query(
        'SELECT * FROM mobile_money_transactions WHERE payment_id = ?',
        [paymentId]
      );

      return transactions[0] || null;
    } catch (error) {
      logger.error('Failed to get mobile money transaction by payment:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  async makeRequest(method, url, data = null, headers = {}) {
    try {
      const config = {
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Konektika-VPN/1.0',
          ...headers
        },
        timeout: this.timeout
      };

      if (data) {
        config.data = data;
      }

      logger.info(`Making ${method} request to ${url}`);
      const response = await axios(config);
      
      logger.info(`Request successful: ${response.status}`);
      return response;

    } catch (error) {
      if (error.response) {
        logger.error(`API Error: ${error.response.status} - ${error.response.data}`);
        throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        logger.error('Network Error: No response received');
        throw new Error('Network Error: Unable to connect to payment provider');
      } else {
        logger.error('Request Error:', error.message);
        throw error;
      }
    }
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
   * Validate phone number format
   */
  validatePhoneNumber(phone, provider) {
    // Remove spaces and special characters
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Tanzania phone number validation
    const tzPhoneRegex = /^(\+255|255|0)?([67]\d{8})$/;
    const match = cleanPhone.match(tzPhoneRegex);
    
    if (!match) {
      throw new Error('Invalid Tanzania phone number format');
    }

    // Format to international format
    const formattedPhone = `255${match[2]}`;

    // Provider-specific validation
    switch (provider) {
      case 'vodacom_mpesa':
        if (!match[2].startsWith('7')) {
          throw new Error('M-Pesa requires Vodacom number (starting with 75/76)');
        }
        break;
      case 'tigo_pesa':
        if (!match[2].startsWith('6')) {
          throw new Error('Tigo Pesa requires Tigo number (starting with 65/67)');
        }
        break;
      case 'airtel_money':
        if (!match[2].startsWith('6') && !match[2].startsWith('7')) {
          throw new Error('Airtel Money requires Airtel number');
        }
        break;
    }

    return formattedPhone;
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
   * Generate webhook signature for validation
   */
  generateWebhookSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = this.generateWebhookSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = MobileMoneyService;
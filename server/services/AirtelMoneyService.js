const MobileMoneyService = require('./MobileMoneyService');
const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * Airtel Money Service Implementation
 * Handles Airtel Money payment processing
 */
class AirtelMoneyService extends MobileMoneyService {
  constructor(config) {
    super(config);
    this.baseUrl = config.sandbox ? 
      'https://openapiuat.airtel.africa' : 
      'https://openapi.airtel.africa';
    this.clientId = config.client_id;
    this.clientSecret = config.client_secret;
    this.apiKey = config.api_key;
    this.countryCode = 'TZ'; // Tanzania
    this.currencyCode = 'TZS';
    this.callbackUrl = config.callback_url;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth access token
   */
  async getAccessToken() {
    try {
      // Return cached token if still valid
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      logger.info('Getting Airtel Money access token...');

      const response = await this.makeRequest(
        'POST',
        `${this.baseUrl}/auth/oauth2/token`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials'
        },
        {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer

      logger.info('Airtel Money access token obtained successfully');
      return this.accessToken;

    } catch (error) {
      logger.error('Failed to get Airtel Money access token:', error);
      throw new Error('Failed to authenticate with Airtel Money API');
    }
  }

  /**
   * Initiate payment collection
   */
  async initiatePayment(paymentId, amount, phoneNumber, description = 'VPN Bundle Purchase') {
    try {
      logger.info(`Initiating Airtel Money payment for payment ID: ${paymentId}`);

      // Validate inputs
      const validAmount = this.validateAmount(amount);
      const validPhone = this.validatePhoneNumber(phoneNumber, 'airtel_money');

      // Create transaction record
      const transactionId = await this.createTransaction(paymentId, 'airtel_money', validPhone, validAmount);

      // Get access token
      const accessToken = await this.getAccessToken();

      // Generate transaction reference
      const transactionRef = this.generateTransactionRef('AMX');

      // Format phone number for Airtel API (remove country code)
      const phoneForApi = validPhone.startsWith('255') ? validPhone.substring(3) : validPhone;

      const requestData = {
        reference: transactionRef,
        subscriber: {
          country: this.countryCode,
          currency: this.currencyCode,
          msisdn: phoneForApi
        },
        transaction: {
          amount: Math.round(validAmount),
          country: this.countryCode,
          currency: this.currencyCode,
          id: transactionRef
        }
      };

      // Update transaction with request data
      await this.updateTransaction(transactionId, {
        provider_reference: transactionRef,
        api_request: JSON.stringify(requestData),
        status: 'pending'
      });

      logger.info(`Sending payment request for transaction ${transactionId}`);

      const response = await this.makeRequest(
        'POST',
        `${this.baseUrl}/merchant/v1/payments/`,
        requestData,
        {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Country': this.countryCode,
          'X-Currency': this.currencyCode
        }
      );

      // Update transaction with response
      await this.updateTransaction(transactionId, {
        provider_transaction_id: response.data.transaction.id,
        provider_status: response.data.status.code,
        api_response: JSON.stringify(response.data)
      });

      const isSuccess = response.data.status.code === '200' || response.data.status.success;

      logger.info(`Airtel Money payment initiated for transaction ${transactionId}: ${isSuccess ? 'SUCCESS' : 'PENDING'}`);

      return {
        success: isSuccess,
        transaction_id: transactionId,
        provider_transaction_id: response.data.transaction.id,
        message: response.data.status.message,
        reference_id: transactionRef,
        airtel_transaction_id: response.data.transaction.airtel_money_id
      };

    } catch (error) {
      logger.error('Airtel Money payment initiation failed:', error);
      
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
   * Query payment status
   */
  async queryPaymentStatus(transactionId) {
    try {
      logger.info(`Querying Airtel Money payment status for: ${transactionId}`);

      const accessToken = await this.getAccessToken();

      const response = await this.makeRequest(
        'GET',
        `${this.baseUrl}/standard/v1/payments/${transactionId}`,
        null,
        {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-Country': this.countryCode,
          'X-Currency': this.currencyCode
        }
      );

      const isSuccess = response.data.status.code === '200' || 
                       response.data.status.result_code === 'ESB000010' || 
                       response.data.transaction.status === 'TS';

      return {
        success: response.status === 200,
        status: isSuccess ? 'completed' : 'failed',
        message: response.data.status.message,
        data: response.data
      };

    } catch (error) {
      logger.error('Airtel Money payment query failed:', error);
      throw error;
    }
  }

  /**
   * Process Airtel Money callback/webhook
   */
  async processCallback(callbackData) {
    try {
      logger.info('Processing Airtel Money callback:', JSON.stringify(callbackData));

      const referenceId = callbackData.transaction.external_id || callbackData.reference;
      
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
      const isSuccess = callbackData.status.code === '200' || 
                       callbackData.status.result_code === 'ESB000010' ||
                       callbackData.transaction.status === 'TS';

      // Prepare update data
      const updateData = {
        webhook_data: JSON.stringify(callbackData),
        provider_status: callbackData.status.code || callbackData.status.result_code,
        status: isSuccess ? 'completed' : 'failed'
      };

      if (!isSuccess) {
        updateData.error_code = callbackData.status.code || callbackData.status.result_code;
        updateData.error_message = callbackData.status.message;
      }

      // Update transaction
      await this.updateTransaction(transaction.id, updateData);

      // Update main payment record
      await query(
        'UPDATE payments SET status = ?, paid_at = ? WHERE id = ?',
        [isSuccess ? 'completed' : 'failed', isSuccess ? new Date() : null, transaction.payment_id]
      );

      logger.info(`Airtel Money callback processed for transaction ${transaction.id}: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);

      return {
        success: true,
        transaction_id: transaction.id,
        payment_status: isSuccess ? 'completed' : 'failed'
      };

    } catch (error) {
      logger.error('Failed to process Airtel Money callback:', error);
      throw error;
    }
  }

  /**
   * Validate phone number for Airtel (more flexible)
   */
  validatePhoneNumber(phone, provider) {
    // Use base validation but more flexible for Airtel
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Tanzania phone number validation
    const tzPhoneRegex = /^(\+255|255|0)?([67]\d{8})$/;
    const match = cleanPhone.match(tzPhoneRegex);
    
    if (!match) {
      throw new Error('Invalid Tanzania phone number format');
    }

    // Format to international format
    const formattedPhone = `255${match[2]}`;

    // Airtel supports multiple prefixes, so less strict validation
    return formattedPhone;
  }
}

module.exports = AirtelMoneyService;
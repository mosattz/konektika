const MobileMoneyService = require('./MobileMoneyService');
const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * Tigo Pesa Service Implementation
 * Handles Tigo Pesa payment processing
 */
class TigoPesaService extends MobileMoneyService {
  constructor(config) {
    super(config);
    this.baseUrl = config.sandbox ? 
      'https://sandbox.tigo.co.tz/v1' : 
      'https://api.tigo.co.tz/v1';
    this.apiKey = config.api_key;
    this.apiSecret = config.api_secret;
    this.brandId = config.brand_id || 'KONEKTIKA';
    this.callbackUrl = config.callback_url;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get Bearer access token
   */
  async getAccessToken() {
    try {
      // Return cached token if still valid
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      logger.info('Getting Tigo Pesa access token...');

      const response = await this.makeRequest(
        'POST',
        `${this.baseUrl}/oauth/generate/accesstoken?grant_type=client_credentials`,
        {
          client_id: this.apiKey,
          client_secret: this.apiSecret
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer

      logger.info('Tigo Pesa access token obtained successfully');
      return this.accessToken;

    } catch (error) {
      logger.error('Failed to get Tigo Pesa access token:', error);
      throw new Error('Failed to authenticate with Tigo Pesa API');
    }
  }

  /**
   * Initiate payment collection
   */
  async initiatePayment(paymentId, amount, phoneNumber, description = 'VPN Bundle Purchase') {
    try {
      logger.info(`Initiating Tigo Pesa payment for payment ID: ${paymentId}`);

      // Validate inputs
      const validAmount = this.validateAmount(amount);
      const validPhone = this.validatePhoneNumber(phoneNumber, 'tigo_pesa');

      // Create transaction record
      const transactionId = await this.createTransaction(paymentId, 'tigo_pesa', validPhone, validAmount);

      // Get access token
      const accessToken = await this.getAccessToken();

      // Generate transaction reference
      const transactionRef = this.generateTransactionRef('TPX');

      const requestData = {
        MasterMerchant: {
          account: this.apiKey,
          pin: this.apiSecret,
          id: this.brandId
        },
        Subscriber: {
          account: validPhone,
          countryCode: '255',
          country: 'TZA',
          currency: 'TZS',
          language: 'eng'
        },
        Amount: Math.round(validAmount),
        ReferenceID: transactionRef,
        Description: description,
        CallBackUrl: this.callbackUrl
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
        `${this.baseUrl}/mobile/payment/collection`,
        requestData,
        {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      );

      // Update transaction with response
      await this.updateTransaction(transactionId, {
        provider_transaction_id: response.data.TransactionID || response.data.ReferenceID,
        provider_status: response.data.ResponseCode || response.data.Status,
        api_response: JSON.stringify(response.data)
      });

      const isSuccess = response.data.ResponseCode === '200' || response.data.Status === 'success';

      logger.info(`Tigo Pesa payment initiated for transaction ${transactionId}: ${isSuccess ? 'SUCCESS' : 'PENDING'}`);

      return {
        success: isSuccess,
        transaction_id: transactionId,
        provider_transaction_id: response.data.TransactionID || response.data.ReferenceID,
        message: response.data.ResponseDescription || response.data.Message,
        reference_id: transactionRef
      };

    } catch (error) {
      logger.error('Tigo Pesa payment initiation failed:', error);
      
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
  async queryPaymentStatus(referenceId) {
    try {
      logger.info(`Querying Tigo Pesa payment status for: ${referenceId}`);

      const accessToken = await this.getAccessToken();

      const requestData = {
        MasterMerchant: {
          account: this.apiKey,
          pin: this.apiSecret,
          id: this.brandId
        },
        ReferenceID: referenceId
      };

      const response = await this.makeRequest(
        'POST',
        `${this.baseUrl}/mobile/payment/status`,
        requestData,
        {
          'Authorization': `Bearer ${accessToken}`
        }
      );

      const isSuccess = response.data.Status === 'success' || response.data.ResponseCode === '200';

      return {
        success: response.status === 200,
        status: isSuccess ? 'completed' : 'failed',
        message: response.data.Message || response.data.ResponseDescription,
        data: response.data
      };

    } catch (error) {
      logger.error('Tigo Pesa payment query failed:', error);
      throw error;
    }
  }

  /**
   * Process Tigo Pesa callback/webhook
   */
  async processCallback(callbackData) {
    try {
      logger.info('Processing Tigo Pesa callback:', JSON.stringify(callbackData));

      const referenceId = callbackData.ReferenceID || callbackData.reference_id;
      
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
      const isSuccess = callbackData.Status === 'success' || callbackData.ResponseCode === '200';

      // Prepare update data
      const updateData = {
        webhook_data: JSON.stringify(callbackData),
        provider_status: callbackData.ResponseCode || callbackData.Status,
        status: isSuccess ? 'completed' : 'failed'
      };

      if (!isSuccess) {
        updateData.error_code = callbackData.ResponseCode || callbackData.ErrorCode;
        updateData.error_message = callbackData.Message || callbackData.ErrorMessage;
      }

      // Update transaction
      await this.updateTransaction(transaction.id, updateData);

      // Update main payment record
      await query(
        'UPDATE payments SET status = ?, paid_at = ? WHERE id = ?',
        [isSuccess ? 'completed' : 'failed', isSuccess ? new Date() : null, transaction.payment_id]
      );

      logger.info(`Tigo Pesa callback processed for transaction ${transaction.id}: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);

      return {
        success: true,
        transaction_id: transaction.id,
        payment_status: isSuccess ? 'completed' : 'failed'
      };

    } catch (error) {
      logger.error('Failed to process Tigo Pesa callback:', error);
      throw error;
    }
  }
}

module.exports = TigoPesaService;
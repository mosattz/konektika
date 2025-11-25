const MobileMoneyService = require('./MobileMoneyService');
const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * Vodacom M-Pesa Service Implementation
 * Handles M-Pesa payment processing
 */
class MPesaService extends MobileMoneyService {
  constructor(config) {
    super(config);
    this.baseUrl = config.sandbox ? 
      'https://sandbox.vodacom.co.tz/mpesa' : 
      'https://api.vodacom.co.tz/mpesa';
    this.consumerKey = config.consumer_key;
    this.consumerSecret = config.consumer_secret;
    this.businessShortCode = config.business_shortcode;
    this.passkey = config.passkey;
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

      logger.info('Getting M-Pesa OAuth access token...');

      const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await this.makeRequest(
        'GET',
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        null,
        {
          'Authorization': `Basic ${credentials}`
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer

      logger.info('M-Pesa access token obtained successfully');
      return this.accessToken;

    } catch (error) {
      logger.error('Failed to get M-Pesa access token:', error);
      throw new Error('Failed to authenticate with M-Pesa API');
    }
  }

  /**
   * Generate timestamp for M-Pesa requests
   */
  generateTimestamp() {
    const now = new Date();
    return now.getFullYear() +
           String(now.getMonth() + 1).padStart(2, '0') +
           String(now.getDate()).padStart(2, '0') +
           String(now.getHours()).padStart(2, '0') +
           String(now.getMinutes()).padStart(2, '0') +
           String(now.getSeconds()).padStart(2, '0');
  }

  /**
   * Generate M-Pesa password
   */
  generatePassword(timestamp) {
    const data = `${this.businessShortCode}${this.passkey}${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  /**
   * Initiate STK Push (Customer to Business payment)
   */
  async initiatePayment(paymentId, amount, phoneNumber, description = 'VPN Bundle Purchase') {
    try {
      logger.info(`Initiating M-Pesa payment for payment ID: ${paymentId}`);

      // Validate inputs
      const validAmount = this.validateAmount(amount);
      const validPhone = this.validatePhoneNumber(phoneNumber, 'vodacom_mpesa');

      // Create transaction record
      const transactionId = await this.createTransaction(paymentId, 'vodacom_mpesa', validPhone, validAmount);

      // Get access token
      const accessToken = await this.getAccessToken();

      // Generate request parameters
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);
      const transactionRef = this.generateTransactionRef('MPX');

      const requestData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(validAmount),
        PartyA: validPhone,
        PartyB: this.businessShortCode,
        PhoneNumber: validPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: `KONEKTIKA-${paymentId}`,
        TransactionDesc: description
      };

      // Update transaction with request data
      await this.updateTransaction(transactionId, {
        provider_reference: transactionRef,
        api_request: JSON.stringify(requestData),
        status: 'pending'
      });

      logger.info(`Sending STK push request for transaction ${transactionId}`);

      const response = await this.makeRequest(
        'POST',
        `${this.baseUrl}/stkpush/v1/processrequest`,
        requestData,
        {
          'Authorization': `Bearer ${accessToken}`
        }
      );

      // Update transaction with response
      await this.updateTransaction(transactionId, {
        provider_transaction_id: response.data.CheckoutRequestID,
        provider_status: response.data.ResponseCode,
        api_response: JSON.stringify(response.data)
      });

      logger.info(`STK push initiated successfully for transaction ${transactionId}`);

      return {
        success: response.data.ResponseCode === '0',
        transaction_id: transactionId,
        provider_transaction_id: response.data.CheckoutRequestID,
        message: response.data.ResponseDescription,
        checkout_request_id: response.data.CheckoutRequestID
      };

    } catch (error) {
      logger.error('M-Pesa payment initiation failed:', error);
      
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
  async queryPaymentStatus(checkoutRequestId) {
    try {
      logger.info(`Querying M-Pesa payment status for: ${checkoutRequestId}`);

      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const requestData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await this.makeRequest(
        'POST',
        `${this.baseUrl}/stkpushquery/v1/query`,
        requestData,
        {
          'Authorization': `Bearer ${accessToken}`
        }
      );

      return {
        success: response.data.ResponseCode === '0',
        status: response.data.ResultCode === '0' ? 'completed' : 'failed',
        message: response.data.ResultDesc,
        data: response.data
      };

    } catch (error) {
      logger.error('M-Pesa payment query failed:', error);
      throw error;
    }
  }

  /**
   * Process M-Pesa callback/webhook
   */
  async processCallback(callbackData) {
    try {
      logger.info('Processing M-Pesa callback:', JSON.stringify(callbackData));

      const { Body } = callbackData;
      const { stkCallback } = Body;

      // Find transaction by checkout request ID
      const transactions = await query(
        'SELECT * FROM mobile_money_transactions WHERE provider_transaction_id = ?',
        [stkCallback.CheckoutRequestID]
      );

      if (transactions.length === 0) {
        logger.warn(`No transaction found for CheckoutRequestID: ${stkCallback.CheckoutRequestID}`);
        return { success: false, message: 'Transaction not found' };
      }

      const transaction = transactions[0];
      const isSuccess = stkCallback.ResultCode === 0;

      // Prepare update data
      const updateData = {
        webhook_data: JSON.stringify(callbackData),
        provider_status: stkCallback.ResultCode.toString(),
        status: isSuccess ? 'completed' : 'failed'
      };

      if (!isSuccess) {
        updateData.error_code = stkCallback.ResultCode.toString();
        updateData.error_message = stkCallback.ResultDesc;
      }

      // Extract callback metadata if successful
      if (isSuccess && stkCallback.CallbackMetadata) {
        const metadata = {};
        stkCallback.CallbackMetadata.Item.forEach(item => {
          metadata[item.Name] = item.Value;
        });
        updateData.api_response = JSON.stringify(metadata);
      }

      // Update transaction
      await this.updateTransaction(transaction.id, updateData);

      // Update main payment record
      await query(
        'UPDATE payments SET status = ?, paid_at = ? WHERE id = ?',
        [isSuccess ? 'completed' : 'failed', isSuccess ? new Date() : null, transaction.payment_id]
      );

      logger.info(`M-Pesa callback processed for transaction ${transaction.id}: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);

      return {
        success: true,
        transaction_id: transaction.id,
        payment_status: isSuccess ? 'completed' : 'failed'
      };

    } catch (error) {
      logger.error('Failed to process M-Pesa callback:', error);
      throw error;
    }
  }
}

module.exports = MPesaService;
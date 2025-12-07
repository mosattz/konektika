const axios = require('axios');
const logger = require('../utils/logger');

/**
 * PesaPal Gateway Service (v3)
 * Handles token generation and payment/status calls.
 *
 * NOTE: Endpoint paths and payload shapes MUST be filled in from
 * official PesaPal v3 documentation before going live.
 */
class PesapalService {
  constructor() {
    this.baseUrl = process.env.PESAPAL_BASE_URL || 'https://pay.pesapal.com/v3';
    this.consumerKey = process.env.PESAPAL_CONSUMER_KEY;
    this.consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

    this.token = null;
    this.tokenExpiresAt = 0; // epoch ms
  }

  /**
   * Get or refresh access token from PesaPal.
   */
  async getAccessToken() {
    const now = Date.now();
    if (this.token && this.tokenExpiresAt > now + 60 * 1000) {
      return this.token;
    }

    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error('PESAPAL_CONSUMER_KEY or PESAPAL_CONSUMER_SECRET is not configured');
    }

    const url = `${this.baseUrl}/api/Auth/RequestToken`;

    logger.info('Requesting new PesaPal access token');

    const response = await axios.post(
      url,
      {
        consumer_key: this.consumerKey,
        consumer_secret: this.consumerSecret,
      },
      {
        timeout: 30000,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data || {};
    this.token = data.token;

    if (!this.token) {
      throw new Error('Failed to obtain PesaPal token');
    }

    // expiryDate is an ISO string, e.g. "2025-11-16T...Z"
    if (data.expiryDate) {
      const expiry = Date.parse(data.expiryDate);
      this.tokenExpiresAt = isNaN(expiry) ? now + 5 * 60 * 1000 : expiry;
    } else {
      // Fallback: 5 minutes
      this.tokenExpiresAt = now + 5 * 60 * 1000;
    }

    logger.info('PesaPal access token obtained');
    return this.token;
  }

  /**
   * Helper: make authenticated request to PesaPal.
   */
  async request(method, path, body) {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${path}`;

    const config = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };

    if (body) {
      config.data = body;
    }

    logger.info(`PesaPal ${method} ${path}`);
    const response = await axios(config);
    return response.data;
  }

  /**
   * Initiate a PesaPal payment using SubmitOrderRequest.
   *
   * NOTE: This assumes you have already registered an IPN URL and
   * stored the GUID in PESAPAL_IPN_ID. You may also want to configure
   * callback/cancel URLs via env.
   */
  async initiatePayment({ amount, currency, phoneNumber, orderReference, description, billingAddress }) {
    const notificationId = process.env.PESAPAL_IPN_ID;
    const callbackUrl = process.env.PESAPAL_CALLBACK_URL || '';
    const cancelUrl = process.env.PESAPAL_CANCEL_URL || callbackUrl;

    if (!notificationId) {
      throw new Error('PESAPAL_IPN_ID is not configured. Please register your IPN URL and set PESAPAL_IPN_ID.');
    }

    const body = {
      // Merchant reference / ID you control (Pesapal docs refer to this as merchant_reference / id)
      id: orderReference,
      merchant_reference: orderReference,
      amount,
      currency,
      description: description || 'Konektika VPN Bundle Purchase',
      callback_url: callbackUrl,
      cancellation_url: cancelUrl,
      notification_id: notificationId,
      billing_address: billingAddress,
    };

    const data = await this.request('POST', '/api/Transactions/SubmitOrderRequest', body);

    // Expecting: { order_tracking_id, merchant_reference, redirect_url, ... }
    if (!data || !data.order_tracking_id) {
      throw new Error(`Unexpected PesaPal SubmitOrderResponse: ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Query PesaPal payment status by orderTrackingId.
   */
  async getPaymentStatus(orderTrackingId) {
    if (!orderTrackingId) {
      throw new Error('orderTrackingId is required to query PesaPal status');
    }

    const path = `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(
      orderTrackingId,
    )}`;

    const data = await this.request('GET', path);
    return data;
  }
}

module.exports = PesapalService;

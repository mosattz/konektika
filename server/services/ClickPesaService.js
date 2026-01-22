const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * ClickPesa Gateway Service
 * Handles token generation, USSD push, card payments and queries.
 */
class ClickPesaService {
  constructor() {
    this.baseUrl = 'https://api.clickpesa.com/third-parties';
    this.clientId = process.env.CLICKPESA_CLIENT_ID;
    this.apiKey = process.env.CLICKPESA_API_KEY;
    this.webhookSecret = process.env.CLICKPESA_WEBHOOK_SECRET;

    this.token = null;
    this.tokenExpiresAt = 0; // epoch ms
  }

  /**
   * Get or refresh access token from ClickPesa.
   */
  async getAccessToken() {
    const now = Date.now();
    if (this.token && this.tokenExpiresAt > now + 60 * 1000) {
      return this.token;
    }

    if (!this.clientId || !this.apiKey) {
      throw new Error('CLICKPESA_CLIENT_ID or CLICKPESA_API_KEY is not configured');
    }

    const url = `${this.baseUrl}/generate-token`;

    logger.info('Requesting new ClickPesa access token');

    const response = await axios.post(
      url,
      undefined,
      {
        headers: {
          'client-id': this.clientId,
          'api-key': this.apiKey,
        },
        timeout: 30000,
      }
    );

    const data = response.data || {};
    this.token = data.token || data.accessToken || data.access_token;

    if (!this.token) {
      throw new Error('Failed to obtain ClickPesa token');
    }

    const ttlSeconds = data.expiresIn || data.expires_in || 3600;
    this.tokenExpiresAt = now + ttlSeconds * 1000;

    logger.info('ClickPesa access token obtained');
    return this.token;
  }

  /**
   * Helper: make authenticated request to ClickPesa.
   */
  async request(method, path, body) {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${path}`;

    const config = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };

    if (body) {
      config.data = body;
    }

    logger.info(`ClickPesa ${method} ${path}`);
    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      logger.error('ClickPesa request error', { status, data });
      throw error;
    }
  }

  /**
   * Generate checksum for payload using a shared secret.
   * NOTE: The exact checksum algorithm should follow ClickPesa docs;
   * here we use HMAC-SHA256 over JSON stringified body for illustration.
   */
  generateChecksum(payload) {
    const secret = process.env.CLICKPESA_CHECKSUM_SECRET || '';
    const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(json).digest('hex');
  }

  /**
   * Preview USSD push payment.
   */
  async previewUssdPush({ amount, currency, orderReference, phoneNumber, fetchSenderDetails = false }) {
    const body = {
      amount: String(amount),
      currency,
      orderReference,
      phoneNumber,
      fetchSenderDetails,
    };

    body.checksum = this.generateChecksum(body);

    return this.request('POST', '/payments/preview-ussd-push-request', body);
  }

  /**
   * Initiate USSD push payment.
   */
  async initiateUssdPush({ amount, currency, orderReference, phoneNumber }) {
    const body = {
      amount: String(amount),
      currency,
      orderReference,
      phoneNumber,
    };

    body.checksum = this.generateChecksum(body);

    return this.request('POST', '/payments/initiate-ussd-push-request', body);
  }

  /**
   * Preview card payment.
   */
  async previewCardPayment({ amount, currency, orderReference }) {
    const body = {
      amount: String(amount),
      currency,
      orderReference,
    };

    body.checksum = this.generateChecksum(body);

    return this.request('POST', '/payments/preview-card-payment', body);
  }

  /**
   * Initiate card payment.
   */
  async initiateCardPayment({ amount, currency, orderReference, customerId }) {
    const body = {
      amount: String(amount),
      currency,
      orderReference,
      customer: { id: customerId },
    };

    body.checksum = this.generateChecksum(body);

    return this.request('POST', '/payments/initiate-card-payment', body);
  }

  /**
   * Get payment by order reference.
   */
  async getPayment(orderReference) {
    return this.request('GET', `/payments/${encodeURIComponent(orderReference)}`);
  }

  /**
   * Get all payments.
   */
  async getAllPayments() {
    return this.request('GET', '/payments/all');
  }

  /**
   * Get account balance.
   */
  async getAccountBalance() {
    return this.request('GET', '/account/balance');
  }

  /**
   * Get account statement.
   */
  async getAccountStatement() {
    return this.request('GET', '/account/statement');
  }

  /**
   * Verify webhook signature using CLICKPESA_WEBHOOK_SECRET.
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) {
      logger.warn('CLICKPESA_WEBHOOK_SECRET not configured; skipping signature verification');
      return true; // fail-open in dev
    }

    const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(json)
      .digest('hex');

    const isValid = signature === expected;
    if (!isValid) {
      logger.warn('Invalid ClickPesa webhook signature');
    }
    return isValid;
  }
}

module.exports = ClickPesaService;

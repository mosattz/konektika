import ApiService from './ApiService';
import {API_CONFIG} from '../config/api';

export interface PaymentProvider {
  provider: string;
  name: string;
  enabled: boolean;
}

export interface InitiatePaymentRequest {
  bundle_id: number;
  phone_number: string;
  /**
   * Human-readable provider label (for client UI), e.g. "M-Pesa".
   */
  provider: string;
  /**
   * Backend payment method identifier; mapped from provider.
   */
  payment_method: string;
}

export interface Payment {
  id: number;
  user_id: number;
  bundle_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  paid_at?: string | null;
}

export interface PaymentInitResponse {
  success: boolean;
  payment?: Payment;
  reference?: string;
  redirect_url?: string;
  message?: string;
  error?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  payment?: Payment;
  error?: string;
}

export interface PaymentHistoryResponse {
  success: boolean;
  payments?: Payment[];
  error?: string;
}

export class PaymentService {
  /**
   * Get available payment providers
   */
  static async getProviders(): Promise<{success: boolean; providers?: PaymentProvider[]; error?: string}> {
    try {
      const response = await ApiService.get<{providers: PaymentProvider[]}>(
        API_CONFIG.ENDPOINTS.PAYMENTS.PROVIDERS
      );

      if (response.success && response.data) {
        return {
          success: true,
          providers: response.data.providers,
        };
      } else {
        return {
          success: false,
          error: response.error || 'Failed to fetch payment providers',
        };
      }
    } catch (error: any) {
      console.error('Get payment providers error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while fetching payment providers',
      };
    }
  }

  /**
   * Initiate a payment for a bundle
   */
  static async initiatePayment(request: InitiatePaymentRequest): Promise<PaymentInitResponse> {
    try {
      // Backend expects payment_method = 'pesapal' regardless of human-readable provider label
      const payload: InitiatePaymentRequest = {
        ...request,
        payment_method: 'pesapal',
      };

      const response = await ApiService.post<any>(
        API_CONFIG.ENDPOINTS.PAYMENTS.INITIATE,
        payload
      );

      console.log('PaymentService.initiatePayment raw response:', JSON.stringify(response, null, 2));

      const responsePayload = response.data as any;
      const inner = responsePayload?.data;

      // Server returns data with payment_id, transaction_reference, amount, currency, etc.
      const payment: Payment | undefined = inner
        ? {
            id: inner.payment_id,
            user_id: (inner.user_id as number) ?? 0,
            bundle_id: (inner.bundle_id as number) ?? request.bundle_id,
            amount: inner.amount,
            currency: inner.currency,
            payment_method: inner.payment_method,
            status: (inner.status as Payment['status']) ?? 'pending',
            created_at: (inner.created_at as string) ?? new Date().toISOString(),
            paid_at: inner.paid_at ?? null,
          }
        : undefined;

      const reference: string | undefined = inner?.transaction_reference;
      const redirect_url: string | undefined = inner?.redirect_url;

      if (response.success && payment) {
        return {
          success: true,
          payment,
          reference,
          redirect_url,
          message: responsePayload?.message || inner?.message || 'Payment initiated. Please complete the payment on your phone.',
        };
      } else {
        return {
          success: false,
          error: response.error || responsePayload?.message || responsePayload?.error || 'Failed to initiate payment',
        };
      }
    } catch (error: any) {
      console.error('Initiate payment error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while initiating payment',
      };
    }
  }

  /**
   * Check payment status
   */
  static async checkPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await ApiService.get<any>(
        API_CONFIG.ENDPOINTS.PAYMENTS.STATUS(paymentId)
      );

      console.log('PaymentService.checkPaymentStatus raw response:', JSON.stringify(response, null, 2));

      const payload = response.data as any;
      const inner = payload?.data;

      const payment: Payment | undefined = inner
        ? {
            id: inner.payment_id ?? inner.id,
            user_id: inner.user_id,
            bundle_id: inner.bundle_id,
            amount: inner.amount,
            currency: inner.currency,
            payment_method: inner.payment_method,
            status: inner.status,
            created_at: inner.created_at,
            paid_at: inner.paid_at ?? null,
          }
        : undefined;

      if (response.success && payment) {
        return {
          success: true,
          payment,
        };
      } else {
        return {
          success: false,
          error: response.error || payload?.message || payload?.error || 'Failed to check payment status',
        };
      }
    } catch (error: any) {
      console.error('Check payment status error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while checking payment status',
      };
    }
  }

  /**
   * Query payment by reference
   */
  static async queryPayment(reference: string): Promise<PaymentStatusResponse> {
    try {
      const response = await ApiService.get<any>(
        API_CONFIG.ENDPOINTS.PAYMENTS.QUERY(reference)
      );

      const payload = response.data as any;
      const inner = payload?.data;

      const payment: Payment | undefined = inner
        ? {
            id: inner.payment_id ?? inner.id,
            user_id: inner.user_id,
            bundle_id: inner.bundle_id,
            amount: inner.amount,
            currency: inner.currency,
            payment_method: inner.payment_method,
            status: inner.status,
            created_at: inner.created_at,
            paid_at: inner.paid_at ?? null,
          }
        : undefined;

      if (response.success && payment) {
        return {
          success: true,
          payment,
        };
      } else {
        return {
          success: false,
          error: response.error || payload?.message || payload?.error || 'Failed to query payment',
        };
      }
    } catch (error: any) {
      console.error('Query payment error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while querying payment',
      };
    }
  }

  /**
   * Get payment history
   */
  static async getPaymentHistory(): Promise<PaymentHistoryResponse> {
    try {
      const response = await ApiService.get<any>(
        API_CONFIG.ENDPOINTS.PAYMENTS.HISTORY
      );

      const payload = response.data as any;
      const inner = payload?.data;
      const payments: Payment[] | undefined =
        inner?.payments ?? payload?.payments;

      if (response.success && payments) {
        return {
          success: true,
          payments,
        };
      } else {
        return {
          success: false,
          error:
            response.error ||
            payload?.message ||
            payload?.error ||
            'Failed to fetch payment history',
        };
      }
    } catch (error: any) {
      console.error('Get payment history error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while fetching payment history',
      };
    }
  }
}

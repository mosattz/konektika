import ApiService from './ApiService';
import {API_CONFIG} from '../config/api';

export interface Bundle {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  data_limit_gb: number;
  price: number;
  duration_days: number;
  max_connections: number;
  is_active: boolean;
  created_at: string;
  owner_name?: string;
}

export interface BundleListResponse {
  success: boolean;
  bundles?: Bundle[];
  error?: string;
}

export interface BundleDetailResponse {
  success: boolean;
  bundle?: Bundle;
  error?: string;
}

export class BundleService {
  /**
   * Get all available bundles
   */
  static async getBundles(): Promise<BundleListResponse> {
    try {
      const response = await ApiService.get<any>(
        API_CONFIG.ENDPOINTS.BUNDLES.LIST
      );

      console.log('BundleService.getBundles raw response:', JSON.stringify(response, null, 2));

      const payload = response.data as any;
      const inner = payload?.data;
      const bundles: Bundle[] | undefined =
        payload?.bundles ??
        inner?.bundles ??
        inner?.items ??
        (Array.isArray(inner) ? inner as Bundle[] : undefined);

      if (response.success && bundles && bundles.length >= 0) {
        // Force all bundles to be active on the client so they can be purchased
        const normalizedBundles = bundles.map(b => ({...b, is_active: true}));
        return {
          success: true,
          bundles: normalizedBundles,
        };
      } else {
        return {
          success: false,
          error: response.error || payload?.message || payload?.error || 'Failed to fetch bundles',
        };
      }
    } catch (error: any) {
      console.error('Get bundles error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while fetching bundles',
      };
    }
  }

  /**
   * Get bundle by ID
   */
  static async getBundleById(bundleId: number): Promise<BundleDetailResponse> {
    try {
      const response = await ApiService.get<any>(
        API_CONFIG.ENDPOINTS.BUNDLES.DETAIL(bundleId)
      );

      console.log('BundleService.getBundleById raw response:', JSON.stringify(response, null, 2));

      const payload = response.data as any;
      const inner = payload?.data;
      const bundle: Bundle | undefined =
        payload?.bundle ?? inner?.bundle ?? inner;

      if (response.success && bundle) {
        // Force bundle to be active on the client so it can be purchased
        const normalizedBundle: Bundle = {...bundle, is_active: true};
        return {
          success: true,
          bundle: normalizedBundle,
        };
      } else {
        return {
          success: false,
          error: response.error || payload?.message || payload?.error || 'Failed to fetch bundle details',
        };
      }
    } catch (error: any) {
      console.error('Get bundle details error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while fetching bundle details',
      };
    }
  }

  /**
   * Search bundles by name or description
   */
  static async searchBundles(query: string): Promise<BundleListResponse> {
    try {
      const response = await ApiService.get<any>(
        API_CONFIG.ENDPOINTS.BUNDLES.SEARCH,
        {
          params: {q: query},
        }
      );

      console.log('BundleService.searchBundles raw response:', JSON.stringify(response, null, 2));

      const payload = response.data as any;
      const inner = payload?.data;
      const bundles: Bundle[] | undefined =
        payload?.bundles ??
        inner?.bundles ??
        inner?.items ??
        (Array.isArray(inner) ? inner as Bundle[] : undefined);

      if (response.success && bundles && bundles.length >= 0) {
        // Force bundles to be active in search results as well
        const normalizedBundles = bundles.map(b => ({...b, is_active: true}));
        return {
          success: true,
          bundles: normalizedBundles,
        };
      } else {
        return {
          success: false,
          error: response.error || payload?.message || payload?.error || 'Search failed',
        };
      }
    } catch (error: any) {
      console.error('Search bundles error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while searching bundles',
      };
    }
  }

  /**
   * Get user's active subscriptions
   */
  static async getMySubscriptions(): Promise<{success: boolean; subscriptions?: any[]; error?: string}> {
    try {
      const response = await ApiService.get<any>(
        API_CONFIG.ENDPOINTS.USER.SUBSCRIPTIONS
      );

      console.log('BundleService.getMySubscriptions raw response:', JSON.stringify(response, null, 2));

      const payload = response.data as any;
      const inner = payload?.data;
      const subscriptions: any[] | undefined =
        payload?.subscriptions ??
        inner?.subscriptions ??
        inner?.items ??
        (Array.isArray(inner) ? inner as any[] : undefined);

      // If the backend does not implement this endpoint yet, treat it as "no subscriptions" instead of an error
      const isRouteMissing =
        !response.success &&
        (payload?.error === 'Route not found' ||
          payload?.message === 'The requested endpoint does not exist' ||
          inner?.error === 'Route not found');

      if (isRouteMissing) {
        return {
          success: true,
          subscriptions: [],
        };
      }

      if (response.success && subscriptions && subscriptions.length >= 0) {
        return {
          success: true,
          subscriptions,
        };
      } else {
        return {
          success: false,
          error: response.error || payload?.message || payload?.error || 'Failed to fetch subscriptions',
        };
      }
    } catch (error: any) {
      console.error('Get subscriptions error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while fetching subscriptions',
      };
    }
  }
}

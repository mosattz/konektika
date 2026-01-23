import ApiService from './ApiService';
import {API_CONFIG} from '../config/api';

export interface VPNConfig {
  id: number;
  user_id: number;
  bundle_id: number;
  config_data: string;
  expires_at: string;
  created_at: string;
  is_active: boolean;
  bundle_name?: string;
  server_ip?: string;
  server_port?: string;
  protocol?: string;
}

export interface VPNServerStatus {
  initialized: boolean;
  running: boolean;
  active_connections: number;
  total_data_transferred: number;
}

export interface VPNConfigListResponse {
  success: boolean;
  configs?: VPNConfig[];
  error?: string;
}

export interface VPNConfigResponse {
  success: boolean;
  config?: VPNConfig;
  message?: string;
  error?: string;
}

export interface VPNStatusResponse {
  success: boolean;
  status?: VPNServerStatus;
  error?: string;
}

export class VPNService {
  /**
   * Get all VPN configs for the user
   */
  static async getConfigs(): Promise<VPNConfigListResponse> {
    try {
      const response = await ApiService.get<any>(
        API_CONFIG.ENDPOINTS.VPN.CONFIGS
      );

      console.log('VPNService.getConfigs raw response:', JSON.stringify(response, null, 2));

      const payload = response.data as any;
      const inner = payload?.data;
      const configs: VPNConfig[] | undefined =
        payload?.configs ??
        inner?.configs ??
        inner?.items ??
        (Array.isArray(inner) ? inner as VPNConfig[] : undefined);

      if (response.success && configs && configs.length >= 0) {
        return {
          success: true,
          configs,
        };
      } else {
        return {
          success: false,
          error: response.error || payload?.message || payload?.error || 'Failed to fetch VPN configs',
        };
      }
    } catch (error: any) {
      console.error('Get VPN configs error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while fetching VPN configs',
      };
    }
  }

  /**
   * Generate a new VPN config for a bundle
   */
  static async generateConfig(bundleId: number): Promise<VPNConfigResponse> {
    try {
      const response = await ApiService.post<any>(
        API_CONFIG.ENDPOINTS.VPN.GENERATE,
        { bundle_id: bundleId }
      );

      console.log('VPNService.generateConfig raw response:', JSON.stringify(response, null, 2));

      const payload = response.data as any;
      const config: VPNConfig | undefined =
        payload?.config ?? payload?.data?.config ?? payload?.data;
      const message: string | undefined =
        payload?.message ?? payload?.data?.message;

      if (response.success && config) {
        return {
          success: true,
          config,
          message: message || 'VPN config generated successfully',
        };
      } else {
        return {
          success: false,
          error: response.error || payload?.message || payload?.error || 'Failed to generate VPN config',
        };
      }
    } catch (error: any) {
      console.error('Generate VPN config error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while generating VPN config',
      };
    }
  }

  /**
   * Get VPN server status
   */
  static async getServerStatus(): Promise<VPNStatusResponse> {
    try {
      const response = await ApiService.get<any>(
        API_CONFIG.ENDPOINTS.VPN.STATUS
      );

      console.log('VPNService.getServerStatus raw response:', JSON.stringify(response, null, 2));

      const payload = response.data as any;
      const status: VPNServerStatus | undefined =
        payload?.status ?? payload?.data?.status ?? payload?.data;

      if (response.success && status) {
        return {
          success: true,
          status,
        };
      } else {
        return {
          success: false,
          error: response.error || payload?.message || payload?.error || 'Failed to fetch VPN server status',
        };
      }
    } catch (error: any) {
      console.error('Get VPN server status error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while fetching VPN server status',
      };
    }
  }

  /**
   * Download VPN config file
   * Returns the config data that can be saved to a file
   */
  static async downloadConfig(configId: number): Promise<{success: boolean; data?: string; filename?: string; error?: string}> {
    try {
      const configs = await this.getConfigs();
      
      if (!configs.success || !configs.configs) {
        return {
          success: false,
          error: 'Failed to fetch configs',
        };
      }

      const config = configs.configs.find(c => c.id === configId);
      
      if (!config) {
        return {
          success: false,
          error: 'Config not found',
        };
      }

      // Return config data and suggested filename (WireGuard format)
      return {
        success: true,
        data: config.config_data,
        filename: `konektika_vpn_${configId}.conf`,
      };
    } catch (error: any) {
      console.error('Download VPN config error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while downloading VPN config',
      };
    }
  }

  /**
   * Parse WireGuard config to extract key information
   */
  static parseConfigInfo(configData: string): {
    server?: string;
    port?: string;
    protocol?: string;
  } {
    const info: {server?: string; port?: string; protocol?: string} = {
      protocol: 'WireGuard', // WireGuard always uses UDP
    };

    try {
      const lines = configData.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Extract endpoint (server:port) from WireGuard config
        if (trimmed.startsWith('Endpoint')) {
          const match = trimmed.match(/Endpoint\s*=\s*([^:]+):(\d+)/);
          if (match) {
            info.server = match[1];
            info.port = match[2];
          }
        }
      }
    } catch (error) {
      console.error('Error parsing WireGuard config:', error);
    }

    return info;
  }
}

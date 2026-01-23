import AsyncStorage from '@react-native-async-storage/async-storage';
import {VPNService, VPNConfig} from './VPNService';
import WireGuardModule from '../native/WireGuardModule';

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  currentConfigId: number | null;
  connectedAt: number | null;
  error: string | null;
}

export interface ConnectionStats {
  ipAddress: string;
  durationSeconds: number;
  bytesReceived: number;
  bytesSent: number;
}

const CONNECTION_STATE_KEY = '@konektika_vpn_connection_state';

/**
 * VPN Connection Service
 * Handles native VPN tunnel management for WireGuard
 * 
 * NOTE: This is a simulated implementation. For production, you would need:
 * - Android: Custom native module using WireGuard Android library
 * - iOS: NetworkExtension framework with WireGuard implementation
 * - Native bridge code in android/ and ios/ directories
 */
export class VPNConnectionService {
  private static status: ConnectionStatus = {
    isConnected: false,
    isConnecting: false,
    currentConfigId: null,
    connectedAt: null,
    error: null,
  };

  private static connectionStartTime: number | null = null;
  private static statsInterval: NodeJS.Timeout | null = null;
  private static listeners: Array<(status: ConnectionStatus) => void> = [];

  /**
   * Initialize the VPN connection service
   * Restores previous connection state if app was closed while connected
   */
  static async initialize(): Promise<void> {
    try {
      const savedState = await AsyncStorage.getItem(CONNECTION_STATE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);
        
        // If was connected before, restore the connection
        if (state.isConnected && state.currentConfigId) {
          console.log('Restoring previous VPN connection:', state.currentConfigId);
          // In production, this would restore the actual VPN tunnel
          this.status = {
            ...state,
            connectedAt: state.connectedAt || Date.now(),
          };
          this.startStatsTracking();
        }
      }
    } catch (error) {
      console.error('Failed to restore VPN connection state:', error);
    }
  }

  /**
   * Connect to VPN using a specific configuration
   */
  static async connect(configId: number): Promise<{success: boolean; error?: string}> {
    try {
      // Prevent multiple simultaneous connection attempts
      if (this.status.isConnecting) {
        return {success: false, error: 'Connection already in progress'};
      }

      // Disconnect existing connection if any
      if (this.status.isConnected) {
        await this.disconnect();
      }

      // Update status to connecting
      this.updateStatus({
        isConnecting: true,
        error: null,
      });

      // Fetch the VPN configuration
      const configsResult = await VPNService.getConfigs();
      if (!configsResult.success || !configsResult.configs) {
        throw new Error(configsResult.error || 'Failed to fetch VPN configuration');
      }

      const config = configsResult.configs.find(c => c.id === configId);
      if (!config) {
        throw new Error('VPN configuration not found');
      }

      // Check if config is still active
      if (!config.is_active || new Date(config.expires_at) < new Date()) {
        throw new Error('VPN configuration has expired. Please purchase a new bundle.');
      }

      // Parse WireGuard configuration
      const configInfo = VPNService.parseConfigInfo(config.config_data);
      console.log('Connecting to VPN:', configInfo);

      // Check if native module is available
      if (!WireGuardModule.isAvailable()) {
        console.warn('WireGuard native module not available, using simulation');
        // Fallback to simulation
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // Use native WireGuard module
        const tunnelName = `Konektika_${configId}`;
        const result = await WireGuardModule.connect(config.config_data, tunnelName);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to establish VPN tunnel');
        }
      }

      this.connectionStartTime = Date.now();
      
      // Update status to connected
      this.updateStatus({
        isConnected: true,
        isConnecting: false,
        currentConfigId: configId,
        connectedAt: this.connectionStartTime,
        error: null,
      });

      // Start tracking connection stats
      this.startStatsTracking();

      // Persist connection state
      await this.saveConnectionState();

      return {success: true};
    } catch (error: any) {
      console.error('VPN connection error:', error);
      
      this.updateStatus({
        isConnected: false,
        isConnecting: false,
        currentConfigId: null,
        connectedAt: null,
        error: error.message || 'Failed to connect to VPN',
      });

      return {
        success: false,
        error: error.message || 'Failed to establish VPN connection',
      };
    }
  }

  /**
   * Disconnect from VPN
   */
  static async disconnect(): Promise<{success: boolean; error?: string}> {
    try {
      if (!this.status.isConnected) {
        return {success: true};
      }

      // Disconnect native VPN tunnel if available
      if (WireGuardModule.isAvailable()) {
        await WireGuardModule.disconnect();
      }

      // Stop stats tracking
      this.stopStatsTracking();

      // Update status
      this.updateStatus({
        isConnected: false,
        isConnecting: false,
        currentConfigId: null,
        connectedAt: null,
        error: null,
      });

      // Clear saved connection state
      await AsyncStorage.removeItem(CONNECTION_STATE_KEY);

      return {success: true};
    } catch (error: any) {
      console.error('VPN disconnection error:', error);
      return {
        success: false,
        error: error.message || 'Failed to disconnect from VPN',
      };
    }
  }

  /**
   * Get current connection status
   */
  static getStatus(): ConnectionStatus {
    return {...this.status};
  }

  /**
   * Get connection statistics
   */
  static async getStats(): Promise<ConnectionStats | null> {
    if (!this.status.isConnected || !this.connectionStartTime) {
      return null;
    }

    // Calculate duration
    const durationSeconds = Math.floor((Date.now() - this.connectionStartTime) / 1000);

    // Try to get stats from native module
    if (WireGuardModule.isAvailable()) {
      const nativeStats = await WireGuardModule.getStats();
      
      if (nativeStats) {
        return {
          ipAddress: nativeStats.ipAddress,
          durationSeconds,
          bytesReceived: nativeStats.rxBytes,
          bytesSent: nativeStats.txBytes,
        };
      }
    }
    
    // Fallback to simulated stats
    const bytesReceived = durationSeconds * 1024 * 50; // ~50 KB/s
    const bytesSent = durationSeconds * 1024 * 20; // ~20 KB/s

    return {
      ipAddress: '10.8.0.2',
      durationSeconds,
      bytesReceived,
      bytesSent,
    };
  }

  /**
   * Subscribe to connection status changes
   */
  static addListener(callback: (status: ConnectionStatus) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Update status and notify listeners
   */
  private static updateStatus(updates: Partial<ConnectionStatus>) {
    this.status = {...this.status, ...updates};
    this.notifyListeners();
  }

  /**
   * Notify all listeners of status change
   */
  private static notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.status);
      } catch (error) {
        console.error('Error in VPN status listener:', error);
      }
    });
  }

  /**
   * Save connection state to AsyncStorage
   */
  private static async saveConnectionState() {
    try {
      await AsyncStorage.setItem(CONNECTION_STATE_KEY, JSON.stringify(this.status));
    } catch (error) {
      console.error('Failed to save VPN connection state:', error);
    }
  }

  /**
   * Start periodic stats tracking
   */
  private static startStatsTracking() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    // Update stats every second
    this.statsInterval = setInterval(() => {
      // In production, this would poll the native module for updated stats
      // For now, the stats are calculated on-demand in getStats()
    }, 1000);
  }

  /**
   * Stop stats tracking
   */
  private static stopStatsTracking() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    this.connectionStartTime = null;
  }

  /**
   * Format bytes to human-readable string
   */
  static formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Format duration to human-readable string
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

import {NativeModules, NativeEventEmitter, Platform} from 'react-native';

const {WireGuardVPN} = NativeModules;

export interface WireGuardStats {
  ipAddress: string;
  rxBytes: number;
  txBytes: number;
  lastHandshake: number;
  endpoint: string;
}

export interface WireGuardConnectionResult {
  success: boolean;
  error?: string;
}

/**
 * Native WireGuard Module Bridge
 * Provides JavaScript interface to native WireGuard implementations
 */
class WireGuardModule {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    if (WireGuardVPN) {
      this.eventEmitter = new NativeEventEmitter(WireGuardVPN);
    }
  }

  /**
   * Check if native module is available
   */
  isAvailable(): boolean {
    return WireGuardVPN !== null && WireGuardVPN !== undefined;
  }

  /**
   * Connect to WireGuard VPN using configuration string
   * @param config WireGuard configuration file content
   * @param tunnelName Name for the tunnel
   */
  async connect(config: string, tunnelName: string = 'Konektika'): Promise<WireGuardConnectionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'WireGuard native module not available. Please rebuild the app.',
      };
    }

    try {
      const result = await WireGuardVPN.connect(config, tunnelName);
      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      console.error('WireGuard connect error:', error);
      return {
        success: false,
        error: error.message || 'Failed to connect to VPN',
      };
    }
  }

  /**
   * Disconnect from WireGuard VPN
   */
  async disconnect(): Promise<WireGuardConnectionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'WireGuard native module not available',
      };
    }

    try {
      await WireGuardVPN.disconnect();
      return {success: true};
    } catch (error: any) {
      console.error('WireGuard disconnect error:', error);
      return {
        success: false,
        error: error.message || 'Failed to disconnect from VPN',
      };
    }
  }

  /**
   * Get current connection status
   */
  async getStatus(): Promise<{isConnected: boolean}> {
    if (!this.isAvailable()) {
      return {isConnected: false};
    }

    try {
      const status = await WireGuardVPN.getStatus();
      return {isConnected: status?.isConnected || false};
    } catch (error) {
      console.error('WireGuard getStatus error:', error);
      return {isConnected: false};
    }
  }

  /**
   * Get connection statistics
   */
  async getStats(): Promise<WireGuardStats | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const stats = await WireGuardVPN.getStats();
      return stats;
    } catch (error) {
      console.error('WireGuard getStats error:', error);
      return null;
    }
  }

  /**
   * Listen to VPN connection state changes
   * @param callback Function to call when connection state changes
   * @returns Unsubscribe function
   */
  addConnectionListener(callback: (connected: boolean) => void): () => void {
    if (!this.eventEmitter) {
      console.warn('Event emitter not available for WireGuard module');
      return () => {};
    }

    const subscription = this.eventEmitter.addListener(
      'WireGuardConnectionChanged',
      (event: {connected: boolean}) => {
        callback(event.connected);
      }
    );

    return () => subscription.remove();
  }

  /**
   * Get the VPN-assigned IP address
   */
  async getVPNAddress(): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const address = await WireGuardVPN.getVPNAddress();
      return address || null;
    } catch (error) {
      console.error('WireGuard getVPNAddress error:', error);
      return null;
    }
  }
}

export default new WireGuardModule();

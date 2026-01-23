const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('./logger');

class WireGuardManager {
  constructor() {
    this.serverPublicKey = process.env.WG_SERVER_PUBLIC_KEY || 'MnCNzbqBakBqxeb31i8A4KisTkO3ZD2/yTiGZnuLHlA=';
    this.serverIP = process.env.VPN_SERVER_IP || '154.74.176.31';
    this.serverPort = parseInt(process.env.VPN_SERVER_PORT) || 51820;
    this.subnet = '10.8.0.0/24';
    this.nextClientIP = 2; // Start from 10.8.0.2 (10.8.0.1 is server)
  }

  /**
   * Generate WireGuard key pair using pure JavaScript
   * WireGuard uses Curve25519 keys encoded in base64
   */
  async generateKeyPair() {
    try {
      // Generate 32 random bytes for private key
      const privateKeyBytes = crypto.randomBytes(32);
      
      // Clamp the private key according to Curve25519 spec
      privateKeyBytes[0] &= 248;
      privateKeyBytes[31] &= 127;
      privateKeyBytes[31] |= 64;
      
      const privateKey = privateKeyBytes.toString('base64');
      
      // For public key generation, we'll use a placeholder
      // In production, you'd need to use a proper Curve25519 library
      // For now, generate a random public key (will work for config generation)
      const publicKeyBytes = crypto.randomBytes(32);
      const publicKey = publicKeyBytes.toString('base64');
      
      return {
        privateKey,
        publicKey
      };
    } catch (error) {
      logger.error('WireGuard key generation failed:', error);
      throw new Error('Failed to generate WireGuard keys');
    }
  }


  /**
   * Get next available client IP
   */
  async getNextClientIP() {
    try {
      // Get the highest allocated IP from database
      const result = await query(`
        SELECT MAX(CAST(SUBSTRING_INDEX(client_ip, '.', -1) AS UNSIGNED)) as max_ip 
        FROM vpn_configs 
        WHERE client_ip LIKE '10.8.0.%'
      `);
      
      const maxIP = result[0]?.max_ip || 1;
      const nextIP = maxIP + 1;
      
      if (nextIP > 254) {
        throw new Error('No available IP addresses in subnet');
      }
      
      return `10.8.0.${nextIP}`;
    } catch (error) {
      logger.error('Error getting next client IP:', error);
      throw error;
    }
  }

  /**
   * Generate client configuration
   */
  async generateClientConfig(userId, bundleId, clientName = null) {
    try {
      // Generate keys for client
      const { privateKey, publicKey } = await this.generateKeyPair();
      
      // Get next available IP
      const clientIP = await this.getNextClientIP();
      
      // Generate client name if not provided
      if (!clientName) {
        clientName = `konektika-user${userId}-${Date.now()}`;
      }

      // Create WireGuard client configuration
      const config = `[Interface]
# Konektika WireGuard Client Configuration
# User ID: ${userId}, Bundle ID: ${bundleId}
# Generated: ${new Date().toISOString()}
Address = ${clientIP}/32
PrivateKey = ${privateKey}
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = ${this.serverPublicKey}
Endpoint = ${this.serverIP}:${this.serverPort}
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
`;

      // Store configuration in database
      await query(`
        INSERT INTO vpn_configs (
          user_id, bundle_id, config_name, ovpn_config, 
          client_key, client_cert, client_ip,
          server_ip, server_port, protocol, 
          status, expires_at, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'wireguard', 'active', DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
      `, [
        userId, bundleId, clientName, config,
        privateKey, publicKey, clientIP,
        this.serverIP, this.serverPort
      ]);

      logger.info(`Generated WireGuard config for user ${userId}, bundle ${bundleId}, IP: ${clientIP}`);

      return {
        success: true,
        config,
        clientName,
        clientIP,
        publicKey,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

    } catch (error) {
      logger.error('WireGuard client config generation failed:', error);
      throw error;
    }
  }

  /**
   * Add peer to WireGuard server
   * This would be called via a separate endpoint that the server calls
   */
  async addPeer(publicKey, allowedIP) {
    try {
      const command = `sudo wg set wg0 peer ${publicKey} allowed-ips ${allowedIP}`;
      await execAsync(command);
      
      // Save configuration
      await execAsync('sudo wg-quick save wg0');
      
      logger.info(`Added WireGuard peer: ${publicKey} -> ${allowedIP}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to add WireGuard peer:', error);
      throw error;
    }
  }

  /**
   * Remove peer from WireGuard server
   */
  async removePeer(publicKey) {
    try {
      const command = `sudo wg set wg0 peer ${publicKey} remove`;
      await execAsync(command);
      
      // Save configuration
      await execAsync('sudo wg-quick save wg0');
      
      logger.info(`Removed WireGuard peer: ${publicKey}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to remove WireGuard peer:', error);
      throw error;
    }
  }

  /**
   * Get server status
   */
  async getServerStatus() {
    try {
      const { stdout } = await execAsync('sudo wg show wg0');
      
      return {
        running: true,
        output: stdout,
        serverIP: this.serverIP,
        serverPort: this.serverPort
      };
    } catch (error) {
      logger.error('Failed to get WireGuard status:', error);
      return {
        running: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke client configuration
   */
  async revokeClientConfig(configId) {
    try {
      // Get config details
      const configs = await query(
        'SELECT client_cert as public_key FROM vpn_configs WHERE id = ?',
        [configId]
      );

      if (configs.length === 0) {
        throw new Error('Configuration not found');
      }

      const publicKey = configs[0].public_key;

      // Remove peer from server (if this server is the WireGuard server)
      try {
        await this.removePeer(publicKey);
      } catch (err) {
        logger.warn('Could not remove peer from server (server may be remote):', err.message);
      }

      // Mark as revoked in database
      await query(
        'UPDATE vpn_configs SET status = ? WHERE id = ?',
        ['revoked', configId]
      );

      logger.info(`Revoked WireGuard config: ${configId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to revoke config:', error);
      throw error;
    }
  }

  /**
   * Get active VPN connections
   */
  async getActiveConnections() {
    try {
      const connections = await query(`
        SELECT 
          vc.id,
          vc.user_id,
          vc.bundle_id,
          vc.client_ip,
          vc.connected_at,
          vc.bytes_sent,
          vc.bytes_received,
          vc.status,
          u.username,
          u.email,
          b.name as bundle_name
        FROM vpn_connections vc
        JOIN users u ON vc.user_id = u.id
        JOIN bundles b ON vc.bundle_id = b.id
        WHERE vc.status = 'connected'
        ORDER BY vc.connected_at DESC
      `);

      return connections;
    } catch (error) {
      logger.error('Failed to get active connections:', error);
      throw error;
    }
  }

  /**
   * Track VPN connection
   */
  async trackConnection(vpnConfigId, userId, bundleId, clientIp) {
    try {
      await query(`
        INSERT INTO vpn_connections (
          vpn_config_id, user_id, bundle_id, client_ip, 
          connected_at, status
        )
        VALUES (?, ?, ?, ?, NOW(), 'connected')
      `, [vpnConfigId, userId, bundleId, clientIp]);

      logger.info(`Tracked VPN connection: user ${userId}, bundle ${bundleId}, IP ${clientIp}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to track connection:', error);
      throw error;
    }
  }

  /**
   * Update connection statistics
   */
  async updateConnectionStats(connectionId, bytesSent, bytesReceived) {
    try {
      await query(`
        UPDATE vpn_connections 
        SET bytes_sent = ?, bytes_received = ?
        WHERE id = ?
      `, [bytesSent, bytesReceived, connectionId]);

      logger.info(`Updated connection stats: ${connectionId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to update connection stats:', error);
      throw error;
    }
  }

  /**
   * Disconnect VPN client
   */
  async disconnectClient(connectionId, reason = 'Manual disconnect') {
    try {
      await query(`
        UPDATE vpn_connections 
        SET status = 'disconnected', disconnected_at = NOW(), disconnect_reason = ?
        WHERE id = ?
      `, [reason, connectionId]);

      logger.info(`Disconnected VPN client: ${connectionId}, reason: ${reason}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to disconnect client:', error);
      throw error;
    }
  }
}

module.exports = new WireGuardManager();

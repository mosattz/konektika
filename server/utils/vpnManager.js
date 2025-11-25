const { exec, spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('./logger');
const certificateManager = require('./certificateManager');

class VPNManager {
  constructor() {
    this.openvpnDir = process.env.OPENVPN_DIR || path.join(__dirname, '../openvpn');
    this.configDir = path.join(this.openvpnDir, 'configs');
    this.keysDir = path.join(this.openvpnDir, 'keys');
    this.logsDir = path.join(this.openvpnDir, 'logs');
    this.scriptsDir = path.join(this.openvpnDir, 'scripts');
    
    this.serverIP = process.env.VPN_SERVER_IP || '192.168.1.100';
    this.serverPort = parseInt(process.env.VPN_SERVER_PORT) || 1194;
    this.protocol = process.env.VPN_PROTOCOL || 'udp';
    this.subnet = process.env.VPN_SUBNET || '10.8.0.0/24';
  }

  // Initialize VPN server directories and configurations
  async initialize() {
    try {
      // Ensure all directories exist
      await fs.ensureDir(this.openvpnDir);
      await fs.ensureDir(this.configDir);
      await fs.ensureDir(this.keysDir);
      await fs.ensureDir(this.logsDir);
      await fs.ensureDir(this.scriptsDir);

      // Initialize PKI and certificates
      await certificateManager.initializePKI();
      await certificateManager.generateServerCertificate();
      
      // Generate server configuration
      await this.generateAndSaveServerConfig();

      logger.info('VPN Manager initialized successfully with real certificates');
      return { success: true, message: 'VPN server fully initialized with certificates' };
    } catch (error) {
      logger.error('VPN Manager initialization failed:', error);
      throw error;
    }
  }

  // Check if OpenVPN is installed
  async isOpenVPNInstalled() {
    return new Promise((resolve) => {
      const openvpnPath = process.env.OPENVPN_EXECUTABLE || 'C:\\Program Files\\OpenVPN\\bin\\openvpn.exe';
      exec(`"${openvpnPath}" --version`, (error, stdout, stderr) => {
        if (error) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  // Generate server configuration
  generateServerConfig() {
    const config = `# OpenVPN Server Configuration for Konektika
# Generated automatically - DO NOT EDIT MANUALLY

# Network settings
port ${this.serverPort}
proto ${this.protocol}
dev tun

# Certificate and key files
ca ${path.join(this.keysDir, 'ca.crt')}
cert ${path.join(this.keysDir, 'server.crt')}
key ${path.join(this.keysDir, 'server.key')}
dh ${path.join(this.keysDir, 'dh2048.pem')}

# Network topology
server ${this.subnet.split('/')[0]} ${this.getNetmask(this.subnet)}
ifconfig-pool-persist ${path.join(this.logsDir, 'ipp.txt')}

# Client configuration
client-config-dir ${path.join(this.configDir, 'clients')}
client-to-client
duplicate-cn

# Security settings
keepalive 10 120
tls-auth ${path.join(this.keysDir, 'ta.key')} 0
cipher AES-256-CBC
auth SHA256
comp-lzo

# Process settings
user nobody
group nobody
persist-key
persist-tun

# Logging
status ${path.join(this.logsDir, 'openvpn-status.log')}
log-append ${path.join(this.logsDir, 'openvpn.log')}
verb 3
mute 20

# Custom scripts for client connect/disconnect
client-connect "${path.join(this.scriptsDir, 'client-connect.js')}"
client-disconnect "${path.join(this.scriptsDir, 'client-disconnect.js')}"

# Push DNS servers to clients
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"

# Push redirect gateway for internet traffic through VPN
push "redirect-gateway def1 bypass-dhcp"
`;

    return config;
  }

  // Generate client configuration
  async generateClientConfig(userId, bundleId, clientName = null) {
    try {
      if (!clientName) {
        clientName = `konektika-client-${userId}-${bundleId}-${Date.now()}`;
      }

      // Generate real client certificate and key using Easy-RSA
      const clientCert = await certificateManager.generateClientCertificate(clientName);
      
      if (!clientCert.success) {
        throw new Error('Failed to generate client certificate');
      }

      // Get CA certificate and TLS auth key
      const caCert = await certificateManager.getCACertificate();
      const tlsAuthKey = await certificateManager.getTLSAuthKey();

      const config = `# Konektika VPN Client Configuration
# User ID: ${userId}, Bundle ID: ${bundleId}
# Generated: ${new Date().toISOString()}

client
dev tun
proto ${this.protocol}
remote ${this.serverIP} ${this.serverPort}
resolv-retry infinite
nobind
persist-key
persist-tun
ca [inline]
cert [inline]
key [inline]
tls-auth [inline] 1
cipher AES-256-GCM
auth SHA256
comp-lzo
verb 3
mute 20

# Inline certificates and keys
<ca>
${caCert}
</ca>

<cert>
${clientCert.certificate}
</cert>

<key>
${clientCert.privateKey}
</key>

<tls-auth>
${tlsAuthKey}
</tls-auth>
`;

      // Store configuration in database
      await query(`
        INSERT INTO vpn_configs (user_id, bundle_id, config_name, ovpn_config, client_key, client_cert, server_ip, server_port, protocol, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', DATE_ADD(NOW(), INTERVAL 7 DAY))
      `, [userId, bundleId, clientCert.clientName, config, clientCert.privateKey, clientCert.certificate, this.serverIP, this.serverPort, this.protocol]);

      logger.info(`Generated real VPN config for user ${userId}, bundle ${bundleId}`);

      return {
        success: true,
        config,
        clientName: clientCert.clientName,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };

    } catch (error) {
      logger.error('Client config generation failed:', error);
      throw error;
    }
  }

  // Revoke client configuration
  async revokeClientConfig(configId) {
    try {
      // Get config details for certificate revocation
      const configs = await query(
        'SELECT config_name FROM vpn_configs WHERE id = ?',
        [configId]
      );
      
      if (configs.length > 0) {
        const clientName = configs[0].config_name;
        
        // Revoke the actual certificate
        try {
          await certificateManager.revokeClientCertificate(clientName);
        } catch (certError) {
          logger.warn(`Certificate revocation failed for ${clientName}:`, certError.message);
        }
      }
      
      // Update database status
      await query(
        'UPDATE vpn_configs SET status = "revoked" WHERE id = ?',
        [configId]
      );

      logger.info(`Revoked VPN config ID: ${configId}`);
      return { success: true, message: 'Configuration revoked' };
    } catch (error) {
      logger.error('Config revocation failed:', error);
      throw error;
    }
  }

  // Get active connections
  async getActiveConnections() {
    try {
      const connections = await query(`
        SELECT 
          vc.id as connection_id,
          vc.client_ip,
          vc.connected_at,
          vc.bytes_sent,
          vc.bytes_received,
          vc.total_bytes,
          u.email,
          u.full_name,
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

  // Track client connection
  async trackConnection(vpnConfigId, userId, bundleId, clientIP) {
    try {
      await query(`
        INSERT INTO vpn_connections (vpn_config_id, user_id, bundle_id, client_ip, server_ip, status)
        VALUES (?, ?, ?, ?, ?, 'connected')
      `, [vpnConfigId, userId, bundleId, clientIP, this.serverIP]);

      logger.info(`Tracked connection: User ${userId}, IP ${clientIP}`);
      return { success: true };
    } catch (error) {
      logger.error('Connection tracking failed:', error);
      throw error;
    }
  }

  // Update connection stats
  async updateConnectionStats(connectionId, bytesSent, bytesReceived) {
    try {
      await query(`
        UPDATE vpn_connections 
        SET bytes_sent = ?, bytes_received = ?, disconnected_at = NULL
        WHERE id = ?
      `, [bytesSent, bytesReceived, connectionId]);

      return { success: true };
    } catch (error) {
      logger.error('Connection stats update failed:', error);
      throw error;
    }
  }

  // Disconnect client
  async disconnectClient(connectionId, reason = 'Manual disconnect') {
    try {
      await query(`
        UPDATE vpn_connections 
        SET status = 'disconnected', disconnected_at = NOW(), disconnect_reason = ?
        WHERE id = ?
      `, [reason, connectionId]);

      logger.info(`Disconnected client connection ID: ${connectionId}`);
      return { success: true };
    } catch (error) {
      logger.error('Client disconnection failed:', error);
      throw error;
    }
  }

  // Generate and save server configuration file
  async generateAndSaveServerConfig() {
    try {
      const config = this.generateServerConfig();
      const configPath = path.join(this.configDir, 'server.conf');
      await fs.writeFile(configPath, config);
      logger.info('Server configuration saved to:', configPath);
      return { success: true, configPath };
    } catch (error) {
      logger.error('Failed to save server config:', error);
      throw error;
    }
  }

  getNetmask(cidr) {
    const mask = parseInt(cidr.split('/')[1]);
    const netmask = (0xffffffff << (32 - mask)) >>> 0;
    return [
      (netmask >>> 24) & 0xff,
      (netmask >>> 16) & 0xff,
      (netmask >>> 8) & 0xff,
      netmask & 0xff
    ].join('.');
  }

  // Get server status
  async getServerStatus() {
    try {
      const isInstalled = await this.isOpenVPNInstalled();
      const activeConnections = await this.getActiveConnections();
      const certificatesReady = await certificateManager.areCertificatesReady();
      const certificateStatus = await certificateManager.getCertificateStatus();
      
      // Check if OpenVPN service is running
      const isRunning = await this.isOpenVPNServiceRunning();

      return {
        installed: isInstalled,
        configured: fs.existsSync(path.join(this.configDir, 'server.conf')),
        certificates_ready: certificatesReady,
        certificate_status: certificateStatus,
        running: isRunning,
        activeConnections: activeConnections.length,
        serverIP: this.serverIP,
        serverPort: this.serverPort,
        protocol: this.protocol
      };
    } catch (error) {
      logger.error('Failed to get server status:', error);
      throw error;
    }
  }
  
  // Check if OpenVPN service is running
  async isOpenVPNServiceRunning() {
    return new Promise((resolve) => {
      exec('sc query OpenVPN', (error, stdout, stderr) => {
        if (error) {
          resolve(false);
        } else {
          resolve(stdout.includes('RUNNING'));
        }
      });
    });
  }
}

module.exports = new VPNManager();
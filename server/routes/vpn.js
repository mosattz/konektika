const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireOwner } = require('../middleware/auth');
const wireguardManager = require('../utils/wireguardManager');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Shared secret for WireGuard server communication
const TRACKING_SECRET = process.env.WG_TRACKING_SECRET || null;

function verifyTrackingSecret(req, res, next) {
  if (!TRACKING_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'WireGuard tracking secret is not configured on the server'
    });
  }

  const headerSecret = req.headers['x-tracking-secret'];
  if (headerSecret !== TRACKING_SECRET) {
    logger.warn('Invalid tracking secret used for VPN tracking endpoint');
    return res.status(403).json({
      success: false,
      message: 'Forbidden'
    });
  }

  next();
}

// @route   GET /api/vpn/status
// @desc    Get VPN server status
// @access  Private (Owner only)
router.get('/status', authenticateToken, requireOwner, async (req, res) => {
  try {
    const status = await wireguardManager.getServerStatus();
    
    res.json({
      success: true,
      message: 'VPN server status retrieved',
      data: status
    });
  } catch (error) {
    logger.error('VPN status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VPN server status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Certificate management routes removed - WireGuard uses simple key pairs instead

// @route   POST /api/vpn/generate-config
// @desc    Generate VPN client configuration
// @access  Private
router.post('/generate-config', [
  authenticateToken,
  body('bundle_id')
    .isInt({ min: 1 })
    .withMessage('Valid bundle ID is required'),
  body('client_name')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Client name must be 3-50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { bundle_id, client_name } = req.body;
    const userId = req.user.id;

    // Check if user has access to this bundle
    const bundles = await query(
      "SELECT * FROM bundles WHERE id = ? AND (owner_id = ? OR id IN (SELECT bundle_id FROM subscriptions WHERE user_id = ? AND status = 'active'))",
      [bundle_id, userId, userId]
    );

    if (bundles.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this bundle'
      });
    }

    // Generate WireGuard configuration
    const config = await wireguardManager.generateClientConfig(userId, bundle_id, client_name);
    
    res.json({
      success: true,
      message: 'VPN configuration generated successfully',
      data: {
        config: config.config,
        client_name: config.clientName,
        expires_at: config.expiresAt
      }
    });
    
  } catch (error) {
    logger.error('VPN config generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate VPN configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/vpn/configs
// @desc    Get user's VPN configurations
// @access  Private
router.get('/configs', authenticateToken, async (req, res) => {
  try {
    // Return configs in a shape that matches what the mobile app expects:
    // - id: number
    // - user_id: number
    // - bundle_id: number
    // - config_data: string (ovpn_config)
    // - expires_at: string
    // - created_at: string
    // - is_active: boolean
    // Additional fields like bundle_name/server_ip are included for display.
    const configs = await query(`
      SELECT
        vc.id,
        vc.user_id,
        vc.bundle_id,
        vc.ovpn_config AS config_data,
        vc.created_at,
        vc.expires_at,
        (vc.status = 'active') AS is_active,
        vc.server_ip,
        vc.server_port,
        vc.protocol,
        b.name AS bundle_name
      FROM vpn_configs vc
      JOIN bundles b ON vc.bundle_id = b.id
      WHERE vc.user_id = ?
      ORDER BY vc.created_at DESC
    `, [req.user.id]);
    
    res.json({
      success: true,
      message: 'VPN configurations retrieved',
      data: configs
    });
    
  } catch (error) {
    logger.error('VPN configs fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch VPN configurations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/vpn/config/:id
// @desc    Get specific VPN configuration
// @access  Private
router.get('/config/:id', authenticateToken, async (req, res) => {
  try {
    const configId = req.params.id;
    
    const configs = await query(`
      SELECT * FROM vpn_configs 
      WHERE id = ? AND user_id = ? AND status = 'active'
    `, [configId, req.user.id]);
    
    if (configs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'VPN configuration not found'
      });
    }
    
    res.json({
      success: true,
      message: 'VPN configuration retrieved',
      data: {
        id: configs[0].id,
        config_name: configs[0].config_name,
        ovpn_config: configs[0].ovpn_config,
        server_ip: configs[0].server_ip,
        server_port: configs[0].server_port,
        protocol: configs[0].protocol,
        expires_at: configs[0].expires_at
      }
    });
    
  } catch (error) {
    logger.error('VPN config fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch VPN configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/vpn/config/:id
// @desc    Revoke VPN configuration
// @access  Private
router.delete('/config/:id', authenticateToken, async (req, res) => {
  try {
    const configId = req.params.id;
    
    // Check if config belongs to user
    const configs = await query(
      'SELECT * FROM vpn_configs WHERE id = ? AND user_id = ?',
      [configId, req.user.id]
    );
    
    if (configs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'VPN configuration not found'
      });
    }
    
    // Revoke configuration
    await wireguardManager.revokeClientConfig(configId);
    
    res.json({
      success: true,
      message: 'VPN configuration revoked successfully'
    });
    
  } catch (error) {
    logger.error('VPN config revocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke VPN configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/vpn/connections
// @desc    Get active VPN connections (Owner only)
// @access  Private (Owner only)
router.get('/connections', authenticateToken, requireOwner, async (req, res) => {
  try {
    const connections = await wireguardManager.getActiveConnections();
    
    res.json({
      success: true,
      message: 'Active VPN connections retrieved',
      data: connections
    });
    
  } catch (error) {
    logger.error('VPN connections fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch VPN connections',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/vpn/connect
// @desc    Track VPN connection
// @access  Private
router.post('/connect', [
  authenticateToken,
  body('vpn_config_id')
    .isInt({ min: 1 })
    .withMessage('Valid VPN config ID is required'),
  body('client_ip')
    .isIP()
    .withMessage('Valid client IP is required'),
  body('bundle_id')
    .isInt({ min: 1 })
    .withMessage('Valid bundle ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { vpn_config_id, client_ip, bundle_id } = req.body;
    const userId = req.user.id;

    // Track the connection
    await wireguardManager.trackConnection(vpn_config_id, userId, bundle_id, client_ip);
    
    res.json({
      success: true,
      message: 'VPN connection tracked successfully'
    });
    
  } catch (error) {
    logger.error('VPN connection tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track VPN connection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/vpn/disconnect/:connection_id
// @desc    Disconnect VPN client
// @access  Private
router.post('/disconnect/:connection_id', authenticateToken, async (req, res) => {
  try {
    const connectionId = req.params.connection_id;
    const reason = req.body.reason || 'Manual disconnect';
    
    // Check if connection belongs to user or user is owner
    const connections = await query(`
      SELECT vc.*, b.owner_id FROM vpn_connections vc
      JOIN bundles b ON vc.bundle_id = b.id
      WHERE vc.id = ? AND (vc.user_id = ? OR b.owner_id = ?)
    `, [connectionId, req.user.id, req.user.id]);
    
    if (connections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'VPN connection not found'
      });
    }
    
    await wireguardManager.disconnectClient(connectionId, reason);
    
    res.json({
      success: true,
      message: 'VPN client disconnected successfully'
    });
    
  } catch (error) {
    logger.error('VPN disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect VPN client',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/vpn/track-connection
// @desc    Track VPN connection from OpenVPN client-connect script
// @access  Private (OpenVPN server via shared secret)
router.post('/track-connection', verifyTrackingSecret, async (req, res) => {
  try {
    const { user_id, bundle_id, client_ip, client_name, bytes_sent, bytes_received } = req.body;

    const userId = parseInt(user_id, 10);
    const bundleId = parseInt(bundle_id, 10);

    if (!Number.isInteger(userId) || !Number.isInteger(bundleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user_id or bundle_id'
      });
    }

    // Find most recent active VPN config for this user + bundle
    const configs = await query(
      `SELECT id FROM vpn_configs
       WHERE user_id = ? AND bundle_id = ? AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, bundleId]
    );

    if (configs.length === 0) {
      logger.warn(`track-connection: No active vpn_config for user ${userId}, bundle ${bundleId}`);
      return res.status(404).json({
        success: false,
        message: 'No active VPN configuration found for this user and bundle'
      });
    }

    const vpnConfigId = configs[0].id;

    await wireguardManager.trackConnection(vpnConfigId, userId, bundleId, client_ip);

    res.json({
      success: true,
      message: 'VPN connection tracked'
    });
  } catch (error) {
    logger.error('OpenVPN track-connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track VPN connection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/vpn/track-disconnection
// @desc    Track VPN disconnection from OpenVPN client-disconnect script
// @access  Private (OpenVPN server via shared secret)
router.post('/track-disconnection', verifyTrackingSecret, async (req, res) => {
  try {
    const { user_id, bundle_id, client_ip, bytes_sent, bytes_received, duration } = req.body;

    const userId = parseInt(user_id, 10);
    const bundleId = parseInt(bundle_id, 10);
    const sent = parseInt(bytes_sent, 10) || 0;
    const received = parseInt(bytes_received, 10) || 0;

    if (!Number.isInteger(userId) || !Number.isInteger(bundleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user_id or bundle_id'
      });
    }

    // Find latest active connection for this user/bundle/IP
    const connections = await query(
      `SELECT id FROM vpn_connections
       WHERE user_id = ? AND bundle_id = ? AND client_ip = ? AND status = 'connected'
       ORDER BY connected_at DESC
       LIMIT 1`,
      [userId, bundleId, client_ip]
    );

    if (connections.length === 0) {
      logger.warn(`track-disconnection: No active connection for user ${userId}, bundle ${bundleId}, ip ${client_ip}`);
      return res.status(404).json({
        success: false,
        message: 'No active VPN connection found'
      });
    }

    const connectionId = connections[0].id;

    await wireguardManager.updateConnectionStats(connectionId, sent, received);
    await wireguardManager.disconnectClient(connectionId, 'Client disconnected (OpenVPN event)');

    res.json({
      success: true,
      message: 'VPN disconnection tracked'
    });
  } catch (error) {
    logger.error('OpenVPN track-disconnection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track VPN disconnection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

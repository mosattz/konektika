const { query, connectDB } = require('../config/database');
const logger = require('../utils/logger');

async function setupDatabase() {
  try {
    logger.info('Starting database setup...');
    
    // Connect to database
    await connectDB();
    logger.info('Connected to database');

    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        user_type ENUM('owner', 'client') NOT NULL DEFAULT 'client',
        status ENUM('active', 'inactive', 'suspended', 'banned') DEFAULT 'active',
        
        avatar VARCHAR(500),
        country VARCHAR(100) DEFAULT 'Tanzania',
        city VARCHAR(100),
        
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        
        INDEX idx_email (email),
        INDEX idx_phone (phone),
        INDEX idx_user_type (user_type),
        INDEX idx_status (status)
      )
    `);
    logger.info('✅ Users table created/verified');

    // Create bundles table
    await query(`
      CREATE TABLE IF NOT EXISTS bundles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        owner_id INT NOT NULL,
        
        name VARCHAR(255) NOT NULL,
        description TEXT,
        data_limit DECIMAL(10,2) NOT NULL,
        speed_limit DECIMAL(8,2) DEFAULT NULL,
        duration_hours INT NOT NULL DEFAULT 24,
        
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'TZS',
        
        max_clients INT DEFAULT 10,
        current_clients INT DEFAULT 0,
        status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_owner_id (owner_id),
        INDEX idx_status (status),
        INDEX idx_price (price)
      )
    `);
    logger.info('✅ Bundles table created/verified');

    // Create vpn_configs table
    await query(`
      CREATE TABLE IF NOT EXISTS vpn_configs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        bundle_id INT NOT NULL,
        
        config_name VARCHAR(255) NOT NULL,
        ovpn_config TEXT NOT NULL,
        client_key TEXT NOT NULL,
        client_cert TEXT NOT NULL,
        client_ip VARCHAR(45),
        
        server_ip VARCHAR(45) NOT NULL,
        server_port INT NOT NULL DEFAULT 51820,
        protocol VARCHAR(20) DEFAULT 'wireguard',
        
        status ENUM('active', 'revoked', 'expired') DEFAULT 'active',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_bundle_id (bundle_id),
        INDEX idx_status (status),
        INDEX idx_client_ip (client_ip)
      )
    `);
    logger.info('✅ VPN configs table created/verified');

    // Create vpn_connections table
    await query(`
      CREATE TABLE IF NOT EXISTS vpn_connections (
        id INT PRIMARY KEY AUTO_INCREMENT,
        vpn_config_id INT NOT NULL,
        user_id INT NOT NULL,
        bundle_id INT NOT NULL,
        
        client_ip VARCHAR(45),
        server_ip VARCHAR(45),
        connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        disconnected_at TIMESTAMP NULL,
        
        bytes_sent BIGINT DEFAULT 0,
        bytes_received BIGINT DEFAULT 0,
        
        status ENUM('connected', 'disconnected', 'error') DEFAULT 'connected',
        disconnect_reason VARCHAR(255),
        
        FOREIGN KEY (vpn_config_id) REFERENCES vpn_configs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
        INDEX idx_vpn_config_id (vpn_config_id),
        INDEX idx_user_id (user_id),
        INDEX idx_bundle_id (bundle_id),
        INDEX idx_connected_at (connected_at),
        INDEX idx_status (status)
      )
    `);
    logger.info('✅ VPN connections table created/verified');

    // Create payments table
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        bundle_id INT NOT NULL,
        
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'TZS',
        payment_method ENUM('mobile_money', 'bank_card', 'crypto', 'airtel_money', 'tigo_pesa', 'vodacom_mpesa', 'pesapal') NOT NULL,
        
        transaction_id VARCHAR(255) UNIQUE,
        gateway_reference VARCHAR(255),
        gateway_response JSON,
        
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        paid_at TIMESTAMP NULL,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_bundle_id (bundle_id),
        INDEX idx_transaction_id (transaction_id),
        INDEX idx_status (status),
        INDEX idx_payment_method (payment_method)
      )
    `);
    logger.info('✅ Payments table created/verified');

    // Create subscriptions table
    await query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        bundle_id INT NOT NULL,
        payment_id INT,
        
        status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
        data_used DECIMAL(10,2) DEFAULT 0,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_bundle_id (bundle_id),
        INDEX idx_status (status),
        INDEX idx_expires_at (expires_at)
      )
    `);
    logger.info('✅ Subscriptions table created/verified');

    // Create settings table
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_setting_key (setting_key)
      )
    `);
    logger.info('✅ Settings table created/verified');

    logger.info('✅ Database setup completed successfully!');
    return true;
  } catch (error) {
    logger.error('❌ Database setup failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { setupDatabase };

-- Konektika VPN Bundle Sharing Database Schema
-- MySQL/MariaDB Compatible

CREATE DATABASE IF NOT EXISTS konektika CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE konektika;

-- Users table (bundle owners and clients)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    user_type ENUM('owner', 'client') NOT NULL DEFAULT 'client',
    status ENUM('active', 'inactive', 'suspended', 'banned') DEFAULT 'active',
    
    -- Profile information
    avatar VARCHAR(500),
    country VARCHAR(100) DEFAULT 'Tanzania',
    city VARCHAR(100),
    
    -- Verification
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_user_type (user_type),
    INDEX idx_status (status)
);

-- Bundle packages (data plans offered by owners)
CREATE TABLE bundles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    owner_id INT NOT NULL,
    
    -- Bundle details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_limit DECIMAL(10,2) NOT NULL, -- In MB
    speed_limit DECIMAL(8,2) DEFAULT NULL, -- In Mbps, NULL = unlimited
    duration_hours INT NOT NULL DEFAULT 24, -- How long the bundle lasts
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TZS',
    
    -- Availability
    max_clients INT DEFAULT 10,
    current_clients INT DEFAULT 0,
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_owner_id (owner_id),
    INDEX idx_status (status),
    INDEX idx_price (price)
);

-- VPN configurations for each user
CREATE TABLE vpn_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    bundle_id INT NOT NULL,
    
    -- OpenVPN Configuration
    config_name VARCHAR(255) NOT NULL,
    ovpn_config TEXT NOT NULL, -- The actual .ovpn file content
    client_key TEXT NOT NULL,
    client_cert TEXT NOT NULL,
    
    -- Connection details
    server_ip VARCHAR(45) NOT NULL,
    server_port INT NOT NULL DEFAULT 1194,
    protocol ENUM('udp', 'tcp') DEFAULT 'udp',
    
    -- Status
    status ENUM('active', 'revoked', 'expired') DEFAULT 'active',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_bundle_id (bundle_id),
    INDEX idx_status (status)
);

-- VPN connections tracking
CREATE TABLE vpn_connections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vpn_config_id INT NOT NULL,
    user_id INT NOT NULL,
    bundle_id INT NOT NULL,
    
    -- Connection details
    client_ip VARCHAR(45),
    server_ip VARCHAR(45),
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP NULL,
    
    -- Data usage
    bytes_sent BIGINT DEFAULT 0,
    bytes_received BIGINT DEFAULT 0,
    total_bytes BIGINT GENERATED ALWAYS AS (bytes_sent + bytes_received) STORED,
    
    -- Connection status
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
);

-- Payments for bundle purchases
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    bundle_id INT NOT NULL,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TZS',
    payment_method ENUM('mobile_money', 'bank_card', 'crypto', 'airtel_money', 'tigo_pesa', 'vodacom_mpesa') NOT NULL,
    
    -- Payment gateway details
    transaction_id VARCHAR(255) UNIQUE,
    gateway_reference VARCHAR(255),
    gateway_response JSON,
    
    -- Status
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    
    -- Timestamps
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
);

-- User bundle subscriptions
CREATE TABLE subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    bundle_id INT NOT NULL,
    payment_id INT,
    
    -- Subscription details
    status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
    data_used DECIMAL(10,2) DEFAULT 0, -- In MB
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_bundle_id (bundle_id),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
);

-- System settings and configuration
CREATE TABLE settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
);

-- Mobile app versions and updates
CREATE TABLE app_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    platform ENUM('android', 'ios') NOT NULL,
    version_name VARCHAR(50) NOT NULL,
    version_code INT NOT NULL,
    download_url VARCHAR(500) NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    release_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_platform (platform),
    INDEX idx_version_code (version_code)
);

-- Notifications for users
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Notification content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'error', 'success', 'bundle', 'payment') DEFAULT 'info',
    
    -- Delivery
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_type (type),
    INDEX idx_sent_at (sent_at)
);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES 
('app_name', 'Konektika', 'string', 'Application name'),
('default_currency', 'TZS', 'string', 'Default currency code'),
('min_bundle_price', '1000', 'number', 'Minimum bundle price in default currency'),
('max_bundle_price', '50000', 'number', 'Maximum bundle price in default currency'),
('vpn_server_ip', '192.168.1.1', 'string', 'VPN server IP address'),
('vpn_server_port', '1194', 'number', 'VPN server port'),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode'),
('registration_enabled', 'true', 'boolean', 'Allow new user registration');

-- Create indexes for performance
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_bundles_created_at ON bundles(created_at);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_vpn_connections_data_usage ON vpn_connections(total_bytes);
CREATE INDEX idx_subscriptions_user_bundle ON subscriptions(user_id, bundle_id);
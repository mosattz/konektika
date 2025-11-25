-- Mobile Money Transactions Table Migration
-- This table tracks mobile money specific transaction details
-- Created: 2025-10-19

USE konektika;

-- Add mobile money specific table for tracking
CREATE TABLE IF NOT EXISTS mobile_money_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_id INT NOT NULL,
    provider ENUM('vodacom_mpesa', 'tigo_pesa', 'airtel_money') NOT NULL,
    
    -- Provider specific fields
    provider_transaction_id VARCHAR(255),
    provider_reference VARCHAR(255),
    customer_phone VARCHAR(20) NOT NULL,
    
    -- Request/Response tracking
    api_request JSON,
    api_response JSON,
    webhook_data JSON,
    
    -- Status tracking
    provider_status VARCHAR(50),
    status ENUM('initiated', 'pending', 'completed', 'failed', 'expired') DEFAULT 'initiated',
    
    -- Error tracking
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_payment_id (payment_id),
    INDEX idx_provider (provider),
    INDEX idx_provider_transaction_id (provider_transaction_id),
    INDEX idx_customer_phone (customer_phone),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Add additional settings for mobile money configuration
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES 
('mpesa_enabled', 'true', 'boolean', 'Enable Vodacom M-Pesa payments'),
('tigo_pesa_enabled', 'true', 'boolean', 'Enable Tigo Pesa payments'),
('airtel_money_enabled', 'true', 'boolean', 'Enable Airtel Money payments'),
('payment_timeout_minutes', '10', 'number', 'Payment timeout in minutes'),
('max_payment_retry_attempts', '3', 'number', 'Maximum payment retry attempts'),
('payment_webhook_secret', 'your_webhook_secret_here', 'string', 'Webhook signature validation secret')
ON DUPLICATE KEY UPDATE 
    setting_value = VALUES(setting_value),
    updated_at = CURRENT_TIMESTAMP;

-- Create view for payment analytics
CREATE OR REPLACE VIEW payment_analytics AS
SELECT 
    p.payment_method,
    COUNT(*) as total_payments,
    SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as successful_payments,
    SUM(CASE WHEN p.status = 'failed' THEN 1 ELSE 0 END) as failed_payments,
    SUM(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
    SUM(p.amount) as total_amount,
    SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as successful_amount,
    AVG(CASE WHEN p.status = 'completed' THEN p.amount END) as avg_successful_amount,
    DATE(p.created_at) as payment_date
FROM payments p
GROUP BY p.payment_method, DATE(p.created_at)
ORDER BY payment_date DESC;

-- Create procedure for cleaning up expired transactions
DELIMITER //
CREATE PROCEDURE CleanupExpiredTransactions()
BEGIN
    -- Update expired mobile money transactions
    UPDATE mobile_money_transactions 
    SET status = 'expired' 
    WHERE status IN ('initiated', 'pending') 
    AND expires_at < NOW();
    
    -- Update corresponding payment records
    UPDATE payments p
    JOIN mobile_money_transactions mmt ON p.id = mmt.payment_id
    SET p.status = 'failed'
    WHERE mmt.status = 'expired' 
    AND p.status = 'pending';
    
    SELECT ROW_COUNT() as expired_transactions_updated;
END //
DELIMITER ;

-- Create event to run cleanup procedure every hour
CREATE EVENT IF NOT EXISTS cleanup_expired_transactions
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
DO
CALL CleanupExpiredTransactions();

-- Verify migration
SELECT 'Mobile money transactions table created successfully' as message;
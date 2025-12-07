-- Simplified Mobile Money Transactions Migration
-- Created: 2025-10-19

USE konektika;

-- Create mobile money transactions table
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
    
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

-- Create indexes for performance (MySQL compatible)
CREATE INDEX idx_mmt_payment_id ON mobile_money_transactions(payment_id);
CREATE INDEX idx_mmt_provider ON mobile_money_transactions(provider);
CREATE INDEX idx_mmt_provider_transaction_id ON mobile_money_transactions(provider_transaction_id);
CREATE INDEX idx_mmt_customer_phone ON mobile_money_transactions(customer_phone);
CREATE INDEX idx_mmt_status ON mobile_money_transactions(status);
CREATE INDEX idx_mmt_created_at ON mobile_money_transactions(created_at);

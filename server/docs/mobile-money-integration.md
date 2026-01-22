# Tanzania Mobile Money Integration Design

## Overview
This document outlines the integration with Tanzania's major mobile money providers for the Konektika VPN bundle sharing platform.

## Supported Mobile Money Providers

### 1. Vodacom M-Pesa
- **Market Share**: ~40% of mobile money transactions in Tanzania
- **API**: Vodacom M-Pesa Business API
- **Authentication**: OAuth 2.0
- **Transaction Types**: C2B (Customer to Business), B2C (Business to Customer)
- **Webhook Support**: Yes
- **Test Environment**: Available

### 2. Tigo Pesa (Millicom)
- **Market Share**: ~30% of mobile money transactions
- **API**: Tigo Pesa Business API
- **Authentication**: Bearer Token
- **Transaction Types**: Payment Collection, Disbursement
- **Webhook Support**: Yes
- **Test Environment**: Available

### 3. Airtel Money
- **Market Share**: ~25% of mobile money transactions
- **API**: Airtel Money Business API
- **Authentication**: API Key + Secret
- **Transaction Types**: Collection, Disbursement
- **Webhook Support**: Yes
- **Test Environment**: Available

## Integration Architecture

### Payment Flow
1. **Customer Initiates Payment**
   - Selects bundle on mobile app
   - Chooses mobile money provider
   - Enters phone number
   
2. **Payment Request**
   - Backend creates payment record (status: pending)
   - Calls mobile money provider API
   - Customer receives SMS/USSD prompt on their phone
   
3. **Customer Authorizes**
   - Customer enters PIN on their mobile money app/USSD
   - Mobile money provider processes payment
   
4. **Payment Notification**
   - Provider calls our webhook with payment status
   - Backend updates payment record
   - Customer receives confirmation
   
5. **Service Activation**
   - If payment successful, activate bundle subscription
   - Generate VPN configuration
   - Send credentials to customer

### Database Schema Updates
```sql
-- Additional payment methods already defined in schema
-- payment_method ENUM includes 'airtel_money', 'tigo_pesa', 'vodacom_mpesa'

-- Add mobile money specific table for tracking
CREATE TABLE mobile_money_transactions (
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
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    INDEX idx_payment_id (payment_id),
    INDEX idx_provider (provider),
    INDEX idx_provider_transaction_id (provider_transaction_id),
    INDEX idx_customer_phone (customer_phone),
    INDEX idx_status (status)
);
```

### API Configuration
```javascript
// Environment variables needed
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_BUSINESS_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://your-domain.com/api/webhooks/mpesa

TIGO_PESA_API_KEY=your_api_key
TIGO_PESA_SECRET=your_secret
TIGO_PESA_CALLBACK_URL=https://your-domain.com/api/webhooks/tigo-pesa

AIRTEL_CLIENT_ID=your_client_id
AIRTEL_CLIENT_SECRET=your_client_secret
AIRTEL_CALLBACK_URL=https://your-domain.com/api/webhooks/airtel-money
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create mobile money service classes
2. Implement webhook handlers
3. Add database migration for mobile_money_transactions table
4. Create payment processing middleware

### Phase 2: Provider Integration
1. Vodacom M-Pesa integration
2. Tigo Pesa integration
3. Airtel Money integration
4. Error handling and retry logic

### Phase 3: Testing & Validation
1. Unit tests for each provider
2. Integration tests with test environments
3. End-to-end payment flow testing
4. Error scenario testing

### Phase 4: Production Deployment
1. Configure production API credentials
2. Set up monitoring and alerting
3. Deploy webhook endpoints
4. Performance optimization

## Security Considerations
- API credentials stored as environment variables
- Webhook signature validation
- Transaction idempotency
- Rate limiting on payment endpoints
- Fraud detection mechanisms

## Error Handling
- Network timeouts and retries
- Provider API errors
- Webhook delivery failures
- Customer payment failures
- Partial payment scenarios

## Monitoring & Analytics
- Payment success rates per provider
- Transaction processing times
- Failed payment analysis
- Customer payment preferences
- Revenue tracking per provider

## Compliance
- PCI DSS compliance for payment processing
- Tanzania financial regulations compliance
- Data privacy (customer phone numbers)
- Transaction reporting requirements
-- Seed default VPN bundles for Konektika
-- Pricing: Daily (1000 TZS), Weekly (3000 TZS), Monthly (17000 TZS), Premium 3-Month (45000 TZS)

USE konektika;

-- First, create a default owner user if not exists
INSERT INTO users (email, phone, password, full_name, user_type, status, email_verified, phone_verified)
VALUES ('owner@konektika.com', '+255000000001', '$2b$10$rHzDqKj7FvJxVzN3Yo5yU.qOj0EQJ/V0vCqKKG9mZPQzP4qzU1yJK', 'Konektika Admin', 'owner', 'active', TRUE, TRUE)
ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id);

-- Get the owner ID
SET @owner_id = LAST_INSERT_ID();

-- Delete existing bundles if any (for clean seed)
DELETE FROM bundles WHERE owner_id = @owner_id;

-- Insert Daily Bundle (1000 TZS)
INSERT INTO bundles (
    owner_id, 
    name, 
    description, 
    data_limit, 
    duration_hours, 
    price, 
    currency, 
    max_clients, 
    status
) VALUES (
    @owner_id,
    'Daily Bundle',
    'Perfect for short-term usage. 5GB data valid for 24 hours with unlimited speed.',
    5120, -- 5GB in MB
    24, -- 24 hours
    1000.00,
    'TZS',
    50,
    'active'
);

-- Insert Weekly Bundle (3000 TZS)
INSERT INTO bundles (
    owner_id, 
    name, 
    description, 
    data_limit, 
    duration_hours, 
    price, 
    currency, 
    max_clients, 
    status
) VALUES (
    @owner_id,
    'Weekly Bundle',
    'Great value for a week. 20GB data valid for 7 days with high-speed connection.',
    20480, -- 20GB in MB
    168, -- 7 days * 24 hours
    3000.00,
    'TZS',
    50,
    'active'
);

-- Insert Monthly Bundle (17000 TZS)
INSERT INTO bundles (
    owner_id, 
    name, 
    description, 
    data_limit, 
    duration_hours, 
    price, 
    currency, 
    max_clients, 
    status
) VALUES (
    @owner_id,
    'Monthly Bundle',
    'Best for regular users. 100GB data valid for 30 days with unlimited speed.',
    102400, -- 100GB in MB
    720, -- 30 days * 24 hours
    17000.00,
    'TZS',
    50,
    'active'
);

-- Insert Premium 3-Month Bundle (45000 TZS)
INSERT INTO bundles (
    owner_id, 
    name, 
    description, 
    data_limit, 
    duration_hours, 
    price, 
    currency, 
    max_clients, 
    status
) VALUES (
    @owner_id,
    'Premium 3-Month Bundle',
    'Ultimate value for power users. 500GB data valid for 90 days with priority speed and support.',
    512000, -- 500GB in MB
    2160, -- 90 days * 24 hours
    45000.00,
    'TZS',
    30,
    'active'
);

-- Verify bundles were created
SELECT 
    id,
    name,
    CONCAT(ROUND(data_limit/1024, 0), 'GB') as data_limit,
    CONCAT(ROUND(duration_hours/24, 0), ' days') as duration,
    CONCAT(price, ' ', currency) as price,
    status
FROM bundles 
WHERE owner_id = @owner_id
ORDER BY price ASC;

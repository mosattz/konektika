-- Konektika Database Setup Script
-- This script creates the database, user, and imports the schema

-- Create the database
CREATE DATABASE IF NOT EXISTS konektika CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create the user and grant permissions
CREATE USER IF NOT EXISTS 'konektika_user'@'localhost' IDENTIFIED BY 'konektika_pass_2024';
GRANT ALL PRIVILEGES ON konektika.* TO 'konektika_user'@'localhost';
FLUSH PRIVILEGES;

-- Show created database and user
SHOW DATABASES LIKE 'konektika';
SELECT User, Host FROM mysql.user WHERE User = 'konektika_user';

-- Test connection as the new user
-- This will be done separately after running this script
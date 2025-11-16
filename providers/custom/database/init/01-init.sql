-- Custom IdP Database Initialization
-- This file will be executed when MySQL container starts

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS custom_idp;

-- Use the database
USE custom_idp;

-- Create user if not exists (MySQL 8.0 syntax)
CREATE USER IF NOT EXISTS 'idp_user'@'%' IDENTIFIED BY 'idp_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON custom_idp.* TO 'idp_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Log initialization
SELECT 'Custom IdP Database initialized successfully' AS message;
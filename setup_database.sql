-- Create otto_v2 database
CREATE DATABASE IF NOT EXISTS otto_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant all privileges on otto_v2 database to ottouser
GRANT ALL PRIVILEGES ON otto_v2.* TO 'ottouser'@'localhost';
FLUSH PRIVILEGES;

-- Verify grants
SHOW GRANTS FOR 'ottouser'@'localhost';

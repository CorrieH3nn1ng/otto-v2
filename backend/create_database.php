<?php
// Create otto_v2 database
$db_host = 'localhost';
$db_user = 'ottouser';
$db_pass = 'otto2025';
$db_port = '3306';

try {
    // Connect without specifying database
    $pdo = new PDO(
        "mysql:host=$db_host;port=$db_port;charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]
    );

    // Create database if it doesn't exist
    $pdo->exec("CREATE DATABASE IF NOT EXISTS otto_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    echo "Database otto_v2 created successfully!\n";

} catch (PDOException $e) {
    die("Error: " . $e->getMessage() . "\n");
}

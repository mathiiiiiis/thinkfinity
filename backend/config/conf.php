<?php
require_once 'vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Database connection
function getDbConnection() {
    $host = $_ENV['MYSQL_HOST'] ?? 'mysql';
    $db = $_ENV['MYSQL_DATABASE'] ?? 'thinkfinity';
    $user = $_ENV['MYSQL_USER'] ?? 'thinkfinity_user';
    $pass = $_ENV['MYSQL_PASSWORD'] ?? 'thinkfinity_password';
    
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }
}
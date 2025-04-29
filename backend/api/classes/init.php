<?php
// Database connection and initialization

// Check if the file is being directly accessed
if (!defined('ABSPATH') && basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    exit('Direct script access denied.');
}

$rootPath = $_SERVER['DOCUMENT_ROOT'];
$autoloadPath = $rootPath . '/vendor/autoload.php';

// Log the path
error_log("Looking for autoload.php at: $autoloadPath");

// Check if the file exists
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
    error_log("Successfully loaded autoload.php");
    
    try {
        $dotenv = \Dotenv\Dotenv::createImmutable($rootPath);
        $dotenv->load();
        error_log("Loaded .env file from $rootPath");
    } catch (Exception $e) {
        error_log("Warning: Failed to load .env file: " . $e->getMessage());
    }
} else {
    error_log("Warning: Could not find vendor/autoload.php at $autoloadPath");
}

// Database connection
function getDbConnection() {
    // Default database connection info if not in .env
    $host = $_ENV['MYSQL_HOST'] ?? 'localhost';
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
        echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }
}

// Create class tables if they don't exist
function ensureClassTablesExist() {
    $pdo = getDbConnection();
    
    try {
        // Check if classes table exists
        $tableExists = false;
        $tables = $pdo->query("SHOW TABLES LIKE 'classes'")->fetchAll();
        if (count($tables) > 0) {
            $tableExists = true;
        }
        
        if (!$tableExists) {
            // Create classes table
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS classes (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    uuid VARCHAR(50) NOT NULL UNIQUE,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    teacher_id BIGINT UNSIGNED NOT NULL,
                    category VARCHAR(50),
                    level VARCHAR(50),
                    color VARCHAR(20) DEFAULT '#4A6FFF',
                    class_code VARCHAR(20) NOT NULL UNIQUE,
                    cover_image VARCHAR(255),
                    visibility ENUM('public', 'private') DEFAULT 'private',
                    status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ");
            error_log("Created classes table");
            
            // Create class_members table
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS class_members (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    class_id BIGINT UNSIGNED NOT NULL,
                    user_id BIGINT UNSIGNED NOT NULL,
                    role ENUM('student', 'assistant', 'teacher') DEFAULT 'student',
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ");
            error_log("Created class_members table");
            
            // Create class_assignments table
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS class_assignments (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    class_id BIGINT UNSIGNED NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    due_date DATETIME NOT NULL,
                    points INT UNSIGNED DEFAULT 100,
                    status ENUM('draft', 'published', 'archived') DEFAULT 'published',
                    created_by BIGINT UNSIGNED NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
                )
            ");
            error_log("Created class_assignments table");
            
            // Create assignment_submissions table
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS assignment_submissions (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    assignment_id BIGINT UNSIGNED NOT NULL,
                    user_id BIGINT UNSIGNED NOT NULL,
                    content TEXT,
                    attachments TEXT,
                    status ENUM('draft', 'submitted', 'graded', 'late') DEFAULT 'draft',
                    grade DECIMAL(5,2),
                    feedback TEXT,
                    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (assignment_id) REFERENCES class_assignments(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ");
            error_log("Created assignment_submissions table");
            
            // Create class_messages table
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS class_messages (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    class_id BIGINT UNSIGNED NOT NULL,
                    user_id BIGINT UNSIGNED NOT NULL,
                    message TEXT NOT NULL,
                    message_type ENUM('announcement', 'chat') DEFAULT 'chat',
                    recipient_id BIGINT UNSIGNED,
                    is_private BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL
                )
            ");
            error_log("Created class_messages table");
        }
    } catch (PDOException $e) {
        error_log("Failed to create class tables: " . $e->getMessage());
        throw $e;
    }
}
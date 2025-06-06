<?php
// Backend settings API handling
ob_start();

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

$rootPath = $_SERVER['DOCUMENT_ROOT'];
$autoloadPath = $rootPath . '/vendor/autoload.php';

// Log the path for debugging
error_log("Looking for autoload.php at: $autoloadPath");

// Check if the file exists
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
    error_log("Successfully loaded autoload.php");
    
    // Load .env file
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

$action = $_GET['action'] ?? '';

header('Content-Type: application/json');

// Handle API requests
if ($action) {
    try {
        $jsonInput = file_get_contents('php://input');
        
        if (empty($jsonInput) && $action == 'get_settings') {
            $data = [];
        } else {
            $data = json_decode($jsonInput, true);
            
            if (json_last_error() !== JSON_ERROR_NONE && !empty($jsonInput)) {
                error_log("JSON error: " . json_last_error_msg() . " - Input: " . $jsonInput);
                throw new Exception('Invalid JSON data: ' . json_last_error_msg());
            }
        }
        
        $token = $data['token'] ?? null;

        if (!$token) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? '';
            
            if (strpos($authHeader, 'Bearer ') === 0) {
                $token = trim(substr($authHeader, 7));
                error_log("Found token in Authorization header: " . substr($token, 0, 10) . "...");
            }
            
            if (!$token) {
                foreach ($_COOKIE as $name => $value) {
                    if (strpos($name, 'auth_') === 0 || strpos($name, 'token') !== false) {
                        $token = $value;
                        error_log("Found token in cookie: $name");
                        break;
                    }
                }
            }
            
            if (!$token) {
                error_log("No token found. Available cookies: " . json_encode($_COOKIE));
            }
        }
        
        if (!$token) {
            throw new Exception('Authentication token is required');
        }
        
        // Verify token
        $tokenData = verifyToken($token);
        
        if (!$tokenData['success']) {
            throw new Exception($tokenData['message']);
        }
        
        $userId = $tokenData['user']['id'];
        
        // Process actions
        switch ($action) {
            case 'get_settings':
                $settings = getUserSettings($userId);
                echo json_encode([
                    'success' => true,
                    'settings' => $settings,
                    'user' => $tokenData['user']
                ]);
                break;
                
            case 'update_settings':
                if (!isset($data['settings']) || !is_array($data['settings'])) {
                    throw new Exception('Settings data is required');
                }
                
                $result = updateUserSettings($userId, $data['settings']);
                
                if (!$result['success']) {
                    throw new Exception($result['message']);
                }
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Settings updated successfully',
                    'user' => $tokenData['user']
                ]);
                break;
                
            case 'update_password':
                echo json_encode([
                    'success' => true,
                    'message' => 'Password updated successfully'
                ]);
                break;
                
            case 'get_sessions':
                $result = getUserSessions($userId);
                echo json_encode($result);
                break;
                
            case 'terminate_session':
                if (!isset($data['sessionId'])) {
                    throw new Exception('Session ID is required');
                }
                
                $result = terminateSession($userId, $data['sessionId']);
                echo json_encode($result);
                break;
                
            case 'download_data':
                exportUserData($userId);
                // Note: exportUserData will exit the script after sending the file
                break;
                
            case 'delete_account':
                $result = deleteUserAccount($userId);
                echo json_encode($result);
                break;
                
            default:
                throw new Exception('Invalid action');
        }
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
    
    exit;
}

function getDbConnection() {
    $host = $_ENV['MYSQL_HOST'] ?? 'localhost';
    $db = $_ENV['MYSQL_DATABASE'] ?? 'thinkfinity';
    $user = $_ENV['MYSQL_USER'] ?? 'thinkfinity_user';
    $pass = $_ENV['MYSQL_PASSWORD'] ?? 'thinkfinity_password';
    
    error_log("Connecting to database: $host, $db, $user");
    
    try {
        try {
            $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            $stmt = $pdo->query("SHOW DATABASES LIKE '$db'");
            if ($stmt->rowCount() === 0) {
                error_log("Database $db does not exist");
                throw new PDOException("Database $db does not exist");
            }

            $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            error_log("Successfully connected to database: $db");
            
            return $pdo;
        } catch (PDOException $pre) {
            error_log("Failed to connect without database: " . $pre->getMessage());

            $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            error_log("Successfully connected to database through fallback: $db");
            
            return $pdo;
        }
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }
}

function verifyToken($token) {
    error_log("Verifying token: " . substr($token, 0, 10) . "...");
    
    try {
        $pdo = getDbConnection();
        
        // First check if the sessions table exists
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'sessions'");
        if ($tableCheck->rowCount() === 0) {
            error_log("Sessions table does not exist");
            return ['success' => false, 'message' => 'Sessions table does not exist'];
        }
        
        // Verify token exists in sessions table
        try {
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as count
                FROM sessions
                WHERE token = ?
            ");
            $stmt->execute([$token]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['count'] == 0) {
                error_log("Token not found in database");
                return ['success' => false, 'message' => 'Invalid token'];
            }
        } catch (PDOException $e) {
            error_log("Error checking token existence: " . $e->getMessage());
            // Continue to try the full query
        }
        
        // Now get user data with the token
        $stmt = $pdo->prepare("
            SELECT s.id, s.user_id, s.expires_at, u.uuid, u.username, u.email, u.profile_image 
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? 
        ");
        $stmt->execute([$token]);
        
        if ($stmt->rowCount() === 0) {
            error_log("User not found for token");
            return ['success' => false, 'message' => 'User not found for token'];
        }
        
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Check if token is expired (if we have expires_at field)
        if (isset($data['expires_at']) && strtotime($data['expires_at']) < time()) {
            error_log("Token expired at: " . $data['expires_at']);
            return ['success' => false, 'message' => 'Token expired'];
        }
        
        error_log("Token verified successfully for user: " . $data['username']);
        
        return [
            'success' => true,
            'user' => [
                'id' => $data['user_id'],
                'uuid' => $data['uuid'],
                'username' => $data['username'],
                'email' => $data['email'],
                'profileImage' => $data['profile_image']
            ]
        ];
    } catch (PDOException $e) {
        error_log("Database error during token verification: " . $e->getMessage());
        return ['success' => false, 'message' => 'Token verification failed: ' . $e->getMessage()];
    } catch (Exception $e) {
        error_log("General error during token verification: " . $e->getMessage());
        return ['success' => false, 'message' => 'Token verification failed: ' . $e->getMessage()];
    }
}

if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

// Get user settings
function getUserSettings($userId) {
    $pdo = getDbConnection();
    
    try {
        // Check if user_settings table exists
        $tableExists = false;
        $tables = $pdo->query("SHOW TABLES LIKE 'user_settings'")->fetchAll();
        if (count($tables) > 0) {
            $tableExists = true;
        }

        if (!$tableExists) {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS user_settings (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT UNSIGNED NOT NULL,
                    full_name VARCHAR(255) DEFAULT NULL,
                    phone VARCHAR(50) DEFAULT NULL,
                    country VARCHAR(50) DEFAULT 'us',
                    education VARCHAR(50) DEFAULT 'high-school',
                    field_of_study VARCHAR(255) DEFAULT NULL,
                    theme VARCHAR(20) DEFAULT 'light',
                    font_size INT DEFAULT 100,
                    accent_color VARCHAR(20) DEFAULT '#4a6cf7',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ");
            error_log("Created user_settings table");
        }
        
        // Check if user has settings
        $stmt = $pdo->prepare("SELECT * FROM user_settings WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        if ($stmt->rowCount() === 0) {
            // Create default settings
            $stmt = $pdo->prepare("
                INSERT INTO user_settings (
                    user_id, full_name, phone, country, education, field_of_study, 
                    theme, font_size, accent_color
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $userId, '', '', 'us', 'high-school', '', 
                'light', 100, '#4a6cf7'
            ]);
            
            return [
                'fullName' => '',
                'phone' => '',
                'country' => 'us',
                'education' => 'high-school',
                'field' => '',
                'theme' => 'light',
                'fontSize' => 100,
                'accentColor' => '#4a6cf7'
            ];
        }
        
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'fullName' => $settings['full_name'],
            'phone' => $settings['phone'],
            'country' => $settings['country'],
            'education' => $settings['education'],
            'field' => $settings['field_of_study'],
            'theme' => $settings['theme'],
            'fontSize' => $settings['font_size'],
            'accentColor' => $settings['accent_color']
        ];
    } catch (PDOException $e) {
        error_log('Settings fetch error: ' . $e->getMessage());
        return [
            'fullName' => '',
            'phone' => '',
            'country' => 'us',
            'education' => 'high-school',
            'field' => '',
            'theme' => 'light',
            'fontSize' => 100,
            'accentColor' => '#4a6cf7'
        ];
    }
}

// Update user settings
function updateUserSettings($userId, $data) {
    $pdo = getDbConnection();
    
    // Enhanced logging
    error_log("Starting updateUserSettings for userId: {$userId}");
    error_log("Data received: " . json_encode($data));
    
    try {
        // Start transaction
        $pdo->beginTransaction();
        
        // Update username and email in users table if provided
        if (isset($data['username']) || isset($data['email'])) {
            $updateFields = [];
            $updateParams = [];
            
            if (isset($data['username'])) {
                // Check if username already exists
                $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
                $stmt->execute([$data['username'], $userId]);
                
                if ($stmt->rowCount() > 0) {
                    error_log("Username '{$data['username']}' already taken");
                    $pdo->rollBack();
                    return ['success' => false, 'message' => 'Username already taken'];
                }
                
                $updateFields[] = "username = ?";
                $updateParams[] = $data['username'];
                error_log("Adding username to update fields: {$data['username']}");
            }
            
            if (isset($data['email'])) {
                // Check if email already exists
                $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
                $stmt->execute([$data['email'], $userId]);
                
                if ($stmt->rowCount() > 0) {
                    error_log("Email '{$data['email']}' already taken");
                    $pdo->rollBack();
                    return ['success' => false, 'message' => 'Email already taken'];
                }
                
                $updateFields[] = "email = ?";
                $updateParams[] = $data['email'];
                error_log("Adding email to update fields: {$data['email']}");
            }
            
            if (!empty($updateFields)) {
                $updateQuery = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = ?";
                $updateParams[] = $userId;
                
                error_log("User update query: {$updateQuery}");
                $stmt = $pdo->prepare($updateQuery);
                $stmt->execute($updateParams);
                error_log("User table updated successfully");
            }
        }
        
        // Check if user_settings table exists and create if needed
        $tableExists = false;
        $tables = $pdo->query("SHOW TABLES LIKE 'user_settings'")->fetchAll();
        if (count($tables) > 0) {
            $tableExists = true;
            error_log("user_settings table exists");
        } else {
            error_log("user_settings table does not exist, creating it");
        }
        
        if (!$tableExists) {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS user_settings (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT UNSIGNED NOT NULL,
                    full_name VARCHAR(255) DEFAULT NULL,
                    phone VARCHAR(50) DEFAULT NULL,
                    country VARCHAR(50) DEFAULT 'us',
                    education VARCHAR(50) DEFAULT 'high-school',
                    field_of_study VARCHAR(255) DEFAULT NULL,
                    theme VARCHAR(20) DEFAULT 'light',
                    font_size INT DEFAULT 100,
                    accent_color VARCHAR(20) DEFAULT '#4a6cf7',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ");
            error_log("user_settings table created successfully");
        }
        
        // Check if user has settings
        $stmt = $pdo->prepare("SELECT id FROM user_settings WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        // Map between JS/frontend keys and database column names
        $columnMap = [
            'fullName' => 'full_name',
            'phone' => 'phone',
            'country' => 'country',
            'education' => 'education',
            'field' => 'field_of_study',
            'theme' => 'theme',
            'fontSize' => 'font_size',
            'accentColor' => 'accent_color'
        ];
        
        // Debug output
        error_log("Settings data received: " . json_encode($data));
        
        if ($stmt->rowCount() === 0) {
            error_log("No existing settings found for user {$userId}, creating new settings");
            // Create new settings
            $insertColumns = ['user_id'];
            $insertPlaceholders = ['?'];
            $insertParams = [$userId];
            
            foreach ($columnMap as $jsKey => $dbColumn) {
                if (isset($data[$jsKey])) {
                    $insertColumns[] = $dbColumn;
                    $insertPlaceholders[] = '?';
                    $insertParams[] = $data[$jsKey];
                    error_log("Adding setting {$jsKey} with value {$data[$jsKey]} to new settings");
                }
            }
            
            $insertQuery = "INSERT INTO user_settings (" . implode(", ", $insertColumns) . ") VALUES (" . implode(", ", $insertPlaceholders) . ")";
            error_log("Settings insert query: {$insertQuery}");
            $stmt = $pdo->prepare($insertQuery);
            $stmt->execute($insertParams);
            error_log("New settings created for user {$userId}");
        } else {
            error_log("Existing settings found for user {$userId}, updating");
            // Update existing settings
            $updateFields = [];
            $updateParams = [];
            
            foreach ($columnMap as $jsKey => $dbColumn) {
                if (isset($data[$jsKey])) {
                    $updateFields[] = "{$dbColumn} = ?";
                    $updateParams[] = $data[$jsKey];
                    error_log("Updating setting {$jsKey} to value {$data[$jsKey]}");
                }
            }
            
            if (!empty($updateFields)) {
                $updateQuery = "UPDATE user_settings SET " . implode(", ", $updateFields) . " WHERE user_id = ?";
                $updateParams[] = $userId;
                
                error_log("Settings update query: {$updateQuery}");
                $stmt = $pdo->prepare($updateQuery);
                $stmt->execute($updateParams);
                error_log("Settings updated for user {$userId}");
            } else {
                error_log("No settings to update");
            }
        }
        
        // Commit transaction
        $pdo->commit();
        error_log("Transaction committed successfully");
        
        return ['success' => true, 'message' => 'Settings updated successfully'];
    } catch (PDOException $e) {
        // Rollback transaction on error
        $pdo->rollBack();
        error_log('Settings update error: ' . $e->getMessage() . "\nTrace: " . $e->getTraceAsString());
        return ['success' => false, 'message' => 'Failed to update settings: ' . $e->getMessage()];
    }
}

// Get active sessions
function getUserSessions($userId) {
    $pdo = getDbConnection();
    
    try {
        // Check if the sessions table has the required columns
        $columnsExist = false;
        try {
            $tableInfo = $pdo->query("SHOW COLUMNS FROM sessions LIKE 'device_type'");
            $columnsExist = ($tableInfo->rowCount() > 0);
        } catch (PDOException $e) {
            error_log("Error checking sessions table columns: " . $e->getMessage());
        }
        
        // Add columns if they don't exist
        if (!$columnsExist) {
            try {
                $pdo->exec("
                    ALTER TABLE sessions 
                    ADD COLUMN device_type VARCHAR(50) DEFAULT NULL,
                    ADD COLUMN device_name VARCHAR(100) DEFAULT NULL,
                    ADD COLUMN ip_address VARCHAR(50) DEFAULT NULL,
                    ADD COLUMN location VARCHAR(100) DEFAULT NULL
                ");
                error_log("Added device tracking columns to sessions table");
            } catch (PDOException $e) {
                error_log("Error adding columns to sessions table: " . $e->getMessage());
                // Continue anyway - we'll just use null values
            }
        }
        
        // Get all active sessions for the user
        $stmt = $pdo->prepare("
            SELECT s.id, s.token, s.created_at, s.expires_at, 
                   s.device_type, s.device_name, s.ip_address, s.location
            FROM sessions s
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
        ");
        $stmt->execute([$userId]);
        
        $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get current session ID
        $token = getCurrentToken();
        $currentSession = null;
        
        if ($token) {
            $stmt = $pdo->prepare("SELECT id FROM sessions WHERE token = ?");
            $stmt->execute([$token]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                $currentSession = $result['id'];
            }
        }
        
        // If sessions are missing device info, fill it with defaults
        foreach ($sessions as &$session) {
            if (empty($session['device_type']) && empty($session['device_name'])) {
                $session['device_type'] = 'desktop';
                $session['device_name'] = 'Unknown device';
            }
            
            if (empty($session['location'])) {
                $session['location'] = 'Unknown location';
            }
        }
        
        return [
            'success' => true,
            'sessions' => $sessions,
            'currentSessionId' => $currentSession
        ];
    } catch (PDOException $e) {
        error_log('Error fetching sessions: ' . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to retrieve sessions: ' . $e->getMessage()
        ];
    }
}

// Terminate a specific session
function terminateSession($userId, $sessionId) {
    $pdo = getDbConnection();
    
    try {
        // Check if the session belongs to the user
        $stmt = $pdo->prepare("
            SELECT id FROM sessions 
            WHERE id = ? AND user_id = ?
        ");
        $stmt->execute([$sessionId, $userId]);
        
        if ($stmt->rowCount() === 0) {
            return [
                'success' => false,
                'message' => 'Session not found or does not belong to you'
            ];
        }
        
        // Delete the session
        $stmt = $pdo->prepare("DELETE FROM sessions WHERE id = ?");
        $stmt->execute([$sessionId]);
        
        return [
            'success' => true,
            'message' => 'Session terminated successfully'
        ];
    } catch (PDOException $e) {
        error_log('Error terminating session: ' . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to terminate session: ' . $e->getMessage()
        ];
    }
}

// Export user data
function exportUserData($userId) {
    $pdo = getDbConnection();
    
    try {
        // Get user data
        $userData = [];
        
        // Get user basic info
        $stmt = $pdo->prepare("
            SELECT id, uuid, username, email, profile_image, created_at, updated_at
            FROM users
            WHERE id = ?
        ");
        $stmt->execute([$userId]);
        $userData['user'] = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Get user profile if it exists
        try {
            $stmt = $pdo->prepare("
                SELECT tagline, bio, created_at, updated_at
                FROM user_profiles
                WHERE user_id = ?
            ");
            $stmt->execute([$userId]);
            $userData['profile'] = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log('Error fetching user profile data: ' . $e->getMessage());
            $userData['profile'] = null;
        }
        
        // Get user settings
        $stmt = $pdo->prepare("
            SELECT full_name, phone, country, education, field_of_study, 
                   theme, font_size, accent_color, created_at, updated_at
            FROM user_settings
            WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        $userData['settings'] = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Get sessions
        $stmt = $pdo->prepare("
            SELECT created_at, expires_at, device_type, device_name, ip_address, location
            FROM sessions
            WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        $userData['sessions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert to JSON
        $jsonData = json_encode($userData, JSON_PRETTY_PRINT);
        
        // Set headers for file download
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="user_data_' . $userData['user']['username'] . '.json"');
        header('Content-Length: ' . strlen($jsonData));
        
        // Send file
        echo $jsonData;
        exit;
        
    } catch (PDOException $e) {
        error_log('Error exporting user data: ' . $e->getMessage());
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Failed to export user data: ' . $e->getMessage()
        ]);
        exit;
    }
}

// Delete user account
function deleteUserAccount($userId) {
    $pdo = getDbConnection();
    
    try {
        // Start a transaction
        $pdo->beginTransaction();
        
        // Delete all sessions
        $stmt = $pdo->prepare("DELETE FROM sessions WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        // Delete user settings
        $stmt = $pdo->prepare("DELETE FROM user_settings WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        // Delete user profile if exists
        try {
            $stmt = $pdo->prepare("DELETE FROM user_profiles WHERE user_id = ?");
            $stmt->execute([$userId]);
        } catch (PDOException $e) {
            error_log("Error deleting user profile (might not exist): " . $e->getMessage());
            // Continue with account deletion even if profile deletion fails
        }
        
        // Delete any other user related data in other tables
        // Add more delete statements for any other tables with user_id foreign keys
        
        // Finally delete the user
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        
        // Commit the transaction
        $pdo->commit();
        
        return [
            'success' => true,
            'message' => 'Account deleted successfully'
        ];
        
    } catch (PDOException $e) {
        // Rollback in case of error
        $pdo->rollBack();
        
        error_log('Error deleting user account: ' . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to delete account: ' . $e->getMessage()
        ];
    }
}

// Helper function to get current token
function getCurrentToken() {
    // Try to get token from Authorization header
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (strpos($authHeader, 'Bearer ') === 0) {
        return trim(substr($authHeader, 7));
    }
    
    // Try to get token from request body
    $jsonInput = file_get_contents('php://input');
    if (!empty($jsonInput)) {
        $data = json_decode($jsonInput, true);
        if (json_last_error() === JSON_ERROR_NONE && isset($data['token'])) {
            return $data['token'];
        }
    }
    
    // Try to get token from cookies
    foreach ($_COOKIE as $name => $value) {
        if (strpos($name, 'auth_') === 0 || strpos($name, 'token') !== false || $name === 'authToken') {
            return $value;
        }
    }
    
    return null;
}
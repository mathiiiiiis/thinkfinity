<?php
// Backend profile API handling
ob_start();

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

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

// API Router
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (ob_get_length()) {
        error_log("WARNING: Output buffer contains data before headers. Clearing buffer.");
        ob_clean();
    }
    
    // Set content type header for JSON
    header('Content-Type: application/json');
    
    // Get request body
    $json = file_get_contents('php://input');
    error_log("Received JSON: " . substr($json, 0, 200) . (strlen($json) > 200 ? '...' : ''));
    
    $data = json_decode($json, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON parse error: " . json_last_error_msg());
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
        exit;
    }
    
    $action = $_GET['action'] ?? '';
    error_log("Processing profile action: $action");
    
    // Public profile doesn't require token
    if ($action !== 'public_profile') {
        // Verify token for all requests except public_profile
        if (!isset($data['token'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Authentication required']);
            exit;
        }
        
        $tokenResult = verifyToken($data['token']);
        
        if (!$tokenResult['success']) {
            http_response_code(401);
            echo json_encode($tokenResult);
            exit;
        }
        
        $user = $tokenResult['user'];
    }
    
    switch ($action) {
        case 'get_profile':
            $profileData = getUserProfile($user['id']);
            echo json_encode([
                'success' => true,
                'profile' => $profileData
            ]);
            break;
            
        case 'update_profile':
            // Extract profile update data
            $updateData = array_filter([
                'username' => $data['username'] ?? null,
                'tagline' => $data['tagline'] ?? null,
                'bio' => $data['bio'] ?? null,
                'profileImage' => $data['profileImage'] ?? null
            ]);
            
            $result = updateUserProfile($user['id'], $updateData);
            echo json_encode($result);
            break;
            
        case 'public_profile':
            // Get public profile by UUID
            if (!isset($data['uuid'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'User UUID is required']);
                exit;
            }
            
            $profileData = getPublicProfile($data['uuid']);
            
            if ($profileData) {
                echo json_encode([
                    'success' => true,
                    'profile' => $profileData
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'User not found']);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Unknown action']);
            break;
    }
} else {
    // Clear any existing output
    if (ob_get_length()) {
        ob_clean();
    }
    
    // Handle non-POST requests with a proper JSON response
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Verify JWT token
function verifyToken($token) {
    $pdo = getDbConnection();
    
    try {
        $stmt = $pdo->prepare("
            SELECT s.id, s.user_id, s.expires_at, u.uuid, u.username, u.email, u.profile_image 
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > NOW()
        ");
        $stmt->execute([$token]);
        
        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'Invalid or expired token'];
        }
        
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
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
        return ['success' => false, 'message' => 'Token verification failed: ' . $e->getMessage()];
    }
}

// Get user profile 
function getUserProfile($userId) {
    $pdo = getDbConnection();
    
    try {
        $tableExists = false;
        $tables = $pdo->query("SHOW TABLES LIKE 'user_profiles'")->fetchAll();
        if (count($tables) > 0) {
            $tableExists = true;
        }

        if (!$tableExists) {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT UNSIGNED NOT NULL,
                    tagline VARCHAR(255) DEFAULT NULL,
                    bio TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ");
            error_log("Created user_profiles table");
        }
        
        // Check if user has a profile
        $stmt = $pdo->prepare("SELECT * FROM user_profiles WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        if ($stmt->rowCount() === 0) {
            // Create a default profile
            $stmt = $pdo->prepare("INSERT INTO user_profiles (user_id, tagline, bio) VALUES (?, ?, ?)");
            $stmt->execute([$userId, 'Learning enthusiast', 'No bio yet.']);
            
            return [
                'tagline' => 'Learning enthusiast',
                'bio' => 'No bio yet.'
            ];
        }
        
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'tagline' => $profile['tagline'],
            'bio' => $profile['bio']
        ];
    } catch (PDOException $e) {
        error_log('Profile fetch error: ' . $e->getMessage());
        return [
            'tagline' => 'Learning enthusiast',
            'bio' => 'No bio available.'
        ];
    }
}

// Get public profile by UUID
function getPublicProfile($uuid) {
    $pdo = getDbConnection();
    
    try {
        // Get user and profile information
        $stmt = $pdo->prepare("
            SELECT u.username, u.profile_image, u.uuid, up.tagline, up.bio
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.uuid = ?
        ");
        $stmt->execute([$uuid]);
        
        if ($stmt->rowCount() === 0) {
            return null;
        }
        
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'username' => $data['username'],
            'uuid' => $data['uuid'],
            'profileImage' => $data['profile_image'],
            'tagline' => $data['tagline'] ?? 'Learning enthusiast',
            'bio' => $data['bio'] ?? 'This user has not added a bio yet.'
        ];
    } catch (PDOException $e) {
        error_log('Public profile fetch error: ' . $e->getMessage());
        return null;
    }
}

// Update user profile
function updateUserProfile($userId, $data) {
    $pdo = getDbConnection();
    
    try {
        // Start transaction
        $pdo->beginTransaction();
        
        // Update username in users table if provided
        if (isset($data['username'])) {
            // Check if username already exists
            $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
            $stmt->execute([$data['username'], $userId]);
            
            if ($stmt->rowCount() > 0) {
                $pdo->rollBack();
                return ['success' => false, 'message' => 'Username already taken'];
            }
            
            $stmt = $pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
            $stmt->execute([$data['username'], $userId]);
        }
        
        // Update profile image in users table if provided
        if (isset($data['profileImage'])) {
            $stmt = $pdo->prepare("UPDATE users SET profile_image = ? WHERE id = ?");
            $stmt->execute([$data['profileImage'], $userId]);
        }
        
        // Check if user_profiles table exists and create if needed
        $tableExists = false;
        $tables = $pdo->query("SHOW TABLES LIKE 'user_profiles'")->fetchAll();
        if (count($tables) > 0) {
            $tableExists = true;
        }
        
        if (!$tableExists) {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT UNSIGNED NOT NULL,
                    tagline VARCHAR(255) DEFAULT NULL,
                    bio TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ");
        }
        
        // Check if user has a profile
        $stmt = $pdo->prepare("SELECT id FROM user_profiles WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        if ($stmt->rowCount() === 0) {
            // Create new profile
            $stmt = $pdo->prepare("INSERT INTO user_profiles (user_id, tagline, bio) VALUES (?, ?, ?)");
            $stmt->execute([
                $userId,
                $data['tagline'] ?? 'Learning enthusiast',
                $data['bio'] ?? ''
            ]);
        } else {
            // Update existing profile
            $updateFields = [];
            $updateParams = [];
            
            if (isset($data['tagline'])) {
                $updateFields[] = "tagline = ?";
                $updateParams[] = $data['tagline'];
            }
            
            if (isset($data['bio'])) {
                $updateFields[] = "bio = ?";
                $updateParams[] = $data['bio'];
            }
            
            if (!empty($updateFields)) {
                $updateQuery = "UPDATE user_profiles SET " . implode(", ", $updateFields) . " WHERE user_id = ?";
                $updateParams[] = $userId;
                
                $stmt = $pdo->prepare($updateQuery);
                $stmt->execute($updateParams);
            }
        }
        
        // Commit transaction
        $pdo->commit();
        
        return ['success' => true, 'message' => 'Profile updated successfully'];
    } catch (PDOException $e) {
        // Rollback transaction on error
        $pdo->rollBack();
        error_log('Profile update error: ' . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to update profile: ' . $e->getMessage()];
    }
}
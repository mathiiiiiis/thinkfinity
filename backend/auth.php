<?php
// Backend authentication handling
ob_start();

require_once __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Database connection
function getDbConnection() {
    $host = $_ENV['MYSQL_HOST'] ?? 'mysql';
    $db = $_ENV['MYSQL_DATABASE'] ?? 'thinfinity';
    $user = $_ENV['MYSQL_USER'] ?? 'thinfinity_user';
    $pass = $_ENV['MYSQL_PASSWORD'] ?? 'thinfinity_password';
    
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

// Generate a unique UUID
function generateUuid($length = 13) {
    $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $uuid = '';
    for ($i = 0; $i < $length; $i++) {
        $uuid .= $chars[rand(0, strlen($chars) - 1)];
    }
    return $uuid;
}

// Handle registration
function registerUser($username, $email, $password, $profileImage = null, $skipImageUpload = false) {
    error_log("RegisterUser called - Username: $username, Email: $email, Has Profile Image: " . (!empty($profileImage) ? 'Yes' : 'No'));
    
    $pdo = getDbConnection();
    
    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->rowCount() > 0) {
        error_log("Registration failed: Email already exists - $email");
        return ['success' => false, 'message' => 'Email already exists'];
    }
    
    // Check if username already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->rowCount() > 0) {
        error_log("Registration failed: Username already exists - $username");
        return ['success' => false, 'message' => 'Username already exists'];
    }
    
    // Generate UUID
    $uuid = generateUuid();
    error_log("Generated UUID: $uuid");
    
    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Store profile image
    $profileImagePath = null;
    if ($profileImage && !empty($profileImage) && !$skipImageUpload) {
        $uploadHandlerPath = __DIR__ . '/backend/handlers/upload_handler.php';
        
        error_log("Looking for upload handler at: $uploadHandlerPath");
        
        if (file_exists($uploadHandlerPath)) {
            require_once $uploadHandlerPath;
            error_log("Found upload handler at: $uploadHandlerPath");
        } else {
            $altPath = __DIR__ . '/handlers/upload_handler.php';
            error_log("Upload handler not found, trying alternative path: $altPath");
            
            if (file_exists($altPath)) {
                require_once $altPath;
                error_log("Found upload handler at alternative path: $altPath");
            } else {
                error_log("Upload handler not found at either path");
                return ['success' => false, 'message' => 'Error: Upload handler not found'];
            }
        }
        
        try {
            $uploadHandler = new MinioUploadHandler();
            $profileImagePath = $uploadHandler->uploadBase64Image($profileImage, $uuid);
        } catch (Exception $e) {
            error_log("Profile image upload error: " . $e->getMessage());
            // Continue without image if error
        }
    }
    
    // Insert user into database
    try {
        $stmt = $pdo->prepare("INSERT INTO users (uuid, username, email, password, profile_image) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$uuid, $username, $email, $hashedPassword, $profileImagePath]);
        
        $token = createJwtToken($pdo->lastInsertId(), $uuid, $username);
        
        return [
            'success' => true,
            'message' => 'User registered successfully',
            'user' => [
                'uuid' => $uuid,
                'username' => $username,
                'email' => $email,
                'profileImage' => $profileImagePath
            ],
            'token' => $token
        ];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()];
    }
}

// Handle login
function loginUser($email, $password) {
    $pdo = getDbConnection();
    
    try {
        $stmt = $pdo->prepare("SELECT id, uuid, username, email, password, profile_image FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'Invalid email or password'];
        }
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Verify password
        if (!password_verify($password, $user['password'])) {
            return ['success' => false, 'message' => 'Invalid email or password'];
        }
        
        // Create JWT token
        $token = createJwtToken($user['id'], $user['uuid'], $user['username']);
        
        return [
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'uuid' => $user['uuid'],
                'username' => $user['username'],
                'email' => $user['email'],
                'profileImage' => $user['profile_image']
            ],
            'token' => $token
        ];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Login failed: ' . $e->getMessage()];
    }
}

function createJwtToken($userId, $uuid, $username) {
    $issuedAt = time();
    $expirationTime = $issuedAt + 3600 * 24;
    
    $payload = [
        'iat' => $issuedAt,
        'exp' => $expirationTime,
        'user_id' => $userId,
        'uuid' => $uuid,
        'username' => $username
    ];
    
    // Store session in database
    $pdo = getDbConnection();
    $stmt = $pdo->prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, FROM_UNIXTIME(?))");
    $token = bin2hex(random_bytes(32));
    $stmt->execute([$userId, $token, $expirationTime]);
    
    return $token;
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

// Handle logout
function logoutUser($token) {
    $pdo = getDbConnection();
    
    try {
        $stmt = $pdo->prepare("DELETE FROM sessions WHERE token = ?");
        $stmt->execute([$token]);
        
        return ['success' => true, 'message' => 'Logout successful'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Logout failed: ' . $e->getMessage()];
    }
}

error_log("Auth.php received request: " . $_SERVER['REQUEST_METHOD'] . " " . ($_GET['action'] ?? 'no action'));

// API Router
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (ob_get_length()) {
        error_log("WARNING: Output buffer contains data before headers. Clearing buffer.");
        ob_clean();
    }
    
    // Set the content type header for JSON
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
    error_log("Processing action: $action");
    
    switch ($action) {
        case 'register':
            if (!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Missing required fields']);
                exit;
            }
            
            $result = registerUser(
                $data['username'],
                $data['email'],
                $data['password'],
                $data['profileImage'] ?? null,
                $data['skipImageUpload'] ?? false
            );
            
            if (!$result['success']) {
                http_response_code(400);
            }
            
            $jsonResponse = json_encode($result);
            echo $jsonResponse;
            error_log("Sent registration response: " . $jsonResponse);
            exit;
            break;
            
        case 'login':
            if (!isset($data['email']) || !isset($data['password'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Missing required fields']);
                exit;
            }
            
            $result = loginUser($data['email'], $data['password']);
            
            if (!$result['success']) {
                http_response_code(401);
            }
            
            echo json_encode($result);
            break;
            
        case 'verify':
            if (!isset($data['token'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Missing token']);
                exit;
            }
            
            $result = verifyToken($data['token']);
            
            if (!$result['success']) {
                http_response_code(401);
            }
            
            $jsonResponse = json_encode($result);
            echo $jsonResponse;
            error_log("Sent verification response: " . $jsonResponse);
            exit;
            break;
            
        case 'logout':
            if (!isset($data['token'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Missing token']);
                exit;
            }
            
            $result = logoutUser($data['token']);
            $jsonResponse = json_encode($result);
            echo $jsonResponse;
            error_log("Sent logout response: " . $jsonResponse);
            exit;
            break;
            
        default:
            http_response_code(404);
            http_response_code(404);
            $jsonResponse = json_encode(['success' => false, 'message' => 'Unknown action']);
            echo $jsonResponse;
            error_log("Sent unknown action response: " . $jsonResponse);
            exit;
            break;
    }
} else {
    if (ob_get_length()) {
        ob_clean();
    }
    
    header('Content-Type: application/json');
    http_response_code(405);
    $jsonResponse = json_encode(['success' => false, 'message' => 'Method not allowed or action not specified']);
    echo $jsonResponse;
    error_log("Sent method not allowed response: " . $jsonResponse);
    exit;
}
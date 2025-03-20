<?php
// Backend search API handling
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
    error_log("Processing search action: $action");
    
    switch ($action) {
        case 'search_users':
            // Extract search parameters
            $query = $data['query'] ?? '';
            $filter = $data['filter'] ?? 'all';
            $page = intval($data['page'] ?? 1);
            $limit = intval($data['limit'] ?? 10);
            $offset = ($page - 1) * $limit;
            
            // Optional authentication
            $token = $data['token'] ?? '';
            $currentUser = null;
            
            if ($token) {
                $tokenResult = verifyToken($token);
                if ($tokenResult['success']) {
                    $currentUser = $tokenResult['user'];
                }
            }
            
            $searchResults = searchUsers($query, $filter, $limit, $offset);
            echo json_encode($searchResults);
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

// Search users function
function searchUsers($query, $filter, $limit, $offset) {
    $pdo = getDbConnection();
    
    try {
        // Base query
        $baseQuery = "
            SELECT u.id, u.uuid, u.username, u.profile_image, up.tagline
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
        ";
        
        // Count query for total results
        $countQuery = "SELECT COUNT(*) FROM users u";
        
        $whereClause = "";
        $params = [];
        $countParams = [];
        
        if (!empty($query)) {
            switch ($filter) {
                case 'username':
                    $whereClause = "WHERE u.username LIKE ?";
                    $params[] = "%$query%";
                    $countParams[] = "%$query%";
                    $countQuery .= " $whereClause";
                    break;
                    
                case 'all':
                default:
                    // Search across multiple fields
                    $whereClause = "
                        WHERE u.username LIKE ? 
                        OR (up.tagline IS NOT NULL AND up.tagline LIKE ?) 
                        OR (up.bio IS NOT NULL AND up.bio LIKE ?)
                    ";
                    $params = ["%$query%", "%$query%", "%$query%"];
                    $countParams = ["%$query%", "%$query%", "%$query%"];
                    
                    // Adjust count query to include the same joins
                    $countQuery = "
                        SELECT COUNT(DISTINCT u.id) FROM users u
                        LEFT JOIN user_profiles up ON u.id = up.user_id
                        $whereClause
                    ";
                    break;
            }
        }
        
        // Complete the main query with LIMIT and OFFSET directly as integers instead of placeholders
        $finalQuery = $baseQuery . " $whereClause ORDER BY u.username LIMIT $limit OFFSET $offset";
        
        // Execute count query
        $countStmt = $pdo->prepare($countQuery);
        $countStmt->execute($countParams);
        $totalResults = $countStmt->fetchColumn();
        
        // Execute main query
        $stmt = $pdo->prepare($finalQuery);
        $stmt->execute($params); // Don't include limit and offset in params
        
        $users = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $users[] = [
                'uuid' => $row['uuid'],
                'username' => $row['username'],
                'profileImage' => $row['profile_image'],
                'tagline' => $row['tagline'] ?? 'Learning enthusiast'
            ];
        }
        
        return [
            'success' => true,
            'users' => $users,
            'totalResults' => (int)$totalResults,
            'page' => (int)($offset / $limit + 1),
            'totalPages' => (int)max(1, ceil($totalResults / $limit))
        ];
    } catch (PDOException $e) {
        error_log('User search error: ' . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to search users: ' . $e->getMessage()];
    }
}
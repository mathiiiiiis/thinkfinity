<?php
// Backend classes API router
ob_start();

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

// Load component files
require_once __DIR__ . '/../api/classes/init.php';
require_once __DIR__ . '/../api/classes/auth.php';
require_once __DIR__ . '/../api/classes/helpers.php';
require_once __DIR__ . '/../api/classes/class_management.php';
require_once __DIR__ . '/../api/classes/assignments.php';
require_once __DIR__ . '/../api/classes/messages.php';
require_once __DIR__ . '/../api/classes/dashboard.php';

// API Router
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (ob_get_length()) {
        error_log("WARNING: Output buffer contains data before headers. Clearing buffer.");
        ob_clean();
    }
    
    // Set the content type header for JSON
    header('Content-Type: application/json');
    
    // Get request parameters
    $action = $_GET['action'] ?? '';
    error_log("Processing classes action: $action");
    
    // Get authentication token
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if ($authHeader && strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
    } else {
        $token = $_GET['token'] ?? null;
    }
    
    // Most actions require authentication
    if (!in_array($action, ['explore_classes'])) {
        if (!$token) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Authentication required']);
            exit;
        }
        
        $tokenResult = verifyToken($token);
        
        if (!$tokenResult['success']) {
            http_response_code(401);
            echo json_encode($tokenResult);
            exit;
        }
        
        $user = $tokenResult['user'];
    }
    
    // Get request body for POST requests
    $data = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $json = file_get_contents('php://input');
        error_log("Received JSON: " . substr($json, 0, 200) . (strlen($json) > 200 ? '...' : ''));
        
        $data = json_decode($json, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("JSON parse error: " . json_last_error_msg());
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
            exit;
        }
    }
    
    // Handle the action
    switch ($action) {
        case 'create_class':
            $result = createClass($user['id'], $data);
            echo json_encode($result);
            break;
            
        case 'join_class':
            if (empty($data['classCode'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Class code is required']);
                exit;
            }
            
            $result = joinClass($user['id'], $data['classCode']);
            echo json_encode($result);
            break;
            
        case 'get_user_classes':
            $result = getUserClasses($user['id']);
            echo json_encode($result);
            break;
            
        case 'get_teaching_classes':
            $result = getTeachingClasses($user['id']);
            echo json_encode($result);
            break;
            
        case 'get_explore_classes':
            // This action can be used without authentication
            $filters = [];
            
            if (isset($_GET['category'])) $filters['category'] = $_GET['category'];
            if (isset($_GET['level'])) $filters['level'] = $_GET['level'];
            if (isset($_GET['search'])) $filters['search'] = $_GET['search'];
            
            $result = getExploreClasses($filters);
            echo json_encode($result);
            break;
            
        case 'get_class_details':
            if (empty($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Class ID is required']);
                exit;
            }
            
            $result = getClassDetails($_GET['id'], $user['id']);
            echo json_encode($result);
            break;
            
        case 'post_message':
            if (empty($data['classId']) || empty($data['message'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Class ID and message are required']);
                exit;
            }
            
            $result = postClassMessage($data['classId'], $user['id'], $data);
            echo json_encode($result);
            break;
            
        case 'create_assignment':
            if (empty($data['classId']) || empty($data['title']) || empty($data['dueDate'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Class ID, title, and due date are required']);
                exit;
            }
            
            $result = createAssignment($data['classId'], $user['id'], $data);
            echo json_encode($result);
            break;
            
        case 'get_assignments':
            if (empty($_GET['classId'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Class ID is required']);
                exit;
            }
            
            $result = getClassAssignments($_GET['classId'], $user['id']);
            echo json_encode($result);
            break;
            
        case 'submit_assignment':
            if (empty($data['assignmentId']) || empty($data['content'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Assignment ID and content are required']);
                exit;
            }
            
            $result = submitAssignment($data['assignmentId'], $user['id'], $data);
            echo json_encode($result);
            break;
            
        case 'grade_submission':
            if (empty($data['submissionId']) || !isset($data['grade'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Submission ID and grade are required']);
                exit;
            }
            
            $result = gradeSubmission($data['submissionId'], $user['id'], $data);
            echo json_encode($result);
            break;
            
        case 'get_upcoming_tasks':
            $result = getUpcomingTasks($user['id']);
            echo json_encode($result);
            break;
            
        case 'get_recent_activity':
            $result = getRecentActivity($user['id']);
            echo json_encode($result);
            break;

        case 'get_chat_messages':
            if (empty($_GET['classId']) || empty($_GET['channel'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Class ID and channel are required']);
                exit;
            }
            
            $recipientId = $_GET['recipientId'] ?? null;
            
            $result = getChatMessages($_GET['classId'], $user['id'], $_GET['channel'], $recipientId);
            echo json_encode($result);
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
    
    // Handle non-allowed methods with a proper JSON response
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}
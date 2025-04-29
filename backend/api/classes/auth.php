<?php
// Authentication-related functions

// Check if the file is being directly accessed
if (!defined('ABSPATH') && basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    exit('Direct script access denied.');
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
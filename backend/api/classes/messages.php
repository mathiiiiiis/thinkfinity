<?php
// Messages-related functions

// Check if the file is being directly accessed
if (!defined('ABSPATH') && basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    exit('Direct script access denied.');
}

// Post message to class stream
function postClassMessage($classId, $userId, $messageData) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        // Check if user is a member of the class
        $stmt = $pdo->prepare("
            SELECT role FROM class_members WHERE class_id = ? AND user_id = ?
        ");
        $stmt->execute([$classId, $userId]);
        
        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'You are not a member of this class'];
        }
        
        $userRole = $stmt->fetch(PDO::FETCH_COLUMN);
        
        // For announcements, check if user is teacher or assistant
        if (isset($messageData['messageType']) && $messageData['messageType'] === 'announcement' && 
            $userRole !== 'teacher' && $userRole !== 'assistant') {
            return ['success' => false, 'message' => 'Only teachers and assistants can post announcements'];
        }
        
        // Insert the message
        $stmt = $pdo->prepare("
            INSERT INTO class_messages (
                class_id, user_id, message, message_type, recipient_id, is_private
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $classId,
            $userId,
            $messageData['message'],
            $messageData['messageType'] ?? 'chat',
            $messageData['recipientId'] ?? null,
            $messageData['isPrivate'] ?? false
        ]);
        
        $messageId = $pdo->lastInsertId();
        
        // Get the posted message with user details
        $stmt = $pdo->prepare("
            SELECT m.*, u.username, u.profile_image
            FROM class_messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.id = ?
        ");
        $stmt->execute([$messageId]);
        
        $messageData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'message' => 'Message posted successfully',
            'messageData' => [
                'id' => $messageData['id'],
                'message' => $messageData['message'],
                'messageType' => $messageData['message_type'],
                'isPrivate' => $messageData['is_private'] == 1,
                'createdAt' => $messageData['created_at'],
                'user' => [
                    'id' => $messageData['user_id'],
                    'username' => $messageData['username'],
                    'profileImage' => $messageData['profile_image']
                ]
            ]
        ];
    } catch (Exception $e) {
        error_log("Error posting class message: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to post message: ' . $e->getMessage()];
    }
}

// Get chat messages for a class
function getChatMessages($classId, $userId, $channel, $recipientId = null) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        // Check if user is a member of the class
        $stmt = $pdo->prepare("
            SELECT role FROM class_members WHERE class_id = ? AND user_id = ?
        ");
        $stmt->execute([$classId, $userId]);
        
        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'You are not a member of this class'];
        }
        
        // Build query based on channel type
        if ($channel === 'direct' && $recipientId) {
            // Direct messages between two users
            $stmt = $pdo->prepare("
                SELECT m.*, u.username, u.profile_image
                FROM class_messages m
                JOIN users u ON m.user_id = u.id
                WHERE m.class_id = ? 
                AND ((m.user_id = ? AND m.recipient_id = ?) OR (m.user_id = ? AND m.recipient_id = ?))
                ORDER BY m.created_at ASC
                LIMIT 100
            ");
            $stmt->execute([$classId, $userId, $recipientId, $recipientId, $userId]);
        } else {
            // Channel messages (everyone or other channels)
            $stmt = $pdo->prepare("
                SELECT m.*, u.username, u.profile_image
                FROM class_messages m
                JOIN users u ON m.user_id = u.id
                WHERE m.class_id = ? 
                AND m.recipient_id IS NULL
                AND m.is_private = 0
                ORDER BY m.created_at ASC
                LIMIT 100
            ");
            $stmt->execute([$classId]);
        }
        
        $messages = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $messages[] = [
                'id' => $row['id'],
                'message' => $row['message'],
                'messageType' => $row['message_type'],
                'isPrivate' => $row['is_private'] == 1,
                'createdAt' => $row['created_at'],
                'user' => [
                    'id' => $row['user_id'],
                    'username' => $row['username'],
                    'profileImage' => $row['profile_image']
                ]
            ];
        }
        
        return [
            'success' => true,
            'messages' => $messages
        ];
    } catch (Exception $e) {
        error_log("Error fetching chat messages: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to fetch messages: ' . $e->getMessage()];
    }
}
<?php
// Dashboard-related functions

// Check if the file is being directly accessed
if (!defined('ABSPATH') && basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    exit('Direct script access denied.');
}

// Get upcoming tasks for dashboard
function getUpcomingTasks($userId) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        $stmt = $pdo->prepare("
            SELECT a.id, a.title, a.due_date, a.points, c.name as class_name, c.id as class_id,
                   s.id as submission_id, s.status as submission_status,
                   CASE 
                     WHEN DATEDIFF(a.due_date, NOW()) <= 1 THEN 'high'
                     WHEN DATEDIFF(a.due_date, NOW()) <= 3 THEN 'medium'
                     ELSE 'low'
                   END as priority,
                   s.status = 'submitted' OR s.status = 'graded' as completed
            FROM class_assignments a
            JOIN classes c ON a.class_id = c.id
            JOIN class_members cm ON c.id = cm.class_id
            LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.user_id = ?
            WHERE cm.user_id = ? AND a.status = 'published' AND a.due_date > NOW()
            ORDER BY a.due_date ASC
            LIMIT 5
        ");
        $stmt->execute([$userId, $userId]);
        
        $tasks = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $tasks[] = [
                'id' => $row['id'],
                'name' => $row['title'],
                'className' => $row['class_name'],
                'classId' => $row['class_id'],
                'dueDate' => date('F j, g:i A', strtotime($row['due_date'])),
                'priority' => $row['priority'],
                'completed' => $row['completed'] == 1
            ];
        }
        
        return [
            'success' => true,
            'tasks' => $tasks
        ];
    } catch (Exception $e) {
        error_log("Error fetching upcoming tasks: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to fetch tasks: ' . $e->getMessage()];
    }
}

// Get recent activity for dashboard
function getRecentActivity($userId) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        // Query for different types of activities
        $activities = [];
        
        // 1. Recent announcements
        $stmt = $pdo->prepare("
            SELECT m.id, m.message, m.created_at, c.id as class_id, c.name as class_name,
                   'announcement' as type
            FROM class_messages m
            JOIN classes c ON m.class_id = c.id
            JOIN class_members cm ON c.id = cm.class_id AND cm.user_id = ?
            WHERE m.message_type = 'announcement'
            ORDER BY m.created_at DESC
            LIMIT 3
        ");
        $stmt->execute([$userId]);
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $activities[] = [
                'type' => 'announcement',
                'message' => $row['message'],
                'className' => $row['class_name'],
                'classId' => $row['class_id'],
                'time' => getTimeAgo($row['created_at'])
            ];
        }
        
        // 2. New assignments
        $stmt = $pdo->prepare("
            SELECT a.id, a.title, a.created_at, c.id as class_id, c.name as class_name,
                   'task_added' as type
            FROM class_assignments a
            JOIN classes c ON a.class_id = c.id
            JOIN class_members cm ON c.id = cm.class_id AND cm.user_id = ?
            WHERE a.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY a.created_at DESC
            LIMIT 3
        ");
        $stmt->execute([$userId]);
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $activities[] = [
                'type' => 'task_added',
                'message' => 'New assignment added: "' . $row['title'] . '"',
                'className' => $row['class_name'],
                'classId' => $row['class_id'],
                'time' => getTimeAgo($row['created_at'])
            ];
        }
        
        // 3. Graded submissions
        $stmt = $pdo->prepare("
            SELECT s.id, a.title, s.submission_date, c.id as class_id, c.name as class_name,
                   'task_completed' as type
            FROM assignment_submissions s
            JOIN class_assignments a ON s.assignment_id = a.id
            JOIN classes c ON a.class_id = c.id
            WHERE s.user_id = ? AND s.status = 'submitted'
            ORDER BY s.submission_date DESC
            LIMIT 3
        ");
        $stmt->execute([$userId]);
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $activities[] = [
                'type' => 'task_completed',
                'message' => 'You completed the assignment: "' . $row['title'] . '"',
                'className' => $row['class_name'],
                'classId' => $row['class_id'],
                'time' => getTimeAgo($row['submission_date'])
            ];
        }
        
        // 4. Class joined
        $stmt = $pdo->prepare("
            SELECT cm.joined_at, c.id as class_id, c.name as class_name,
                   'class_joined' as type
            FROM class_members cm
            JOIN classes c ON cm.class_id = c.id
            WHERE cm.user_id = ?
            ORDER BY cm.joined_at DESC
            LIMIT 2
        ");
        $stmt->execute([$userId]);
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $activities[] = [
                'type' => 'class_joined',
                'message' => 'You joined the class: "' . $row['class_name'] . '"',
                'className' => $row['class_name'],
                'classId' => $row['class_id'],
                'time' => getTimeAgo($row['joined_at'])
            ];
        }
        
        // Sort by date (most recent first)
        usort($activities, function($a, $b) {
            return strtotime($b['time']) - strtotime($a['time']);
        });
        
        // Take the 5 most recent activities
        $activities = array_slice($activities, 0, 5);
        
        return [
            'success' => true,
            'activities' => $activities
        ];
    } catch (Exception $e) {
        error_log("Error fetching recent activity: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to fetch activities: ' . $e->getMessage()];
    }
}
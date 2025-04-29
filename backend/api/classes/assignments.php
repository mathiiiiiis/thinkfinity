<?php
// Assignments-related functions

// Check if the file is being directly accessed
if (!defined('ABSPATH') && basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    exit('Direct script access denied.');
}

// Create assignment
function createAssignment($classId, $userId, $assignmentData) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        // Check if user is a teacher or assistant for this class
        $stmt = $pdo->prepare("
            SELECT role FROM class_members 
            WHERE class_id = ? AND user_id = ? AND (role = 'teacher' OR role = 'assistant')
        ");
        $stmt->execute([$classId, $userId]);
        
        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'You do not have permission to create assignments'];
        }
        
        // Validate required fields
        if (empty($assignmentData['title']) || empty($assignmentData['dueDate'])) {
            return ['success' => false, 'message' => 'Assignment title and due date are required'];
        }
        
        // Insert the assignment
        $stmt = $pdo->prepare("
            INSERT INTO class_assignments (
                class_id, title, description, due_date, points, status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $classId,
            $assignmentData['title'],
            $assignmentData['description'] ?? null,
            $assignmentData['dueDate'],
            $assignmentData['points'] ?? 100,
            $assignmentData['status'] ?? 'published',
            $userId
        ]);
        
        $assignmentId = $pdo->lastInsertId();
        
        // Get the created assignment details
        $stmt = $pdo->prepare("
            SELECT a.*, u.username as created_by_name
            FROM class_assignments a
            JOIN users u ON a.created_by = u.id
            WHERE a.id = ?
        ");
        $stmt->execute([$assignmentId]);
        
        $assignmentDetails = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Post announcement about the assignment if it's published
        if ($assignmentDetails['status'] === 'published') {
            $stmt = $pdo->prepare("
                INSERT INTO class_messages (
                    class_id, user_id, message, message_type
                ) VALUES (?, ?, ?, 'announcement')
            ");
            
            $message = "New assignment: {$assignmentDetails['title']}. Due: " . 
                       date('M j, Y g:i A', strtotime($assignmentDetails['due_date']));
            
            $stmt->execute([$classId, $userId, $message]);
        }
        
        return [
            'success' => true,
            'message' => 'Assignment created successfully',
            'assignment' => [
                'id' => $assignmentDetails['id'],
                'title' => $assignmentDetails['title'],
                'description' => $assignmentDetails['description'],
                'dueDate' => $assignmentDetails['due_date'],
                'points' => $assignmentDetails['points'],
                'status' => $assignmentDetails['status'],
                'createdBy' => $assignmentDetails['created_by_name'],
                'createdAt' => $assignmentDetails['created_at']
            ]
        ];
    } catch (Exception $e) {
        error_log("Error creating assignment: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to create assignment: ' . $e->getMessage()];
    }
}

// Get class assignments
function getClassAssignments($classId, $userId) {
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
        
        // Get assignments, including submission status for this user
        $stmt = $pdo->prepare("
            SELECT a.*, 
                u.username as created_by_name,
                s.id as submission_id,
                s.status as submission_status,
                s.grade
            FROM class_assignments a
            JOIN users u ON a.created_by = u.id
            LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.user_id = ?
            WHERE a.class_id = ? 
            AND (a.status = 'published' OR ? IN ('teacher', 'assistant'))
            ORDER BY a.due_date ASC
        ");
        $stmt->execute([$userId, $classId, $userRole]);
        
        $assignments = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Calculate if assignment is overdue
            $dueDate = new DateTime($row['due_date']);
            $now = new DateTime();
            $isOverdue = $dueDate < $now && 
                         (!$row['submission_id'] || $row['submission_status'] === 'draft');
            
            $assignments[] = [
                'id' => $row['id'],
                'title' => $row['title'],
                'description' => $row['description'],
                'dueDate' => $row['due_date'],
                'points' => $row['points'],
                'status' => $row['status'],
                'createdBy' => $row['created_by_name'],
                'createdAt' => $row['created_at'],
                'submission' => $row['submission_id'] ? [
                    'id' => $row['submission_id'],
                    'status' => $row['submission_status'],
                    'grade' => $row['grade']
                ] : null,
                'isOverdue' => $isOverdue
            ];
        }
        
        return [
            'success' => true,
            'assignments' => $assignments
        ];
    } catch (Exception $e) {
        error_log("Error fetching assignments: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to fetch assignments: ' . $e->getMessage()];
    }
}

// Submit assignment
function submitAssignment($assignmentId, $userId, $submissionData) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        // Start transaction
        $pdo->beginTransaction();
        
        // Verify the assignment exists and user is in the class
        $stmt = $pdo->prepare("
            SELECT a.*, c.id as class_id, 
                (SELECT role FROM class_members WHERE class_id = c.id AND user_id = ?) as user_role
            FROM class_assignments a
            JOIN classes c ON a.class_id = c.id
            WHERE a.id = ?
        ");
        $stmt->execute([$userId, $assignmentId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Assignment not found');
        }
        
        $assignmentData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$assignmentData['user_role']) {
            throw new Exception('You are not a member of this class');
        }
        
        if ($assignmentData['user_role'] !== 'student') {
            throw new Exception('Only students can submit assignments');
        }
        
        // Check if due date has passed
        $dueDate = new DateTime($assignmentData['due_date']);
        $now = new DateTime();
        $status = ($dueDate < $now) ? 'late' : 'submitted';
        
        // Check if submission already exists
        $stmt = $pdo->prepare("
            SELECT id, status FROM assignment_submissions 
            WHERE assignment_id = ? AND user_id = ?
        ");
        $stmt->execute([$assignmentId, $userId]);
        
        if ($stmt->rowCount() > 0) {
            $existingSubmission = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Don't allow updating if already graded
            if ($existingSubmission['status'] === 'graded') {
                throw new Exception('Cannot update submission after it has been graded');
            }
            
            // Update existing submission
            $stmt = $pdo->prepare("
                UPDATE assignment_submissions
                SET content = ?, attachments = ?, status = ?, submission_date = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            
            $stmt->execute([
                $submissionData['content'],
                $submissionData['attachments'] ?? null,
                $status,
                $existingSubmission['id']
            ]);
            
            $submissionId = $existingSubmission['id'];
        } else {
            // Create new submission
            $stmt = $pdo->prepare("
                INSERT INTO assignment_submissions (
                    assignment_id, user_id, content, attachments, status
                ) VALUES (?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $assignmentId,
                $userId,
                $submissionData['content'],
                $submissionData['attachments'] ?? null,
                $status
            ]);
            
            $submissionId = $pdo->lastInsertId();
        }
        
        // Commit transaction
        $pdo->commit();
        
        return [
            'success' => true,
            'message' => 'Assignment submitted successfully',
            'submission' => [
                'id' => $submissionId,
                'status' => $status,
                'submissionDate' => date('Y-m-d H:i:s')
            ]
        ];
    } catch (Exception $e) {
        // Rollback on error
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        error_log("Error submitting assignment: " . $e->getMessage());
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

// Grade assignment submission
function gradeSubmission($submissionId, $userId, $gradeData) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        // Check if user is a teacher or assistant for this class
        $stmt = $pdo->prepare("
            SELECT cm.role, c.id as class_id, a.id as assignment_id, s.user_id as student_id
            FROM assignment_submissions s
            JOIN class_assignments a ON s.assignment_id = a.id
            JOIN classes c ON a.class_id = c.id
            JOIN class_members cm ON c.id = cm.class_id AND cm.user_id = ?
            WHERE s.id = ?
        ");
        $stmt->execute([$userId, $submissionId]);
        
        if ($stmt->rowCount() === 0 || !in_array($stmt->fetch(PDO::FETCH_ASSOC)['role'], ['teacher', 'assistant'])) {
            return ['success' => false, 'message' => 'You do not have permission to grade submissions'];
        }
        
        $classInfo = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Update the submission with grade and feedback
        $stmt = $pdo->prepare("
            UPDATE assignment_submissions
            SET grade = ?, feedback = ?, status = 'graded'
            WHERE id = ?
        ");
        
        $stmt->execute([
            $gradeData['grade'],
            $gradeData['feedback'] ?? null,
            $submissionId
        ]);
        
        // Send a message to the student
        $stmt = $pdo->prepare("
            INSERT INTO class_messages (
                class_id, user_id, message, recipient_id, is_private
            ) VALUES (?, ?, ?, ?, 1)
        ");
        
        $message = "Your assignment has been graded. Grade: {$gradeData['grade']}";
        if (!empty($gradeData['feedback'])) {
            $message .= ". Feedback: {$gradeData['feedback']}";
        }
        
        $stmt->execute([
            $classInfo['class_id'],
            $userId,
            $message,
            $classInfo['student_id']
        ]);
        
        return [
            'success' => true,
            'message' => 'Submission graded successfully'
        ];
    } catch (Exception $e) {
        error_log("Error grading submission: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to grade submission: ' . $e->getMessage()];
    }
}
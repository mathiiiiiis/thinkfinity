<?php
// Class management functions

// Check if the file is being directly accessed
if (!defined('ABSPATH') && basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    exit('Direct script access denied.');
}

// Create a new class
function createClass($teacherId, $classData) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        // Start transaction
        $pdo->beginTransaction();
        
        // Check required fields
        if (empty($classData['name'])) {
            throw new Exception('Class name is required');
        }
        
        // Generate UUID and class code
        $uuid = uniqid('cls_', true);
        
        // Generate a unique class code
        $classCode = generateClassCode();
        $codeExists = true;
        
        while ($codeExists) {
            $stmt = $pdo->prepare("SELECT id FROM classes WHERE class_code = ?");
            $stmt->execute([$classCode]);
            
            if ($stmt->rowCount() === 0) {
                $codeExists = false;
            } else {
                $classCode = generateClassCode();
            }
        }
        
        // Insert new class
        $stmt = $pdo->prepare("
            INSERT INTO classes (
                uuid, name, description, teacher_id, category, level, 
                color, class_code, cover_image, visibility
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $uuid,
            $classData['name'],
            $classData['description'] ?? null,
            $teacherId,
            $classData['category'] ?? null,
            $classData['level'] ?? null,
            $classData['color'] ?? '#4A6FFF',
            $classCode,
            $classData['coverImage'] ?? null,
            $classData['visibility'] ?? 'private'
        ]);
        
        $classId = $pdo->lastInsertId();
        
        // Add the teacher as a member with teacher role
        $stmt = $pdo->prepare("
            INSERT INTO class_members (class_id, user_id, role)
            VALUES (?, ?, 'teacher')
        ");
        $stmt->execute([$classId, $teacherId]);
        
        // Commit transaction
        $pdo->commit();
        
        // Get the class details to return
        $stmt = $pdo->prepare("
            SELECT c.*, u.username as teacher_name, 
                   (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as students_count
            FROM classes c
            JOIN users u ON c.teacher_id = u.id
            WHERE c.id = ?
        ");
        $stmt->execute([$classId]);
        $classDetails = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'message' => 'Class created successfully',
            'classId' => $classId,
            'classCode' => $classCode,
            'classData' => [
                'id' => $classDetails['id'],
                'uuid' => $classDetails['uuid'],
                'name' => $classDetails['name'],
                'description' => $classDetails['description'],
                'teacher' => $classDetails['teacher_name'],
                'category' => $classDetails['category'],
                'level' => $classDetails['level'],
                'color' => $classDetails['color'],
                'coverImage' => $classDetails['cover_image'],
                'visibility' => $classDetails['visibility'],
                'status' => $classDetails['status'],
                'studentsCount' => $classDetails['students_count'],
                'classCode' => $classDetails['class_code']
            ]
        ];
    } catch (Exception $e) {
        // Rollback on error
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        error_log("Error creating class: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to create class: ' . $e->getMessage()];
    }
}

// Join a class using class code
function joinClass($userId, $classCode) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        // Start transaction
        $pdo->beginTransaction();
        
        // Find the class by code
        $stmt = $pdo->prepare("SELECT * FROM classes WHERE class_code = ?");
        $stmt->execute([$classCode]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Class not found. Please check the class code and try again.');
        }
        
        $classData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Check if user is already a member
        $stmt = $pdo->prepare("SELECT * FROM class_members WHERE class_id = ? AND user_id = ?");
        $stmt->execute([$classData['id'], $userId]);
        
        if ($stmt->rowCount() > 0) {
            throw new Exception('You are already a member of this class.');
        }
        
        // Add user as a member with student role
        $stmt = $pdo->prepare("
            INSERT INTO class_members (class_id, user_id, role)
            VALUES (?, ?, 'student')
        ");
        $stmt->execute([$classData['id'], $userId]);
        
        // Commit transaction
        $pdo->commit();
        
        // Get teacher name
        $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
        $stmt->execute([$classData['teacher_id']]);
        $teacherData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Get students count
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM class_members WHERE class_id = ?");
        $stmt->execute([$classData['id']]);
        $studentsData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'message' => 'Successfully joined the class',
            'classId' => $classData['id'],
            'classData' => [
                'id' => $classData['id'],
                'uuid' => $classData['uuid'],
                'name' => $classData['name'],
                'description' => $classData['description'],
                'teacher' => $teacherData['username'],
                'category' => $classData['category'],
                'level' => $classData['level'],
                'color' => $classData['color'],
                'coverImage' => $classData['cover_image'],
                'status' => $classData['status'],
                'studentsCount' => $studentsData['count']
            ]
        ];
    } catch (Exception $e) {
        // Rollback on error
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        error_log("Error joining class: " . $e->getMessage());
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

// Get user's classes (where they are a member)
function getUserClasses($userId) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        $stmt = $pdo->prepare("
            SELECT c.*, u.username as teacher_name, cm.role,
                   (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as students_count,
                   (SELECT COUNT(*) FROM class_assignments WHERE class_id = c.id AND due_date > NOW()) as total_tasks,
                   (SELECT COUNT(*) FROM class_assignments 
                    WHERE class_id = c.id AND due_date > NOW() AND due_date <= DATE_ADD(NOW(), INTERVAL 2 DAY)) as urgent_tasks
            FROM classes c
            JOIN class_members cm ON c.id = cm.class_id
            JOIN users u ON c.teacher_id = u.id
            WHERE cm.user_id = ? AND cm.role = 'student' AND c.status != 'archived'
            ORDER BY c.updated_at DESC
        ");
        $stmt->execute([$userId]);
        
        $classes = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $classes[] = [
                'id' => $row['id'],
                'uuid' => $row['uuid'],
                'name' => $row['name'],
                'description' => $row['description'],
                'teacher' => $row['teacher_name'],
                'category' => $row['category'],
                'level' => $row['level'],
                'color' => $row['color'],
                'coverImage' => $row['cover_image'],
                'status' => $row['status'],
                'studentsCount' => $row['students_count'],
                'totalTasks' => $row['total_tasks'],
                'urgentTasks' => $row['urgent_tasks']
            ];
        }
        
        return [
            'success' => true,
            'classes' => $classes
        ];
    } catch (Exception $e) {
        error_log("Error fetching user classes: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to fetch classes: ' . $e->getMessage()];
    }
}

// Get classes where user is a teacher
function getTeachingClasses($userId) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        $stmt = $pdo->prepare("
            SELECT c.*, 
                   (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as students_count,
                   (SELECT COUNT(*) FROM class_assignments WHERE class_id = c.id AND due_date > NOW()) as total_tasks
            FROM classes c
            WHERE c.teacher_id = ? AND c.status != 'archived'
            ORDER BY c.updated_at DESC
        ");
        $stmt->execute([$userId]);
        
        $classes = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $classes[] = [
                'id' => $row['id'],
                'uuid' => $row['uuid'],
                'name' => $row['name'],
                'description' => $row['description'],
                'teacher' => 'You',
                'category' => $row['category'],
                'level' => $row['level'],
                'color' => $row['color'],
                'coverImage' => $row['cover_image'],
                'status' => $row['status'],
                'studentsCount' => $row['students_count'],
                'totalTasks' => $row['total_tasks'],
                'classCode' => $row['class_code']
            ];
        }
        
        return [
            'success' => true,
            'classes' => $classes
        ];
    } catch (Exception $e) {
        error_log("Error fetching teaching classes: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to fetch teaching classes: ' . $e->getMessage()];
    }
}

// Get public/explorable classes
function getExploreClasses($filters = []) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        $whereConditions = ["c.visibility = 'public' AND c.status = 'active'"];
        $params = [];
        
        // Add filters
        if (!empty($filters['category'])) {
            $whereConditions[] = "c.category = ?";
            $params[] = $filters['category'];
        }
        
        if (!empty($filters['level'])) {
            $whereConditions[] = "c.level = ?";
            $params[] = $filters['level'];
        }
        
        if (!empty($filters['search'])) {
            $whereConditions[] = "(c.name LIKE ? OR c.description LIKE ? OR u.username LIKE ?)";
            $searchTerm = "%" . $filters['search'] . "%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        $whereClause = implode(" AND ", $whereConditions);
        
        $stmt = $pdo->prepare("
            SELECT c.*, u.username as teacher_name,
                   (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as students_count
            FROM classes c
            JOIN users u ON c.teacher_id = u.id
            WHERE $whereClause
            ORDER BY students_count DESC, c.created_at DESC
            LIMIT 50
        ");
        $stmt->execute($params);
        
        $classes = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $classes[] = [
                'id' => $row['id'],
                'uuid' => $row['uuid'],
                'name' => $row['name'],
                'description' => $row['description'],
                'teacher' => $row['teacher_name'],
                'category' => $row['category'],
                'level' => $row['level'],
                'color' => $row['color'],
                'coverImage' => $row['cover_image'],
                'status' => $row['status'],
                'studentsCount' => $row['students_count']
            ];
        }
        
        return [
            'success' => true,
            'classes' => $classes
        ];
    } catch (Exception $e) {
        error_log("Error fetching explore classes: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to fetch classes: ' . $e->getMessage()];
    }
}

// Get class details
function getClassDetails($classId, $userId) {
    ensureClassTablesExist();
    $pdo = getDbConnection();
    
    try {
        // Check if user is a member of the class
        $stmt = $pdo->prepare("
            SELECT cm.role 
            FROM class_members cm 
            WHERE cm.class_id = ? AND cm.user_id = ?
        ");
        $stmt->execute([$classId, $userId]);
        
        if ($stmt->rowCount() === 0) {
            // Check if class is public
            $stmt = $pdo->prepare("
                SELECT visibility FROM classes WHERE id = ? AND visibility = 'public'
            ");
            $stmt->execute([$classId]);
            
            if ($stmt->rowCount() === 0) {
                return ['success' => false, 'message' => 'You do not have access to this class'];
            }
            
            $userRole = 'viewer';
        } else {
            $userRole = $stmt->fetch(PDO::FETCH_COLUMN);
        }
        
        // Get class details
        $stmt = $pdo->prepare("
            SELECT c.*, u.username as teacher_name, u.profile_image as teacher_image,
                   (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as students_count
            FROM classes c
            JOIN users u ON c.teacher_id = u.id
            WHERE c.id = ?
        ");
        $stmt->execute([$classId]);
        
        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'Class not found'];
        }
        
        $classData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Get upcoming assignments
        $stmt = $pdo->prepare("
            SELECT a.*, u.username as created_by_name,
                   (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submissions_count
            FROM class_assignments a
            JOIN users u ON a.created_by = u.id
            WHERE a.class_id = ? AND a.status = 'published' AND a.due_date > NOW()
            ORDER BY a.due_date ASC
            LIMIT 5
        ");
        $stmt->execute([$classId]);
        
        $upcomingAssignments = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $upcomingAssignments[] = [
                'id' => $row['id'],
                'title' => $row['title'],
                'description' => $row['description'],
                'dueDate' => $row['due_date'],
                'points' => $row['points'],
                'createdBy' => $row['created_by_name'],
                'submissionsCount' => $row['submissions_count'],
                'createdAt' => $row['created_at']
            ];
        }
        
        // Get recent class messages (stream)
        $stmt = $pdo->prepare("
            SELECT m.*, u.username, u.profile_image
            FROM class_messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.class_id = ? 
            AND (m.is_private = 0 OR m.recipient_id = ?)
            ORDER BY m.created_at DESC
            LIMIT 10
        ");
        $stmt->execute([$classId, $userId]);
        
        $recentMessages = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $recentMessages[] = [
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
        
        // Get class members
        $stmt = $pdo->prepare("
            SELECT cm.role, u.id, u.username, u.profile_image, u.uuid
            FROM class_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.class_id = ?
            ORDER BY cm.role = 'teacher' DESC, u.username ASC
        ");
        $stmt->execute([$classId]);
        
        $members = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $members[] = [
                'id' => $row['id'],
                'username' => $row['username'],
                'profileImage' => $row['profile_image'],
                'uuid' => $row['uuid'],
                'role' => $row['role']
            ];
        }
        
        return [
            'success' => true,
            'class' => [
                'id' => $classData['id'],
                'uuid' => $classData['uuid'],
                'name' => $classData['name'],
                'description' => $classData['description'],
                'teacher' => [
                    'name' => $classData['teacher_name'],
                    'image' => $classData['teacher_image']
                ],
                'category' => $classData['category'],
                'level' => $classData['level'],
                'color' => $classData['color'],
                'coverImage' => $classData['cover_image'],
                'visibility' => $classData['visibility'],
                'status' => $classData['status'],
                'studentsCount' => $classData['students_count'],
                'classCode' => $userRole === 'teacher' ? $classData['class_code'] : null,
                'createdAt' => $classData['created_at']
            ],
            'userRole' => $userRole,
            'upcomingAssignments' => $upcomingAssignments,
            'recentMessages' => $recentMessages,
            'members' => $members
        ];
    } catch (Exception $e) {
        error_log("Error fetching class details: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to fetch class details: ' . $e->getMessage()];
    }
}
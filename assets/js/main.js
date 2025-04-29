// Check if API constants are already defined in the global scope
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = '/backend/api/classes.php';
}

if (typeof window.UPLOAD_HANDLER_PATH === 'undefined') {
    window.UPLOAD_HANDLER_PATH = '/backend/handlers/upload_handler.php';
}

// Create a Dashboard module to avoid global namespace pollution
const DashboardModule = (function() {
    // Use the global constants
    const apiBaseUrl = window.API_BASE_URL;
    const uploadHandlerPath = window.UPLOAD_HANDLER_PATH;

    document.addEventListener('DOMContentLoaded', function() {
        // Initialize dashboard elements
        initDashboard();
        
        // Button event listeners
        const exploreClassesBtn = document.getElementById('exploreClassesBtn');
        const browseCommunityBtn = document.getElementById('browseCommunityBtn');
        
        if (exploreClassesBtn) {
            exploreClassesBtn.addEventListener('click', function() {
                window.location.href = 'classes.html';
            });
        }
        
        if (browseCommunityBtn) {
            browseCommunityBtn.addEventListener('click', function() {
                window.location.href = '#'; // Update with the forum page URL when available
            });
        }
    });

    // Initialize dashboard with user data
    async function initDashboard() {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            console.log('User not authenticated, showing default dashboard view');
            return;
        }
        
        try {
            // Load user's classes
            await loadUserClasses();
            
            // Load upcoming tasks
            await loadUpcomingTasks();
            
            // Load recent activity
            await loadRecentActivity();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    // Load user's classes
    async function loadUserClasses() {
        const token = localStorage.getItem('authToken');
        const yourClassesList = document.getElementById('yourClassesList');
        const noClassesMessage = document.getElementById('noClassesMessage');
        
        if (!token || !yourClassesList) return;
        
        try {
            // Make API call to get user classes
            const response = await fetch(`${apiBaseUrl}?action=get_user_classes`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.classes && data.classes.length > 0) {
                // Hide no classes message
                if (noClassesMessage) noClassesMessage.style.display = 'none';
                
                // Create class cards
                let classCardsHTML = '';
                
                data.classes.forEach(classItem => {
                    const hasUrgentTasks = classItem.urgentTasks > 0;
                    
                    classCardsHTML += `
                    <div class="class-card" data-class-id="${classItem.id}">
                        <div class="class-image" style="background-color: ${classItem.color || '#e0e0ff'}">
                            ${classItem.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="class-info">
                            <h3 class="class-name">${classItem.name}</h3>
                            <div class="class-meta">${classItem.teacher}</div>
                        </div>
                        <div class="class-footer">
                            <div class="tasks-count ${hasUrgentTasks ? 'urgent' : ''}">
                                ${classItem.totalTasks} tasks
                                ${hasUrgentTasks ? `(${classItem.urgentTasks} urgent)` : ''}
                            </div>
                        </div>
                    </div>
                    `;
                });
                
// Add new class cards before no classes message
                if (noClassesMessage) {
                    yourClassesList.innerHTML = classCardsHTML + noClassesMessage.outerHTML;
                } else {
                    yourClassesList.innerHTML = classCardsHTML;
                }
                
                // Add click event listeners to class cards
                const classCards = document.querySelectorAll('.class-card');
                classCards.forEach(card => {
                    card.addEventListener('click', () => {
                        const classId = card.getAttribute('data-class-id');
                        window.location.href = `class-detail.html?id=${classId}`;
                    });
                });
            } else {
                // Show no classes message
                if (noClassesMessage) noClassesMessage.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error loading user classes:', error);
            if (noClassesMessage) {
                noClassesMessage.innerHTML = `
                    <p>Error loading your classes</p>
                    <button class="action-link" onclick="DashboardModule.loadUserClasses()">Try Again</button>
                `;
                noClassesMessage.style.display = 'flex';
            }
        }
    }

    // Load upcoming tasks
    async function loadUpcomingTasks() {
        const token = localStorage.getItem('authToken');
        const tasksList = document.getElementById('upcomingTasksList');
        const noTasksMessage = document.getElementById('noTasksMessage');
        
        if (!token || !tasksList) return;
        
        try {
            // Make API call to get upcoming tasks
            const response = await fetch(`${apiBaseUrl}?action=get_upcoming_tasks`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.tasks && data.tasks.length > 0) {
                // Hide no tasks message
                if (noTasksMessage) noTasksMessage.style.display = 'none';
                
                // Create task items
                let tasksHTML = '';
                
                data.tasks.forEach(task => {
                    const priorityClass = task.priority === 'high' ? 'priority-high' : 
                                         (task.priority === 'medium' ? 'priority-medium' : 'priority-low');
                    
                    tasksHTML += `
                    <div class="task-item" data-task-id="${task.id}">
                        <div class="task-checkbox">
                            <input type="checkbox" id="task-${task.id}" ${task.completed ? 'checked' : ''}>
                        </div>
                        <div class="task-content">
                            <h3 class="task-name">${task.name}</h3>
                            <div class="task-details">
                                <span class="task-class">${task.className}</span>
                                <span class="task-date">${task.dueDate}</span>
                            </div>
                        </div>
                        <span class="task-priority ${priorityClass}">${task.priority}</span>
                    </div>
                    `;
                });
                
                // Add new tasks before no tasks message
                if (noTasksMessage) {
                    tasksList.innerHTML = tasksHTML + noTasksMessage.outerHTML;
                } else {
                    tasksList.innerHTML = tasksHTML;
                }
                
                // Add event listeners to checkboxes
                const checkboxes = tasksList.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', async (e) => {
                        const taskId = e.target.id.replace('task-', '');
                        const completed = e.target.checked;
                        
                        try {
                            const response = await fetch(`${apiBaseUrl}?action=update_task_status`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    taskId: taskId,
                                    completed: completed
                                })
                            });
                            
                            if (!response.ok) {
                                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
                            }
                            
                            const result = await response.json();
                            
                            if (!result.success) {
                                throw new Error(result.message || 'Failed to update task status');
                            }
                        } catch (error) {
                            console.error('Error updating task status:', error);
                            e.target.checked = !completed; // Revert checkbox state
                            alert('Failed to update task status. Please try again.');
                        }
                    });
                });
            } else {
                // Show no tasks message
                if (noTasksMessage) noTasksMessage.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error loading upcoming tasks:', error);
            if (noTasksMessage) {
                noTasksMessage.innerHTML = `
                    <p>Error loading your tasks</p>
                    <button class="action-link" onclick="DashboardModule.loadUpcomingTasks()">Try Again</button>
                `;
                noTasksMessage.style.display = 'flex';
            }
        }
    }

    // Load recent activity
    async function loadRecentActivity() {
        const token = localStorage.getItem('authToken');
        const activityList = document.getElementById('recentActivityList');
        const noActivityMessage = document.getElementById('noActivityMessage');
        
        if (!token || !activityList) return;
        
        try {
            // Make API call to get recent activity
            const response = await fetch(`${apiBaseUrl}?action=get_recent_activity`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.activities && data.activities.length > 0) {
                // Hide no activity message
                if (noActivityMessage) noActivityMessage.style.display = 'none';
                
                // Create activity items
                let activitiesHTML = '';
                
                data.activities.forEach(activity => {
                    activitiesHTML += `
                    <div class="activity-item">
                        <div class="activity-icon">${getActivityIcon(activity.type)}</div>
                        <div class="activity-details">
                            <p class="activity-message">${activity.message}</p>
                            <div class="activity-meta">
                                <span class="activity-class">${activity.className}</span>
                                <span class="activity-time">${activity.time}</span>
                            </div>
                        </div>
                    </div>
                    `;
                });
                
                // Add new activities before no activity message
                if (noActivityMessage) {
                    activityList.innerHTML = activitiesHTML + noActivityMessage.outerHTML;
                } else {
                    activityList.innerHTML = activitiesHTML;
                }
            } else {
                // Show no activity message
                if (noActivityMessage) noActivityMessage.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
            if (noActivityMessage) {
                noActivityMessage.innerHTML = `
                    <p>Error loading your activity</p>
                    <button class="action-link" onclick="DashboardModule.loadRecentActivity()">Try Again</button>
                `;
                noActivityMessage.style.display = 'flex';
            }
        }
    }

    // Helper function for activity icons
    function getActivityIcon(type) {
        switch (type) {
            case 'task_added':
                return '✏️';
            case 'task_completed':
                return '✅';
            case 'class_joined':
                return '🎓';
            case 'announcement':
                return '📢';
            case 'message':
                return '💬';
            default:
                return '📌';
        }
    }

    // Return public methods
    return {
        loadUserClasses,
        loadUpcomingTasks,
        loadRecentActivity
    };
})();

// Make the module available globally
window.DashboardModule = DashboardModule;
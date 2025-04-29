/**
 * Class Detail Manager
 * Handles loading and displaying class details
 */
const ClassDetailManager = (function() {
    // Get API_BASE_URL from global scope or use default
    const apiBaseUrl = window.API_BASE_URL || '/backend/api/classes.php';
    
    // Load class details
    async function loadClassDetails(classId) {
        console.log(`Loading class details for ID: ${classId}`);
        const token = localStorage.getItem('authToken');
        
        try {
            const response = await fetch(`${apiBaseUrl}?action=get_class_details&id=${classId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load class details');
            }
            
            console.log('Class details loaded successfully:', data);
            
            // Store class data and user role
            window.setClassData(data.class);
            window.setUserRole(data.userRole);
            
            // Render class header
            renderClassHeader(data.class);
            
            // Load initial tab content (stream)
            if (typeof StreamManager !== 'undefined') {
                StreamManager.loadStreamContent(classId);
            } else {
                console.error('StreamManager not found. Check script loading order.');
            }
            
            // Pre-load other tabs
            if (typeof AssignmentManager !== 'undefined') {
                AssignmentManager.loadAssignments(classId);
            }
            
            if (typeof MembersManager !== 'undefined') {
                MembersManager.loadClassMembers(classId);
            }
            
            if (typeof ChatManager !== 'undefined') {
                ChatManager.setupChatInterface(classId);
            }
            
            // Show teacher controls if applicable
            if (data.userRole === 'teacher' || data.userRole === 'assistant') {
                const teacherControls = document.getElementById('teacherControls');
                if (teacherControls) teacherControls.classList.remove('hidden');
                
                const inviteControls = document.getElementById('inviteControls');
                if (inviteControls) inviteControls.classList.remove('hidden');
                
                // Update class code in invite modal
                const classCodeText = document.getElementById('classCodeText');
                if (classCodeText && data.class.classCode) {
                    classCodeText.textContent = data.class.classCode;
                }
            }
            
        } catch (error) {
            console.error('Error loading class details:', error);
            
            // Show an error message on the page
            const container = document.querySelector('.container') || document.body;
            const errorEl = document.createElement('div');
            errorEl.className = 'error-message';
            errorEl.innerHTML = `
                <h2>Error Loading Class</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()">Retry</button>
            `;
            container.prepend(errorEl);
            
            UIManager.showAlert('Error loading class details. Please try again.', 'error');
        }
    }

    // Render class header
    function renderClassHeader(classData) {
        const classHeader = document.getElementById('classHeader');
        if (!classHeader) {
            console.error('Class header element not found in the DOM!');
            return;
        }
        
        console.log('Rendering class header with data:', classData);
        
        classHeader.style.backgroundColor = classData.color || '#4A6FFF';
        
        classHeader.innerHTML = `
            <div class="class-header-content">
                <h1>${classData.name}</h1>
                <p>${classData.description || ''}</p>
                <div class="class-meta">
                    <span class="teacher">Teacher: ${classData.teacher.name}</span>
                    <span class="category">${classData.category || 'General'}</span>
                    <span class="students-count">${classData.studentsCount} students</span>
                    ${classData.classCode && (window.getUserRole() === 'teacher' || window.getUserRole() === 'assistant') ? 
                        `<span class="class-code">Class Code: ${classData.classCode}</span>` : ''}
                </div>
            </div>
        `;
        
        // Update page title
        document.title = `${classData.name} - Thinkfinity`;
        
        // Update user avatar
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.profileImage) {
                userAvatar.style.backgroundImage = `url('${user.profileImage}')`;
            } else {
                userAvatar.textContent = user.username ? user.username.charAt(0).toUpperCase() : '?';
            }
        }
    }

    // Switch between tabs
    function switchTab(tabId) {
        console.log(`Switching to tab: ${tabId}`);
        
        // Update active tab button
        const tabButtons = document.querySelectorAll('.class-nav-btn');
        let buttonFound = false;
        
        tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
                buttonFound = true;
            } else {
                btn.classList.remove('active');
            }
        });
        
        if (!buttonFound) {
            console.warn(`No tab button found with data-tab="${tabId}"`);
        }
        
        // Show selected tab content, hide others
        const tabContents = document.querySelectorAll('.tab-content');
        let tabContentFound = false;
        
        tabContents.forEach(content => {
            if (content.id === `${tabId}Tab`) {
                content.classList.remove('hidden');
                tabContentFound = true;
            } else {
                content.classList.add('hidden');
            }
        });
        
        if (!tabContentFound) {
            console.warn(`No tab content found with id="${tabId}Tab"`);
        }
        
        // If switching to chat tab, make sure messages container scrolls to bottom
        if (tabId === 'chat') {
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                setTimeout(() => {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 100);
            }
        }
    }

    // Check if elements exist in the DOM
    function checkRequiredElements() {
        const requiredElements = [
            { id: 'classHeader', name: 'Class Header' },
            { id: 'streamTab', name: 'Stream Tab' },
            { id: 'assignmentsTab', name: 'Assignments Tab' },
            { id: 'membersTab', name: 'Members Tab' },
            { id: 'chatTab', name: 'Chat Tab' }
        ];
        
        let allFound = true;
        const missingElements = [];
        
        requiredElements.forEach(element => {
            if (!document.getElementById(element.id)) {
                allFound = false;
                missingElements.push(element.name);
            }
        });
        
        if (!allFound) {
            console.error('Missing required DOM elements:', missingElements.join(', '));
            
            // Log the body content for debugging
            console.log('Current body HTML:', document.body.innerHTML);
        }
        
        return allFound;
    }

    return {
        loadClassDetails,
        renderClassHeader,
        switchTab,
        checkRequiredElements
    };
})();

// Make functions available globally
window.ClassDetailManager = ClassDetailManager;

// Check required elements when script loads
document.addEventListener('DOMContentLoaded', () => {
    ClassDetailManager.checkRequiredElements();
});
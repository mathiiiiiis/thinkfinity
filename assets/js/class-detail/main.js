/**
 * Main Application Logic for Class Detail Page
 */
console.log('Main.js loaded');

// Global variables
let classData = null;
let userRole = 'student';

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    // Get class ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('id');
    
    if (!classId) {
        window.location.href = 'classes.html';
        return;
    }
    
    // Load class details
    ClassDetailManager.loadClassDetails(classId);
    
    // Tab navigation
    const tabButtons = document.querySelectorAll('.class-nav-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            ClassDetailManager.switchTab(tabId);
        });
    });
    
    // Post button click event
    const postBtn = document.getElementById('postBtn');
    if (postBtn) {
        postBtn.addEventListener('click', StreamManager.postMessageToStream);
    }
    
    // Post input enter key event
    const postInput = document.getElementById('postInput');
    if (postInput) {
        postInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                StreamManager.postMessageToStream();
            }
        });
    }
    
    // Create assignment button click event
    const createAssignmentBtn = document.getElementById('createAssignmentBtn');
    if (createAssignmentBtn) {
        createAssignmentBtn.addEventListener('click', AssignmentManager.showCreateAssignmentModal);
    }
    
    // Invite button click event
    const inviteBtn = document.getElementById('inviteBtn');
    if (inviteBtn) {
        inviteBtn.addEventListener('click', MembersManager.showInviteModal);
    }
    
    // Copy class code button
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', MembersManager.copyClassCodeToClipboard);
    }
    
    // Send invites button
    const sendInvitesBtn = document.getElementById('sendInvitesBtn');
    if (sendInvitesBtn) {
        sendInvitesBtn.addEventListener('click', MembersManager.sendInvitations);
    }
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.modal .close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            UIManager.closeModal(modal);
        });
    });
    
    // Create assignment form submission
    const createAssignmentForm = document.getElementById('createAssignmentForm');
    if (createAssignmentForm) {
        createAssignmentForm.addEventListener('submit', AssignmentManager.createAssignment);
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                UIManager.closeModal(modal);
            }
        });
    });
});

// Make the classData and userRole available to other modules
window.getClassData = function() {
    return classData;
};

window.setClassData = function(data) {
    console.log('Setting class data:', data);
    classData = data;
};

window.getUserRole = function() {
    return userRole;
};

window.setUserRole = function(role) {
    console.log('Setting user role:', role);
    userRole = role;
};

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const profileUsername = document.getElementById('profileUsername');
    const profileTagline = document.getElementById('profileTagline');
    const profileImage = document.getElementById('profileImage');
    const profileBio = document.getElementById('profileBio');
    const connectBtn = document.getElementById('connectBtn');
    const messageBtn = document.getElementById('messageBtn');
    const connectionModal = document.getElementById('connectionModal');
    const messageModal = document.getElementById('messageModal');
    const messageForm = document.getElementById('messageForm');
    const closeConnectionModal = document.getElementById('closeConnectionModal');
    const cancelMessage = document.getElementById('cancelMessage');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Templates
    const userNotFoundTemplate = document.getElementById('userNotFoundTemplate');
    
    // API Endpoints
    const API_BASE_URL = '/backend/api/profile.php';
    
    // Debug flag
    const DEBUG = true;
    
    // Get user UUID from URL
    const pathParts = window.location.pathname.split('/');
    const userUuid = pathParts[pathParts.length - 1];
    
    // Helper Functions
    function getUserData() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }
    
    function getToken() {
        return localStorage.getItem('authToken');
    }
    
    function showAlert(message, type = 'info') {
        // Create alert element
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type}`;
        alertElement.textContent = message;
        
        // Add to document
        document.body.appendChild(alertElement);
        
        // Show with animation
        setTimeout(() => {
            alertElement.style.opacity = '1';
            alertElement.style.transform = 'translateY(0)';
        }, 10);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            alertElement.style.opacity = '0';
            alertElement.style.transform = 'translateY(-20px)';
            
            // Remove from DOM after animation
            setTimeout(() => {
                document.body.removeChild(alertElement);
            }, 300);
        }, 3000);
    }
    
    async function loadUserProfile() {
        try {
            // Check if we're viewing our own profile
            const currentUser = getUserData();
            if (currentUser && currentUser.uuid === userUuid) {
                window.location.href = '/profile.html';
                return;
            }
            
            // Get profile data
            const response = await fetch(`${API_BASE_URL}?action=public_profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    uuid: userUuid,
                    token: getToken() || '' 
                }),
            });
            
            const data = await response.json();
            
            if (DEBUG) console.log('Profile API response:', data);
            
            if (!data.success || !data.profile) {
                showUserNotFound();
                return;
            }
            
            // Update UI with profile data
            updateProfileUI(data.profile);
            
        } catch (error) {
            console.error('Error loading profile:', error);
            showUserNotFound();
        }
    }
    
    function updateProfileUI(profile) {
        document.title = `${profile.username} - Thinkfinity`;
        
        profileUsername.textContent = profile.username;
        profileTagline.textContent = profile.tagline || 'Learning enthusiast';
        profileImage.src = profile.profileImage || '/assets/pictures/default-profile.png';
        profileBio.textContent = profile.bio || 'This user has not added a bio yet.';
        
        // Update page metadata
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', `${profile.username} - ${profile.tagline || 'Learning enthusiast'} - Thinkfinity`);
        }
    }
    
    function showUserNotFound() {
        const notFoundContent = userNotFoundTemplate.content.cloneNode(true);
        const profileContainer = document.querySelector('.profile-container');
        
        // Clear existing content
        profileContainer.innerHTML = '';
        profileContainer.appendChild(notFoundContent);
        
        document.title = 'User Not Found - Thinkfinity';
    }
    
    // Event Handlers
    connectBtn.addEventListener('click', () => {
        connectionModal.style.display = 'block';
    });
    
    messageBtn.addEventListener('click', () => {
        messageModal.style.display = 'block';
    });
    
    closeConnectionModal.addEventListener('click', () => {
        connectionModal.style.display = 'none';
    });
    
    cancelMessage.addEventListener('click', () => {
        messageModal.style.display = 'none';
    });
    
    // Close modals when clicking on X or outside the modal
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const subject = document.getElementById('messageSubject').value;
        const content = document.getElementById('messageContent').value;
        
        if (!subject || !content) {
            showAlert('Please fill in all fields', 'error');
            return;
        }
        
        // Send message to the server
        const token = getToken();
        
        if (!token) {
            showAlert('You must be logged in to send messages', 'error');
            return;
        }
        
        fetch('/backend/api/messages.php?action=send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token,
                to: userUuid,
                subject,
                content
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Message sent successfully', 'success');
                messageModal.style.display = 'none';
                messageForm.reset();
            } else {
                throw new Error(data.message || 'Failed to send message');
            }
        })
        .catch(error => {
            showAlert('Failed to send message: ' + error.message, 'error');
        });
    });
    
    // Tab navigation
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Initialize profile
    loadUserProfile();
});
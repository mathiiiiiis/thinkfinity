document.addEventListener('DOMContentLoaded', () => {
    // References to elements
    const sessionList = document.getElementById('sessionList');
    const downloadDataBtn = document.getElementById('downloadDataBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    
    // API Endpoints
    const API_BASE_URL = '/backend/api/settings.php';
    
    // Initialize sessions
    loadActiveSessions();
    
    // Event listeners for account management buttons
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', handleDataDownload);
    }
    
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', showDeleteAccountModal);
    }
    
    // Load active sessions
    async function loadActiveSessions() {
        if (!sessionList) return;
        
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            // Show loading state
            sessionList.innerHTML = '<div class="loading-sessions">Loading your sessions...</div>';
            
            const response = await fetch(`${API_BASE_URL}?action=get_sessions`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const responseText = await response.text();
            let data;
            
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Error parsing response:', responseText);
                throw new Error('Invalid response format');
            }
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load sessions');
            }
            
            if (!data.sessions || !Array.isArray(data.sessions)) {
                console.error('Invalid sessions data:', data);
                throw new Error('Invalid sessions data format');
            }
            
            renderSessions(data.sessions, data.currentSessionId);
            
        } catch (error) {
            console.error('Error loading sessions:', error);
            sessionList.innerHTML = `
                <div class="error-message">
                    <p>Failed to load sessions: ${error.message}</p>
                    <button class="retry-btn" onclick="loadActiveSessions()">Retry</button>
                </div>
            `;
        }
    }
    
    // Render sessions list
    function renderSessions(sessions, currentSessionId) {
        if (!sessionList) return;
        
        if (!sessions || sessions.length === 0) {
            sessionList.innerHTML = '<div class="no-sessions">No active sessions found.</div>';
            return;
        }
        
        let sessionsHTML = '';
        
        sessions.forEach(session => {
            const isCurrentSession = session.id == currentSessionId;
            const deviceIcon = getDeviceIcon(session.device_type);
            const formattedDate = new Date(session.created_at).toLocaleString();
            const location = session.location || 'Unknown location';
            
            sessionsHTML += `
                <div class="session-item ${isCurrentSession ? 'current' : ''}">
                    <div class="session-info">
                        <div class="session-device">
                            ${deviceIcon}
                            <span>${session.device_name || 'Unknown device'}</span>
                            ${isCurrentSession ? '<span class="current-badge">Current</span>' : ''}
                        </div>
                        <div class="session-details">
                            ${location} • Last active: ${formattedDate}
                        </div>
                    </div>
                    <div class="session-actions">
                        ${!isCurrentSession ? `
                            <button type="button" class="terminate-btn" data-session-id="${session.id}">
                                Terminate Session
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        sessionList.innerHTML = sessionsHTML;
        
        // Add event listeners to terminate buttons
        const terminateButtons = sessionList.querySelectorAll('.terminate-btn');
        terminateButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const sessionId = button.getAttribute('data-session-id');
                terminateSession(sessionId);
                e.preventDefault();
            });
        });
    }
    
    // Get device icon SVG based on device type
    function getDeviceIcon(deviceType) {
        deviceType = (deviceType || '').toLowerCase();
        
        if (deviceType.includes('mobile') || deviceType.includes('phone')) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path d="M7 4v16h10V4H7zM6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm6 15a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>`;
        } else if (deviceType.includes('tablet')) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path d="M6 4v16h12V4H6zM5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm7 15a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>`;
        } else {
            // Default to desktop/laptop
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path d="M4 5v11h16V5H4zm-2-2h20a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-7v2h3v1H6v-1h3v-2H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
            </svg>`;
        }
    }
    
    // Terminate a session
    async function terminateSession(sessionId) {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            const response = await fetch(`${API_BASE_URL}?action=terminate_session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sessionId
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to terminate session');
            }
            
            showAlert('Session terminated successfully', 'success');
            
            // Reload sessions list
            loadActiveSessions();
            
        } catch (error) {
            console.error('Error terminating session:', error);
            showAlert(`Failed to terminate session: ${error.message}`, 'error');
        }
    }
    
    // Handle data download
    function handleDataDownload() {
        showConfirmationModal(
            'Download Your Data',
            'We will prepare a file containing all your data including profile information, settings, and activity. This process may take a few minutes.',
            'Confirm Download',
            async () => {
                try {
                    const token = localStorage.getItem('authToken');
                    if (!token) {
                        throw new Error('Not authenticated');
                    }
                    
                    showAlert('Preparing your data for download...', 'info');
                    
                    const response = await fetch(`${API_BASE_URL}?action=download_data`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                    }
                    
                    // Check if we got JSON or a file
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        // It's an error or status message
                        const data = await response.json();
                        if (!data.success) {
                            throw new Error(data.message || 'Failed to download data');
                        }
                        
                        // It might be an async process
                        showAlert(data.message || 'Your data is being prepared. You will be notified when it\'s ready.', 'success');
                    } else {
                        // It's a file, trigger download
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = 'thinkfinity-user-data.zip';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                    }
                    
                } catch (error) {
                    console.error('Error downloading data:', error);
                    showAlert(`Failed to download data: ${error.message}`, 'error');
                }
            }
        );
    }
    
    // Show delete account modal
    function showDeleteAccountModal() {
        showConfirmationModal(
            'Delete Account',
            'Warning: This action is permanent and cannot be undone. All your data will be permanently deleted.',
            'Delete Account',
            () => deleteAccount(),
            true,
            'delete my account'
        );
    }
    
    // Delete account
    async function deleteAccount() {
        try {
            const confirmInput = document.getElementById('confirmationInput');
            if (!confirmInput || confirmInput.value.toLowerCase() !== 'delete my account') {
                showAlert('Please type "delete my account" to confirm', 'error');
                return;
            }
            
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            const response = await fetch(`${API_BASE_URL}?action=delete_account`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to delete account');
            }
            
            // Clear local storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('themeSettings');
            
            // Show success message and redirect
            showAlert('Your account has been successfully deleted', 'success');
            
            // Redirect to home page after a short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error deleting account:', error);
            showAlert(`Failed to delete account: ${error.message}`, 'error');
        }
    }
    
    // Show confirmation modal
    function showConfirmationModal(title, message, confirmButtonText, onConfirm, requireConfirmation = false, confirmationText = '') {
        // Create modal if it doesn't exist
        if (!document.getElementById('confirmationModal')) {
            const modalHTML = `
                <div class="modal-overlay" id="confirmationModal">
                    <div class="modal">
                        <div class="modal-header">
                            <h3 id="modalTitle"></h3>
                            <button class="modal-close" id="modalClose">&times;</button>
                        </div>
                        <div class="modal-body" id="modalBody">
                            <p id="modalMessage"></p>
                            <div class="confirmation-input" id="confirmationInputContainer" style="display: none;">
                                <label for="confirmationInput">Please type "<span id="confirmationText"></span>" to confirm:</label>
                                <input type="text" id="confirmationInput" class="form-input">
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button class="outlined-btn" id="modalCancel">Cancel</button>
                            <button class="action-btn" id="modalConfirm"></button>
                        </div>
                    </div>
                </div>
            `;
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = modalHTML;
            document.body.appendChild(tempDiv.firstElementChild);
            
            // Add event listeners
            document.getElementById('modalClose').addEventListener('click', closeModal);
            document.getElementById('modalCancel').addEventListener('click', closeModal);
        }
        
        // Update modal content
        const modal = document.getElementById('confirmationModal');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        document.getElementById('modalConfirm').textContent = confirmButtonText;
        
        // Configure confirmation input if required
        const confirmationInputContainer = document.getElementById('confirmationInputContainer');
        if (requireConfirmation) {
            confirmationInputContainer.style.display = 'block';
            document.getElementById('confirmationText').textContent = confirmationText;
            document.getElementById('confirmationInput').value = '';
        } else {
            confirmationInputContainer.style.display = 'none';
        }
        
        // Update confirm button
        const confirmButton = document.getElementById('modalConfirm');
        
        // Remove previous event listeners
        const newConfirmButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
        
        // Add new event listener
        newConfirmButton.addEventListener('click', () => {
            if (onConfirm) onConfirm();
            closeModal();
        });
        
        if (confirmButtonText.toLowerCase().includes('delete')) {
            newConfirmButton.classList.add('danger-btn');
            newConfirmButton.classList.remove('action-btn');
        } else {
            newConfirmButton.classList.add('action-btn');
            newConfirmButton.classList.remove('danger-btn');
        }
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Close modal
    function closeModal() {
        const modal = document.getElementById('confirmationModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Make loadActiveSessions available globally
    window.loadActiveSessions = loadActiveSessions;
});
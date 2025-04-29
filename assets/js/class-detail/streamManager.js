/**
 * Stream Manager
 * Handles class stream messages and activities
 */
const StreamManager = (function() {
    // Get API_BASE_URL from global scope or use default
    const apiBaseUrl = window.API_BASE_URL || '/backend/api/classes.php';
    
    // Load stream content
    async function loadStreamContent(classId) {
        console.log(`Loading stream content for class ID: ${classId}`);
        
        const streamContent = document.getElementById('streamContent');
        if (!streamContent) {
            console.error('Stream content element not found in DOM');
            return;
        }
        
        // Show loading message
        streamContent.innerHTML = '<div class="loading-message">Loading class stream...</div>';
        
        try {
            // Use the recentMessages from the class details we already have
            const classData = window.getClassData();
            console.log('Class data for stream:', classData);
            
            if (classData && classData.recentMessages && classData.recentMessages.length > 0) {
                console.log(`Rendering ${classData.recentMessages.length} stream messages`);
                renderStreamContent(classData.recentMessages);
            } else if (classData) {
                // Try to fetch messages if class data exists but no messages
                console.log('No cached messages, fetching from API');
                
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${apiBaseUrl}?action=get_stream_messages&classId=${classId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.messages) {
                        console.log(`Fetched ${data.messages.length} messages from API`);
                        renderStreamContent(data.messages);
                        
                        // Update class data with fetched messages
                        if (classData) {
                            classData.recentMessages = data.messages;
                            window.setClassData(classData);
                        }
                    } else {
                        // API returned success:false or no messages
                        renderEmptyState();
                    }
                } else {
                    // API request failed, render empty state
                    console.warn('Failed to fetch messages from API, showing empty state');
                    renderEmptyState();
                }
            } else {
                // No class data available yet
                console.warn('Class data not available, showing empty state');
                renderEmptyState();
            }
        } catch (error) {
            console.error('Error loading stream content:', error);
            streamContent.innerHTML = `
                <div class="error-message">
                    <p>Error loading stream content</p>
                    <button class="retry-btn" onclick="StreamManager.loadStreamContent('${classId}')">Retry</button>
                </div>
            `;
        }
    }

    // Render empty state
    function renderEmptyState() {
        const streamContent = document.getElementById('streamContent');
        if (streamContent) {
            streamContent.innerHTML = `
                <div class="empty-state">
                    <p>No messages yet</p>
                    <p>Be the first to post in this class!</p>
                </div>
            `;
        }
    }

    // Render stream content
    function renderStreamContent(messages) {
        const streamContent = document.getElementById('streamContent');
        if (!streamContent) {
            console.error('Stream content element not found when rendering');
            return;
        }
        
        if (!messages || messages.length === 0) {
            renderEmptyState();
            return;
        }
        
        let messagesHTML = '';
        
        messages.forEach(message => {
            const isAnnouncement = message.messageType === 'announcement';
            const messageClass = isAnnouncement ? 'announcement-post' : 'regular-post';
            
            // Format date
            const date = new Date(message.createdAt);
            const formattedDate = date.toLocaleString();
            
            messagesHTML += `
                <div class="stream-post ${messageClass}">
                    <div class="post-header">
                        <div class="post-avatar" style="background-image: url('${message.user && message.user.profileImage ? message.user.profileImage : ''}');">
                            ${(!message.user || !message.user.profileImage) && message.user ? message.user.username.charAt(0).toUpperCase() : ''}
                        </div>
                        <div class="post-meta">
                            <h3>${message.user ? message.user.username : 'Unknown User'}</h3>
                            <span class="post-time">${formattedDate}</span>
                        </div>
                    </div>
                    <div class="post-content">
                        ${message.message || ''}
                    </div>
                </div>
            `;
        });
        
        streamContent.innerHTML = messagesHTML;
    }

    // Post message to class stream
    async function postMessageToStream() {
        const postInput = document.getElementById('postInput');
        if (!postInput) {
            console.error('Post input element not found');
            return;
        }
        
        const message = postInput.value.trim();
        if (!message) {
            UIManager.showAlert('Please enter a message', 'error');
            return;
        }
        
        const token = localStorage.getItem('authToken');
        const classData = window.getClassData();
        
        if (!classData || !classData.id) {
            console.error('Class data not available');
            UIManager.showAlert('Unable to post - class data not loaded', 'error');
            return;
        }
        
        try {
            // Disable input while posting
            postInput.disabled = true;
            const postBtn = document.getElementById('postBtn');
            if (postBtn) postBtn.disabled = true;
            
            console.log(`Posting message to class ${classData.id}: ${message.substring(0, 30)}...`);
            
            const response = await fetch(`${apiBaseUrl}?action=post_message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    classId: classData.id,
                    message: message,
                    messageType: 'chat'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to post message');
            }
            
            console.log('Message posted successfully:', data);
            
            // Clear input
            postInput.value = '';
            
            // Prepend new message to stream
            if (data.messageData) {
                // Add the new message to our cached messages
                if (!classData.recentMessages) classData.recentMessages = [];
                classData.recentMessages.unshift(data.messageData);
                
                // Refresh the stream content
                renderStreamContent(classData.recentMessages);
            } else {
                // Reload stream content if we don't have the new message data
                loadStreamContent(classData.id);
            }
            
        } catch (error) {
            console.error('Error posting message:', error);
            UIManager.showAlert('Failed to post message: ' + error.message, 'error');
        } finally {
            // Re-enable input
            postInput.disabled = false;
            const postBtn = document.getElementById('postBtn');
            if (postBtn) postBtn.disabled = false;
        }
    }

    return {
        loadStreamContent,
        renderStreamContent,
        renderEmptyState,
        postMessageToStream
    };
})();

// Make functions available globally
window.StreamManager = StreamManager;
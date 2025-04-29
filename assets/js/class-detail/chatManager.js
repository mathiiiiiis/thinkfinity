/**
 * Chat Manager
 * Handles chat-related functionality
 */
const ChatManager = (function() {
    let currentChatChannel = 'everyone';
    let currentChatRecipient = null;
    
    // Setup chat interface
    function setupChatInterface(classId) {
        const channelsList = document.getElementById('channelsList');
        const directMessagesList = document.getElementById('directMessagesList');
        
        if (!channelsList || !directMessagesList) return;
        
        // Populate direct messages list with class members
        const classData = window.getClassData();
        if (classData && classData.members) {
            let dmHTML = '';
            
            classData.members.forEach(member => {
                // Don't add the current user to the DM list
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (member.id !== user.id) {
                    dmHTML += `
                        <li data-user-id="${member.id}">${member.username}</li>
                    `;
                }
            });
            
            directMessagesList.innerHTML = dmHTML;
        } else {
            directMessagesList.innerHTML = '<li class="empty-item">No members available</li>';
        }
        
        // Set up channel click events
        setupChannelEvents();
        
        // Set up chat send button
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', sendChatMessage);
        }
        
        // Chat input enter key event
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                }
            });
        }
        
        // Load initial chat messages (everyone channel)
        loadChatMessages(classId, 'everyone');
    }
    
    // Setup channel click events
    function setupChannelEvents() {
        // Chat channel selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('#channelsList li')) {
                const channelItem = e.target.closest('#channelsList li');
                const channel = channelItem.getAttribute('data-channel');
                
                // Update active class
                document.querySelectorAll('#channelsList li, #directMessagesList li').forEach(item => {
                    item.classList.remove('active');
                });
                channelItem.classList.add('active');
                
                // Update chat
                currentChatChannel = channel;
                currentChatRecipient = null;
                updateChatHeader(channel);
                loadChatMessages(window.getClassData().id, channel);
            }
            
            if (e.target.closest('#directMessagesList li')) {
                const dmItem = e.target.closest('#directMessagesList li');
                const userId = dmItem.getAttribute('data-user-id');
                
                if (userId) {
                    // Update active class
                    document.querySelectorAll('#channelsList li, #directMessagesList li').forEach(item => {
                        item.classList.remove('active');
                    });
                    dmItem.classList.add('active');
                    
                    // Update chat
                    currentChatChannel = 'direct';
                    currentChatRecipient = {
                        id: userId,
                        name: dmItem.textContent.trim()
                    };
                    updateChatHeader(dmItem.textContent.trim());
                    loadChatMessages(window.getClassData().id, 'direct', userId);
                }
            }
        });
    }

    // Load chat messages
    async function loadChatMessages(classId, channel, recipientId = null) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        // Show loading message
        chatMessages.innerHTML = '<div class="loading-message">Loading messages...</div>';
        
        const token = localStorage.getItem('authToken');
        
        try {
            let url = `${API_BASE_URL}?action=get_chat_messages&classId=${classId}&channel=${channel}`;
            if (recipientId) {
                url += `&recipientId=${recipientId}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                // If API endpoint not implemented yet, use mock data
                console.log("Using mock data since endpoint may not exist");
                // Generate some mock messages
                const mockMessages = generateMockMessages(channel, recipientId);
                renderChatMessages(mockMessages);
                return;
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load chat messages');
            }
            
            renderChatMessages(data.messages);
            
        } catch (error) {
            console.error('Error loading chat messages:', error);
            chatMessages.innerHTML = `
                <div class="error-message">
                    <p>Error loading messages</p>
                    <button class="retry-btn" onclick="ChatManager.loadChatMessages('${classId}', '${channel}', ${recipientId ? `'${recipientId}'` : 'null'})">Retry</button>
                </div>
            `;
        }
    }

    // Generate mock messages for testing
    function generateMockMessages(channel, recipientId = null) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const messages = [];
        const classData = window.getClassData();
        
        // Create some mock messages
        if (channel === 'direct' && recipientId) {
            const recipient = classData.members.find(m => m.id == recipientId);
            const recipientName = recipient ? recipient.username : 'User';
            
            messages.push({
                id: 1,
                message: `Hello ${user.username}, how can I help you?`,
                messageType: 'chat',
                isPrivate: true,
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                user: {
                    id: recipientId,
                    username: recipientName,
                    profileImage: ''
                }
            });
            
            messages.push({
                id: 2,
                message: `Hi ${recipientName}, I have a question about the assignment.`,
                messageType: 'chat',
                isPrivate: true,
                createdAt: new Date(Date.now() - 3500000).toISOString(),
                user: {
                    id: user.id,
                    username: user.username,
                    profileImage: user.profileImage || ''
                }
            });
        } else {
            // Public channel messages
            messages.push({
                id: 3,
                message: 'Welcome to the class chat!',
                messageType: 'chat',
                isPrivate: false,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                user: {
                    id: classData.teacher.id || '1',
                    username: classData.teacher.name,
                    profileImage: classData.teacher.image || ''
                }
            });
            
            messages.push({
                id: 4,
                message: 'Thank you for the welcome!',
                messageType: 'chat',
                isPrivate: false,
                createdAt: new Date(Date.now() - 82800000).toISOString(),
                user: {
                    id: '3',
                    username: 'Student1',
                    profileImage: ''
                }
            });
            
            messages.push({
                id: 5,
                message: 'Does anyone have the slides from today?',
                messageType: 'chat',
                isPrivate: false,
                createdAt: new Date(Date.now() - 43200000).toISOString(),
                user: {
                    id: '4',
                    username: 'Student2',
                    profileImage: ''
                }
            });
        }
        
        return messages;
    }

    // Render chat messages
    function renderChatMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        if (!messages || messages.length === 0) {
            chatMessages.innerHTML = `
                <div class="empty-chat">
                    <p>No messages yet</p>
                    <p>Start a conversation!</p>
                </div>
            `;
            return;
        }
        
        let messagesHTML = '';
        let currentDate = null;
        
        messages.forEach(message => {
            // Check if this is a new date
            const messageDate = new Date(message.createdAt).toLocaleDateString();
            if (messageDate !== currentDate) {
                messagesHTML += `<div class="chat-date-separator">${messageDate}</div>`;
                currentDate = messageDate;
            }
            
            // Get current user ID
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isOwnMessage = message.user.id === user.id;
            
            // Format time
            const time = new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            messagesHTML += `
                <div class="chat-message ${isOwnMessage ? 'own-message' : ''}">
                    ${!isOwnMessage ? `
                        <div class="message-avatar" style="background-image: url('${message.user.profileImage || ''}');">
                            ${!message.user.profileImage ? message.user.username.charAt(0).toUpperCase() : ''}
                        </div>
                    ` : ''}
                    <div class="message-bubble">
                        ${!isOwnMessage ? `<div class="message-sender">${message.user.username}</div>` : ''}
                        <div class="message-content">${message.message}</div>
                        <div class="message-time">${time}</div>
                    </div>
                </div>
            `;
        });
        
        chatMessages.innerHTML = messagesHTML;
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Send chat message
    async function sendChatMessage() {
        const chatInput = document.getElementById('chatInput');
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (!message) {
            return; // Don't show alert for empty chat messages
        }
        
        const token = localStorage.getItem('authToken');
        const classData = window.getClassData();
        
        try {
            // Disable input while sending
            chatInput.disabled = true;
            document.getElementById('sendBtn').disabled = true;
            
            // Prepare message data
            const messageData = {
                classId: classData.id,
                message: message,
                messageType: 'chat'
            };
            
            // Add recipient ID for direct messages
            if (currentChatChannel === 'direct' && currentChatRecipient) {
                messageData.recipientId = currentChatRecipient.id;
                messageData.isPrivate = true;
            }
            
            const response = await fetch(`${API_BASE_URL}?action=post_message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(messageData)
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to send message');
            }
            
            // Clear input
            chatInput.value = '';
            
            // Refresh chat messages
            loadChatMessages(
                classData.id, 
                currentChatChannel, 
                currentChatChannel === 'direct' ? currentChatRecipient.id : null
            );
            
        } catch (error) {
            console.error('Error sending message:', error);
            UIManager.showAlert('Failed to send message: ' + error.message, 'error');
        } finally {
            // Re-enable input
            chatInput.disabled = false;
            document.getElementById('sendBtn').disabled = false;
        }
    }

    // Update chat header
    function updateChatHeader(title) {
        const chatHeader = document.getElementById('chatHeader');
        if (chatHeader) {
            chatHeader.innerHTML = `<h3>${title}</h3>`;
        }
    }

    return {
        setupChatInterface,
        loadChatMessages,
        sendChatMessage,
        updateChatHeader,
        getCurrentChatChannel: () => currentChatChannel,
        getCurrentChatRecipient: () => currentChatRecipient
    };
})();

// Make functions available globally
window.ChatManager = ChatManager;
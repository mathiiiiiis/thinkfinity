/**
 * Class Page Diagnostic
 * This script provides diagnostic tools to troubleshoot the class page
 */
const ClassPageDiagnostic = (function() {
    // Run diagnostic checks
    function runDiagnostics() {
        console.log('Running class page diagnostics');
        
        // Create diagnostic container
        const container = document.createElement('div');
        container.className = 'diagnostic-container';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.right = '0';
        container.style.bottom = '0';
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        container.style.color = '#fff';
        container.style.padding = '20px';
        container.style.zIndex = '10000';
        container.style.overflow = 'auto';
        container.style.fontFamily = 'monospace';
        
        // Add header
        const header = document.createElement('h2');
        header.textContent = 'Class Page Diagnostic';
        header.style.color = '#4CAF50';
        container.appendChild(header);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close Diagnostic';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '20px';
        closeButton.style.right = '20px';
        closeButton.style.padding = '8px 16px';
        closeButton.style.backgroundColor = '#f44336';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(container);
        });
        container.appendChild(closeButton);
        
        // Add script status section
        const scriptSection = document.createElement('div');
        scriptSection.innerHTML = `<h3>Script Loading Status</h3>`;
        container.appendChild(scriptSection);
        
        // Check script loading
        const scripts = [
            { name: 'config.js', global: window.API_BASE_URL },
            { name: 'uiManager.js', global: window.UIManager },
            { name: 'fileUploader.js', global: window.FileUploader },
            { name: 'classDetailManager.js', global: window.ClassDetailManager },
            { name: 'streamManager.js', global: window.StreamManager },
            { name: 'assignmentManager.js', global: window.AssignmentManager },
            { name: 'membersManager.js', global: window.MembersManager },
            { name: 'chatManager.js', global: window.ChatManager },
            { name: 'main.js', global: window.getClassData }
        ];
        
        const scriptTable = document.createElement('table');
        scriptTable.style.width = '100%';
        scriptTable.style.borderCollapse = 'collapse';
        scriptTable.style.marginBottom = '20px';
        
        // Add table header
        let headerRow = scriptTable.insertRow();
        headerRow.style.backgroundColor = '#333';
        
        let headerCell1 = headerRow.insertCell();
        headerCell1.textContent = 'Script';
        headerCell1.style.padding = '8px';
        headerCell1.style.textAlign = 'left';
        headerCell1.style.borderBottom = '1px solid #ddd';
        
        let headerCell2 = headerRow.insertCell();
        headerCell2.textContent = 'Status';
        headerCell2.style.padding = '8px';
        headerCell2.style.textAlign = 'left';
        headerCell2.style.borderBottom = '1px solid #ddd';
        
        // Check each script
        scripts.forEach(script => {
            const row = scriptTable.insertRow();
            row.style.borderBottom = '1px solid #555';
            
            const nameCell = row.insertCell();
            nameCell.textContent = script.name;
            nameCell.style.padding = '8px';
            
            const statusCell = row.insertCell();
            if (script.global !== undefined) {
                statusCell.textContent = '✅ Loaded';
                statusCell.style.color = '#4CAF50';
            } else {
                statusCell.textContent = '❌ Not loaded';
                statusCell.style.color = '#F44336';
            }
            statusCell.style.padding = '8px';
        });
        
        scriptSection.appendChild(scriptTable);
        
        // Add DOM elements section
        const domSection = document.createElement('div');
        domSection.innerHTML = `<h3>Critical DOM Elements</h3>`;
        container.appendChild(domSection);
        
        // Check critical DOM elements
        const criticalElements = [
            { id: 'classHeader', description: 'Class Header' },
            { id: 'streamTab', description: 'Stream Tab' },
            { id: 'streamContent', description: 'Stream Content' },
            { id: 'assignmentsTab', description: 'Assignments Tab' },
            { id: 'assignmentsList', description: 'Assignments List' },
            { id: 'membersTab', description: 'Members Tab' },
            { id: 'membersList', description: 'Members List' },
            { id: 'chatTab', description: 'Chat Tab' },
            { id: 'chatMessages', description: 'Chat Messages' },
            { id: 'postInput', description: 'Post Input' },
            { id: 'postBtn', description: 'Post Button' }
        ];
        
        const domTable = document.createElement('table');
        domTable.style.width = '100%';
        domTable.style.borderCollapse = 'collapse';
        domTable.style.marginBottom = '20px';
        
        // Add table header
        headerRow = domTable.insertRow();
        headerRow.style.backgroundColor = '#333';
        
        headerCell1 = headerRow.insertCell();
        headerCell1.textContent = 'Element ID';
        headerCell1.style.padding = '8px';
        headerCell1.style.textAlign = 'left';
        headerCell1.style.borderBottom = '1px solid #ddd';
        
        headerCell2 = headerRow.insertCell();
        headerCell2.textContent = 'Description';
        headerCell2.style.padding = '8px';
        headerCell2.style.textAlign = 'left';
        headerCell2.style.borderBottom = '1px solid #ddd';
        
        let headerCell3 = headerRow.insertCell();
        headerCell3.textContent = 'Status';
        headerCell3.style.padding = '8px';
        headerCell3.style.textAlign = 'left';
        headerCell3.style.borderBottom = '1px solid #ddd';
        
        // Check each element
        criticalElements.forEach(element => {
            const el = document.getElementById(element.id);
            
            const row = domTable.insertRow();
            row.style.borderBottom = '1px solid #555';
            
            const idCell = row.insertCell();
            idCell.textContent = element.id;
            idCell.style.padding = '8px';
            
            const descCell = row.insertCell();
            descCell.textContent = element.description;
            descCell.style.padding = '8px';
            
            const statusCell = row.insertCell();
            if (el) {
                const isVisible = !el.classList.contains('hidden') && el.style.display !== 'none';
                statusCell.textContent = isVisible ? '✅ Found & Visible' : '⚠️ Found but Hidden';
                statusCell.style.color = isVisible ? '#4CAF50' : '#FF9800';
            } else {
                statusCell.textContent = '❌ Not Found';
                statusCell.style.color = '#F44336';
            }
            statusCell.style.padding = '8px';
        });
        
        domSection.appendChild(domTable);
        
        // Add tab navigation section
        const tabSection = document.createElement('div');
        tabSection.innerHTML = `<h3>Tab Navigation Buttons</h3>`;
        container.appendChild(tabSection);
        
        const tabButtons = document.querySelectorAll('.class-nav-btn');
        
        if (tabButtons.length > 0) {
            const tabTable = document.createElement('table');
            tabTable.style.width = '100%';
            tabTable.style.borderCollapse = 'collapse';
            tabTable.style.marginBottom = '20px';
            
            // Add table header
            headerRow = tabTable.insertRow();
            headerRow.style.backgroundColor = '#333';
            
            headerCell1 = headerRow.insertCell();
            headerCell1.textContent = 'Button Text';
            headerCell1.style.padding = '8px';
            headerCell1.style.textAlign = 'left';
            headerCell1.style.borderBottom = '1px solid #ddd';
            
            headerCell2 = headerRow.insertCell();
            headerCell2.textContent = 'data-tab Value';
            headerCell2.style.padding = '8px';
            headerCell2.style.textAlign = 'left';
            headerCell2.style.borderBottom = '1px solid #ddd';
            
            headerCell3 = headerRow.insertCell();
            headerCell3.textContent = 'Tab Content Exists';
            headerCell3.style.padding = '8px';
            headerCell3.style.textAlign = 'left';
            headerCell3.style.borderBottom = '1px solid #ddd';
            
            // Check each button
            tabButtons.forEach(button => {
                const row = tabTable.insertRow();
                row.style.borderBottom = '1px solid #555';
                
                const textCell = row.insertCell();
                textCell.textContent = button.textContent.trim();
                textCell.style.padding = '8px';
                
                const dataTabCell = row.insertCell();
                const dataTab = button.getAttribute('data-tab');
                dataTabCell.textContent = dataTab || 'Not set';
                dataTabCell.style.padding = '8px';
                
                const contentCell = row.insertCell();
                const tabContent = dataTab ? document.getElementById(`${dataTab}Tab`) : null;
                if (tabContent) {
                    contentCell.textContent = '✅ Found';
                    contentCell.style.color = '#4CAF50';
                } else {
                    contentCell.textContent = '❌ Not Found';
                    contentCell.style.color = '#F44336';
                }
                contentCell.style.padding = '8px';
            });
            
            tabSection.appendChild(tabTable);
        } else {
            tabSection.innerHTML += '<p style="color: #F44336;">No tab navigation buttons found!</p>';
        }
        
        // Add class data section
        const dataSection = document.createElement('div');
        dataSection.innerHTML = `<h3>Class Data</h3>`;
        container.appendChild(dataSection);
        
        const classData = window.getClassData ? window.getClassData() : null;
        
        if (classData) {
            const dataDiv = document.createElement('div');
            
            // Add basic class info
            dataDiv.innerHTML = `
                <p><strong>Class ID:</strong> ${classData.id || 'Not set'}</p>
                <p><strong>Class Name:</strong> ${classData.name || 'Not set'}</p>
                <p><strong>Teacher:</strong> ${classData.teacher && classData.teacher.name ? classData.teacher.name : 'Not set'}</p>
                <p><strong>Students Count:</strong> ${classData.studentsCount || 'Not set'}</p>
                <p><strong>Has Stream Messages:</strong> ${classData.recentMessages && classData.recentMessages.length > 0 ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Has Members:</strong> ${classData.members && classData.members.length > 0 ? '✅ Yes' : '❌ No'}</p>
            `;
            
            dataSection.appendChild(dataDiv);
            
            // Add view raw data button
            const viewDataBtn = document.createElement('button');
            viewDataBtn.textContent = 'View Raw Class Data';
            viewDataBtn.style.marginTop = '10px';
            viewDataBtn.style.padding = '8px 16px';
            viewDataBtn.style.backgroundColor = '#2196F3';
            viewDataBtn.style.color = 'white';
            viewDataBtn.style.border = 'none';
            viewDataBtn.style.borderRadius = '4px';
            viewDataBtn.style.cursor = 'pointer';
            viewDataBtn.addEventListener('click', () => {
                UIManager.createDebugOutput(classData, 'Raw Class Data');
            });
            dataSection.appendChild(viewDataBtn);
        } else {
            dataSection.innerHTML += '<p style="color: #F44336;">No class data found! This could be the root of the problem.</p>';
        }
        
        // Add user role section
        const roleSection = document.createElement('div');
        roleSection.innerHTML = `<h3>User Information</h3>`;
        container.appendChild(roleSection);
        
        const userRole = window.getUserRole ? window.getUserRole() : null;
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        roleSection.innerHTML += `
            <p><strong>User Role:</strong> ${userRole || 'Not set'}</p>
            <p><strong>User ID:</strong> ${user.id || 'Not set'}</p>
            <p><strong>Username:</strong> ${user.username || 'Not set'}</p>
            <p><strong>Auth Token:</strong> ${localStorage.getItem('authToken') ? '✅ Present' : '❌ Missing'}</p>
        `;
        
        // Add fix buttons
        const fixSection = document.createElement('div');
        fixSection.innerHTML = `<h3>Fix Actions</h3>`;
        container.appendChild(fixSection);
        
        // Reload page button
        const reloadBtn = document.createElement('button');
        reloadBtn.textContent = 'Reload Page';
        reloadBtn.style.marginRight = '10px';
        reloadBtn.style.padding = '8px 16px';
        reloadBtn.style.backgroundColor = '#4CAF50';
        reloadBtn.style.color = 'white';
        reloadBtn.style.border = 'none';
        reloadBtn.style.borderRadius = '4px';
        reloadBtn.style.cursor = 'pointer';
        reloadBtn.addEventListener('click', () => {
            location.reload();
        });
        fixSection.appendChild(reloadBtn);
        
        // Force reload scripts button
        const reloadScriptsBtn = document.createElement('button');
        reloadScriptsBtn.textContent = 'Force Reload Scripts';
        reloadScriptsBtn.style.marginRight = '10px';
        reloadScriptsBtn.style.padding = '8px 16px';
        reloadScriptsBtn.style.backgroundColor = '#FF9800';
        reloadScriptsBtn.style.color = 'white';
        reloadScriptsBtn.style.border = 'none';
        reloadScriptsBtn.style.borderRadius = '4px';
        reloadScriptsBtn.style.cursor = 'pointer';
        reloadScriptsBtn.addEventListener('click', () => {
            forceReloadScripts();
        });
        fixSection.appendChild(reloadScriptsBtn);
        
        // Clear local storage button
        const clearStorageBtn = document.createElement('button');
        clearStorageBtn.textContent = 'Clear Local Storage';
        clearStorageBtn.style.marginRight = '10px';
        clearStorageBtn.style.padding = '8px 16px';
        clearStorageBtn.style.backgroundColor = '#F44336';
        clearStorageBtn.style.color = 'white';
        clearStorageBtn.style.border = 'none';
        clearStorageBtn.style.borderRadius = '4px';
        clearStorageBtn.style.cursor = 'pointer';
        clearStorageBtn.addEventListener('click', () => {
            if (confirm('This will log you out. Continue?')) {
                localStorage.clear();
                location.href = 'index.html';
            }
        });
        fixSection.appendChild(clearStorageBtn);
        
        // Fix tab buttons
        const fixTabsBtn = document.createElement('button');
        fixTabsBtn.textContent = 'Fix Tab Navigation';
        fixTabsBtn.style.marginRight = '10px';
        fixTabsBtn.style.padding = '8px 16px';
        fixTabsBtn.style.backgroundColor = '#2196F3';
        fixTabsBtn.style.color = 'white';
        fixTabsBtn.style.border = 'none';
        fixTabsBtn.style.borderRadius = '4px';
        fixTabsBtn.style.cursor = 'pointer';
        fixTabsBtn.addEventListener('click', () => {
            fixTabNavigation();
        });
        fixSection.appendChild(fixTabsBtn);
        
        // Add to page
        document.body.appendChild(container);
    }
    
    // Fix tab navigation
    function fixTabNavigation() {
        // First check if tabs exist
        const tabs = ['stream', 'assignments', 'members', 'chat'];
        const tabButtons = document.querySelectorAll('.class-nav-btn');
        
        if (tabButtons.length === 0) {
            console.log('No tab buttons found, creating navigation');
            
            // Try to find navigation container
            let navContainer = document.querySelector('.class-nav');
            
            if (!navContainer) {
                // Create nav container
                navContainer = document.createElement('div');
                navContainer.className = 'class-nav';
                
                // Find a good place to insert it
                const classHeader = document.getElementById('classHeader');
                if (classHeader) {
                    classHeader.insertAdjacentElement('afterend', navContainer);
                } else {
                    // If no header, add to top of page
                    const container = document.querySelector('.container') || document.body;
                    container.prepend(navContainer);
                }
            }
            
            // Create tab buttons
            tabs.forEach(tab => {
                const btn = document.createElement('button');
                btn.className = 'class-nav-btn';
                btn.setAttribute('data-tab', tab);
                btn.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
                
                btn.addEventListener('click', () => {
                    if (window.ClassDetailManager) {
                        window.ClassDetailManager.switchTab(tab);
                    } else {
                        switchTab(tab);
                    }
                });
                
                navContainer.appendChild(btn);
            });
        }
        
        // Make sure tab content exists
        tabs.forEach(tab => {
            const tabContent = document.getElementById(`${tab}Tab`);
            
            if (!tabContent) {
                console.log(`Creating missing tab content for: ${tab}`);
                
                const newTabContent = document.createElement('div');
                newTabContent.id = `${tab}Tab`;
                newTabContent.className = 'tab-content';
                
                if (tab !== 'stream') {
                    newTabContent.classList.add('hidden');
                }
                
                // Add appropriate content container
                switch (tab) {
                    case 'stream':
                        newTabContent.innerHTML = `
                            <div id="streamContent" class="stream-content">
                                <div class="empty-state">
                                    <p>No messages yet</p>
                                    <p>Be the first to post in this class!</p>
                                </div>
                            </div>
                            <div class="post-container">
                                <textarea id="postInput" placeholder="Share something with your class..."></textarea>
                                <button id="postBtn">Post</button>
                            </div>
                        `;
                        break;
                    case 'assignments':
                        newTabContent.innerHTML = `
                            <div id="assignmentsList" class="assignments-list">
                                <div class="empty-state">
                                    <p>No assignments yet</p>
                                </div>
                            </div>
                        `;
                        break;
                    case 'members':
                        newTabContent.innerHTML = `
                            <div id="membersList" class="members-list">
                                <div class="empty-state">
                                    <p>No members found</p>
                                </div>
                            </div>
                        `;
                        break;
                    case 'chat':
                        newTabContent.innerHTML = `
                            <div class="chat-container">
                                <div class="chat-sidebar">
                                    <div class="chat-channels">
                                        <h3>Channels</h3>
                                        <ul id="channelsList">
                                            <li data-channel="everyone" class="active">Everyone</li>
                                            <li data-channel="announcements">Announcements</li>
                                        </ul>
                                    </div>
                                    <div class="direct-messages">
                                        <h3>Direct Messages</h3>
                                        <ul id="directMessagesList">
                                            <li class="empty-item">No members available</li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="chat-main">
                                    <div id="chatHeader" class="chat-header">
                                        <h3>Everyone</h3>
                                    </div>
                                    <div id="chatMessages" class="chat-messages">
                                        <div class="empty-chat">
                                            <p>No messages yet</p>
                                            <p>Start a conversation!</p>
                                        </div>
                                    </div>
                                    <div class="chat-input-container">
                                        <textarea id="chatInput" placeholder="Type a message..."></textarea>
                                        <button id="sendBtn">Send</button>
                                    </div>
                                </div>
                            </div>
                        `;
                        break;
                }
                
                // Add to container
                const container = document.querySelector('.container') || document.body;
                container.appendChild(newTabContent);
            }
        });
        
        // Make 'stream' tab active by default
        switchTab('stream');
        
        UIManager.showAlert('Tab navigation fixed!', 'success');
    }
    
    // Simple tab switching for fallback
    function switchTab(tabId) {
        console.log(`Simple switch to tab: ${tabId}`);
        
        // Update active tab button
        const tabButtons = document.querySelectorAll('.class-nav-btn');
        tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Show selected tab content, hide others
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            if (content.id === `${tabId}Tab`) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }
    
    // Force reload scripts
    function forceReloadScripts() {
        const scripts = [
            '/assets/js/config.js',
            '/assets/js/class-detail/uiManager.js',
            '/assets/js/class-detail/fileUploader.js',
            '/assets/js/class-detail/classDetailManager.js',
            '/assets/js/class-detail/streamManager.js',
            '/assets/js/class-detail/assignmentManager.js',
            '/assets/js/class-detail/membersManager.js',
            '/assets/js/class-detail/chatManager.js',
            '/assets/js/class-detail/main.js'
        ];
        
        // Add timestamp to bust cache
        const timestamp = new Date().getTime();
        
        // Remove existing script elements first
        document.querySelectorAll('script').forEach(script => {
            const src = script.getAttribute('src');
            if (src && scripts.some(scriptSrc => src.includes(scriptSrc.replace('/assets', '')))) {
                script.parentNode.removeChild(script);
            }
        });
        
        // Load scripts sequentially with cache busting
        let index = 0;
        function loadNextScript() {
            if (index >= scripts.length) {
                // All scripts loaded
                UIManager.showAlert('Scripts reloaded', 'success');
                setTimeout(() => {
                    location.reload();
                }, 1000);
                return;
            }
            
            const script = document.createElement('script');
            script.src = `${scripts[index]}?t=${timestamp}`;
            
            script.onload = function() {
                index++;
                loadNextScript();
            };
            
            script.onerror = function() {
                console.error(`Failed to load script: ${scripts[index]}`);
                index++;
                loadNextScript();
            };
            
            document.body.appendChild(script);
        }
        
        loadNextScript();
    }
    
    // Add diagnostic button to page
    function addDiagnosticButton() {
        if (document.getElementById('diagnosticBtn')) return; // Already exists
        
        const btn = document.createElement('button');
        btn.id = 'diagnosticBtn';
        btn.textContent = 'Diagnostic';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.left = '20px';
        btn.style.zIndex = '9999';
        btn.style.padding = '8px 16px';
        btn.style.backgroundColor = '#2196F3';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        
        btn.addEventListener('click', runDiagnostics);
        
        document.body.appendChild(btn);
    }
    
    return {
        init: function() {
            console.log('Class Page Diagnostic initialized');
            addDiagnosticButton();
        },
        runDiagnostics,
        fixTabNavigation,
        forceReloadScripts
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Delay initialization to ensure other scripts are loaded
    setTimeout(function() {
        ClassPageDiagnostic.init();
    }, 2000);
});

// Make available globally
window.ClassPageDiagnostic = ClassPageDiagnostic;
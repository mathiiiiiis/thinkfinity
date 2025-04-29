/**
 * Class Detail Loader
 * Loads all the necessary modules for the class detail page
 */

// Load order is important to ensure dependencies are met
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing class detail page');
    
    // First check if API config is already loaded
    if (typeof window.API_BASE_URL === 'undefined') {
        console.warn('API_BASE_URL not found, loading config file first');
    }
    
    // Load scripts in the correct order
    const scripts = [
        '/assets/js/config.js', // Load configuration first
        '/assets/js/class-detail/uiManager.js',
        '/assets/js/class-detail/fileUploader.js',
        '/assets/js/class-detail/classDetailManager.js',
        '/assets/js/class-detail/streamManager.js',
        '/assets/js/class-detail/assignmentManager.js',
        '/assets/js/class-detail/membersManager.js',
        '/assets/js/class-detail/chatManager.js',
        '/assets/js/class-detail/main.js'
    ];
    
    let scriptIndex = 0;
    
    // Function to load scripts sequentially
    function loadNextScript() {
        if (scriptIndex >= scripts.length) {
            // All scripts loaded, initialize the application
            console.log('All class detail modules loaded successfully.');
            initializeApplication();
            return;
        }
        
        const script = document.createElement('script');
        script.src = scripts[scriptIndex];
        
        script.onload = function() {
            console.log(`Loaded: ${scripts[scriptIndex]}`);
            scriptIndex++;
            loadNextScript();
        };
        
        script.onerror = function() {
            console.error(`Failed to load script: ${scripts[scriptIndex]}`);
            scriptIndex++;
            loadNextScript();
        };
        
        document.body.appendChild(script);
    }
    
    // Function to initialize application after all scripts are loaded
    function initializeApplication() {
        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('No auth token found, redirecting to login');
            window.location.href = 'index.html';
            return;
        }
        
        // Get class ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('id');
        
        if (!classId) {
            console.warn('No class ID in URL, redirecting to classes list');
            window.location.href = 'classes.html';
            return;
        }
        
        // Initialize global variables
        window.classData = null;
        window.userRole = 'student';
        
        console.log(`Initializing class page for class ID: ${classId}`);
        
        // Initialize the page
        if (typeof ClassDetailManager !== 'undefined') {
            // Load class details
            ClassDetailManager.loadClassDetails(classId);
            
            // Setup event listeners
            setupEventListeners();
        } else {
            console.error('ClassDetailManager not found! Check script loading.');
        }
    }
    
    // Setup all event listeners
    function setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Tab navigation
        const tabButtons = document.querySelectorAll('.class-nav-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                console.log(`Tab button clicked: ${tabId}`);
                ClassDetailManager.switchTab(tabId);
            });
        });
        
        // Post button click event
        const postBtn = document.getElementById('postBtn');
        if (postBtn) {
            postBtn.addEventListener('click', StreamManager.postMessageToStream);
        } else {
            console.warn('Post button not found in DOM');
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
    }
    
    // Start loading scripts
    loadNextScript();
});
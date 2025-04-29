/**
 * Debug Helper
 * Utility functions for troubleshooting JavaScript issues
 */
const DebugHelper = (function() {
    let isDebugMode = true;
    
    // Initialize debug tools
    function init() {
        console.log('Debug helper initialized');
        
        // Add a global error handler
        window.addEventListener('error', function(event) {
            logError('Uncaught error:', event.error);
        });
        
        // Add a promise rejection handler
        window.addEventListener('unhandledrejection', function(event) {
            logError('Unhandled promise rejection:', event.reason);
        });
        
        // Add a debug button to the page
        addDebugButton();
    }
    
    // Toggle debug mode
    function toggleDebugMode() {
        isDebugMode = !isDebugMode;
        console.log('Debug mode:', isDebugMode ? 'ON' : 'OFF');
        
        const debugBtn = document.getElementById('debugBtn');
        if (debugBtn) {
            debugBtn.textContent = `Debug: ${isDebugMode ? 'ON' : 'OFF'}`;
        }
    }
    
    // Add a debug button
    function addDebugButton() {
        const btn = document.createElement('button');
        btn.id = 'debugBtn';
        btn.textContent = `Debug: ${isDebugMode ? 'ON' : 'OFF'}`;
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.right = '20px';
        btn.style.zIndex = '9999';
        btn.style.padding = '8px 16px';
        btn.style.backgroundColor = '#f44336';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        
        btn.addEventListener('click', function() {
            toggleDebugMode();
            
            // Perform diagnostic checks
            checkDOMElements();
            checkGlobalVariables();
        });
        
        document.body.appendChild(btn);
    }
    
    // Log error with stack trace
    function logError(message, error) {
        if (!isDebugMode) return;
        
        console.error(message, error);
        
        // Create an error notification on the page
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '10px';
        errorDiv.style.left = '10px';
        errorDiv.style.right = '10px';
        errorDiv.style.backgroundColor = 'rgba(244, 67, 54, 0.9)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '10px';
        errorDiv.style.borderRadius = '4px';
        errorDiv.style.zIndex = '9999';
        errorDiv.style.maxHeight = '200px';
        errorDiv.style.overflowY = 'auto';
        
        const errorMsg = document.createElement('p');
        errorMsg.textContent = message + ' ' + (error ? error.message : '');
        errorDiv.appendChild(errorMsg);
        
        if (error && error.stack) {
            const stackTrace = document.createElement('pre');
            stackTrace.textContent = error.stack;
            stackTrace.style.fontSize = '12px';
            stackTrace.style.marginTop = '10px';
            errorDiv.appendChild(stackTrace);
        }
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.marginTop = '10px';
        closeBtn.style.padding = '5px 10px';
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(errorDiv);
        });
        errorDiv.appendChild(closeBtn);
        
        document.body.appendChild(errorDiv);
        
        // Auto-hide after 10 seconds
        setTimeout(function() {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 10000);
    }
    
    // Check critical DOM elements
    function checkDOMElements() {
        console.log('Checking critical DOM elements...');
        
        const criticalElements = [
            { id: 'classHeader', description: 'Class Header' },
            { id: 'streamContent', description: 'Stream Content' },
            { id: 'streamTab', description: 'Stream Tab' },
            { id: 'assignmentsTab', description: 'Assignments Tab' },
            { id: 'membersTab', description: 'Members Tab' },
            { id: 'chatTab', description: 'Chat Tab' },
            { id: 'postInput', description: 'Post Input' },
            { id: 'postBtn', description: 'Post Button' }
        ];
        
        const missingElements = [];
        criticalElements.forEach(element => {
            const el = document.getElementById(element.id);
            if (!el) {
                missingElements.push(element.description);
            }
        });
        
        if (missingElements.length > 0) {
            console.warn('Missing critical DOM elements:', missingElements);
            logError('Missing DOM elements: ' + missingElements.join(', '));
        } else {
            console.log('All critical DOM elements found');
        }
        
        // Check nav buttons
        const tabButtons = document.querySelectorAll('.class-nav-btn');
        console.log(`Found ${tabButtons.length} tab navigation buttons`);
        tabButtons.forEach(btn => {
            console.log(`Button: ${btn.textContent.trim()}, data-tab: ${btn.getAttribute('data-tab')}`);
        });
    }
    
    // Check global variables
    function checkGlobalVariables() {
        console.log('Checking global variables...');
        
        const requiredGlobals = [
            { name: 'API_BASE_URL', obj: window.API_BASE_URL },
            { name: 'ClassDetailManager', obj: window.ClassDetailManager },
            { name: 'StreamManager', obj: window.StreamManager },
            { name: 'AssignmentManager', obj: window.AssignmentManager },
            { name: 'MembersManager', obj: window.MembersManager },
            { name: 'ChatManager', obj: window.ChatManager },
            { name: 'UIManager', obj: window.UIManager },
            { name: 'FileUploader', obj: window.FileUploader },
            { name: 'getClassData()', obj: window.getClassData && window.getClassData() }
        ];
        
        const missingGlobals = [];
        requiredGlobals.forEach(global => {
            if (global.obj === undefined) {
                missingGlobals.push(global.name);
            }
        });
        
        if (missingGlobals.length > 0) {
            console.warn('Missing global variables or functions:', missingGlobals);
            logError('Missing globals: ' + missingGlobals.join(', '));
        } else {
            console.log('All required global variables found');
        }
        
        // Check class data specifically
        const classData = window.getClassData && window.getClassData();
        if (classData) {
            console.log('Class data found:', classData);
        } else {
            console.warn('No class data available');
        }
    }
    
    // Show page structure
    function showPageStructure() {
        console.log('Page structure:');
        const structure = {};
        
        // Get all elements with IDs
        const elementsWithId = document.querySelectorAll('[id]');
        console.log(`Found ${elementsWithId.length} elements with IDs`);
        
        elementsWithId.forEach(el => {
            structure[el.id] = {
                tagName: el.tagName,
                classes: Array.from(el.classList),
                visibility: el.style.display === 'none' || el.classList.contains('hidden') ? 'hidden' : 'visible',
                children: el.children.length
            };
        });
        
        console.table(structure);
    }
    
    return {
        init,
        toggleDebugMode,
        logError,
        checkDOMElements,
        checkGlobalVariables,
        showPageStructure
    };
})();

// Make the debug helper available globally
window.DebugHelper = DebugHelper;

// Initialize debug helper when script is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        DebugHelper.init();
    }, 1000); // Delay initialization to ensure other scripts are loaded
});
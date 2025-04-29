/**
 * UI Manager
 * Handles UI-related functionality and alerts
 */
const UIManager = (function() {
    // Close modal helper
    function closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Show notification alert
    function showAlert(message, type = 'info', duration = 3000) {
        console.log(`Showing ${type} alert: ${message}`);
        
        // First, remove any existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => {
            if (document.body.contains(alert)) {
                document.body.removeChild(alert);
            }
        });
        
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
        
        // Auto-hide after duration
        setTimeout(() => {
            alertElement.style.opacity = '0';
            alertElement.style.transform = 'translateY(-20px)';
            
            // Remove from DOM after animation
            setTimeout(() => {
                if (document.body.contains(alertElement)) {
                    document.body.removeChild(alertElement);
                }
            }, 300);
        }, duration);
    }

    // Format date helper function
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString || 'Invalid date';
        }
    }

    // Format time helper function
    function formatTime(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } catch (error) {
            console.error('Error formatting time:', error);
            return 'Invalid time';
        }
    }

    // Format date and time helper function
    function formatDateTime(dateString) {
        try {
            const date = new Date(dateString);
            return `${formatDate(dateString)} at ${formatTime(dateString)}`;
        } catch (error) {
            console.error('Error formatting date and time:', error);
            return dateString || 'Invalid date/time';
        }
    }

    // Toggle element visibility
    function toggleElementVisibility(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            if (show) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        } else {
            console.warn(`Element with ID "${elementId}" not found for visibility toggle`);
        }
    }
    
    // Create an emergency debug output container
    function createDebugOutput(data, title = 'Debug Information') {
        console.log('Creating debug output:', title);
        
        // Create debug container
        const debugContainer = document.createElement('div');
        debugContainer.className = 'debug-container';
        debugContainer.style.position = 'fixed';
        debugContainer.style.top = '50px';
        debugContainer.style.left = '50px';
        debugContainer.style.right = '50px';
        debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        debugContainer.style.color = 'lime';
        debugContainer.style.padding = '20px';
        debugContainer.style.borderRadius = '5px';
        debugContainer.style.zIndex = '10000';
        debugContainer.style.maxHeight = '80vh';
        debugContainer.style.overflowY = 'auto';
        debugContainer.style.fontFamily = 'monospace';
        
        // Add header
        const header = document.createElement('h3');
        header.textContent = title;
        header.style.margin = '0 0 10px 0';
        debugContainer.appendChild(header);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.padding = '5px 10px';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(debugContainer);
        });
        debugContainer.appendChild(closeButton);
        
        // Add content
        const content = document.createElement('pre');
        content.textContent = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
        debugContainer.appendChild(content);
        
        // Add to page
        document.body.appendChild(debugContainer);
    }
    
    // Inject CSS styles for alerts if they don't exist
    function injectAlertStyles() {
        if (!document.getElementById('ui-manager-styles')) {
            const style = document.createElement('style');
            style.id = 'ui-manager-styles';
            style.innerHTML = `
                .alert {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%) translateY(-20px);
                    padding: 10px 20px;
                    border-radius: 4px;
                    color: white;
                    font-weight: bold;
                    z-index: 9999;
                    opacity: 0;
                    transition: opacity 0.3s, transform 0.3s;
                }
                
                .alert-info {
                    background-color: #2196F3;
                }
                
                .alert-success {
                    background-color: #4CAF50;
                }
                
                .alert-warning {
                    background-color: #FF9800;
                }
                
                .alert-error {
                    background-color: #F44336;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Initialize the UI manager
    function init() {
        console.log('Initializing UI Manager');
        injectAlertStyles();
    }

    return {
        init,
        closeModal,
        showAlert,
        formatDate,
        formatTime,
        formatDateTime,
        toggleElementVisibility,
        createDebugOutput
    };
})();

// Initialize UI Manager when script is loaded
UIManager.init();

// Make functions available globally
window.UIManager = UIManager;
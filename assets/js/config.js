/**
 * Configuration file for API endpoints
 */
const CONFIG = {
    API_BASE_URL: '/backend/api/classes.php',
    UPLOAD_HANDLER_PATH: '/backend/handlers/upload_handler.php'
};

// Make configuration available globally
window.API_BASE_URL = CONFIG.API_BASE_URL;
window.UPLOAD_HANDLER_PATH = CONFIG.UPLOAD_HANDLER_PATH;
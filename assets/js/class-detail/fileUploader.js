/**
 * File Uploader Module
 * Handles file uploads to the server using the upload_handler.php endpoint
 */

const FileUploader = (function() {
    // Use the global config or default if not defined
    const UPLOAD_HANDLER_PATH = window.UPLOAD_HANDLER_PATH || '/backend/handlers/upload_handler.php';
    
    /**
     * Upload a file to the server
     * @param {File} file - The file object to upload
     * @param {string} userId - User ID for file naming
     * @returns {Promise<string>} - URL of the uploaded file
     */
    async function uploadFile(file, userId) {
        if (!file || !userId) {
            throw new Error('File and userId are required');
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);
        
        try {
            console.log('Uploading file:', file.name);
            const response = await fetch(`${UPLOAD_HANDLER_PATH}?action=upload_file`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to upload file');
            }
            
            console.log('File uploaded successfully:', data.url);
            return data.url;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }
    
    /**
     * Upload a base64 encoded image
     * @param {string} base64Image - Base64 encoded image data
     * @param {string} userId - User ID for file naming
     * @param {string} fileExtension - File extension (default: png)
     * @returns {Promise<string>} - URL of the uploaded image
     */
    async function uploadBase64Image(base64Image, userId, fileExtension = 'png') {
        if (!base64Image || !userId) {
            throw new Error('Image data and userId are required');
        }
        
        try {
            console.log('Uploading base64 image for user:', userId);
            const response = await fetch(`${UPLOAD_HANDLER_PATH}?action=upload_base64`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: base64Image,
                    userId: userId,
                    fileExtension: fileExtension
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to upload image');
            }
            
            console.log('Image uploaded successfully:', data.url);
            return data.url;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }
    
    /**
     * Delete a file from the server
     * @param {string} fileUrl - URL of the file to delete
     * @returns {Promise<boolean>} - Success/failure
     */
    async function deleteFile(fileUrl) {
        if (!fileUrl) {
            throw new Error('File URL is required');
        }
        
        try {
            console.log('Deleting file:', fileUrl);
            const response = await fetch(`${UPLOAD_HANDLER_PATH}?action=delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileUrl: fileUrl
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to delete file');
            }
            
            console.log('File deleted successfully');
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }
    
    return {
        uploadFile,
        uploadBase64Image,
        deleteFile
    };
})();

// Make the module available globally
window.FileUploader = FileUploader;
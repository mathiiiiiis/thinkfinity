document.addEventListener('DOMContentLoaded', () => {
    const userProfileSection = document.getElementById('userProfileSection');
    const authButtonsSection = document.getElementById('authButtonsSection');
    const userProfilePic = document.getElementById('userProfilePic');
    const userDisplayName = document.getElementById('userDisplayName');
    
    // Modal elements
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const closeBtns = document.querySelectorAll('.close');
    const switchToRegister = document.getElementById('switchToRegister');
    
    // Registration step elements
    const registerStep1 = document.getElementById('registerStep1');
    const registerStep2 = document.getElementById('registerStep2');
    const registerStep3 = document.getElementById('registerStep3');
    const step1NextBtn = document.getElementById('step1NextBtn');
    const step2NextBtn = document.getElementById('step2NextBtn');
    const step2BackBtn = document.getElementById('step2BackBtn');
    const step3BackBtn = document.getElementById('step3BackBtn');
    const registerFinishBtn = document.getElementById('registerFinishBtn');
    
    // Form elements
    const loginForm = document.getElementById('loginForm');
    const profileUpload = document.getElementById('profileUpload');
    const profilePreview = document.getElementById('profilePreview');
    const logoutBtn = document.getElementById('logoutBtn');

    const API_BASE_URL = '/backend/auth.php';
    const UPLOAD_HANDLER_PATH = '/backend/handlers/upload_handler.php';

    // Check if user is logged in
    checkAuthStatus();

    // Event Listeners for Modals
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (loginModal) loginModal.style.display = 'block';
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            if (registerModal) {
                registerModal.style.display = 'block';
                showRegisterStep(1);
            }
        });
    }

    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginModal) loginModal.style.display = 'none';
            if (registerModal) {
                registerModal.style.display = 'block';
                showRegisterStep(1);
            }
        });
    }    

    if (closeBtns && closeBtns.length) {
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (loginModal) loginModal.style.display = 'none';
                if (registerModal) registerModal.style.display = 'none';
            });
        });
    }

    // Close modal when clicking outside the modal content
    window.addEventListener('click', (e) => {
        if (loginModal && e.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (registerModal && e.target === registerModal) {
            registerModal.style.display = 'none';
        }
    });

    // Registration step navigation
    if (step1NextBtn) {
        step1NextBtn.addEventListener('click', () => {
            const username = document.getElementById('registerUsername')?.value;
            const email = document.getElementById('registerEmail')?.value;
            
            if (!username || !email) {
                showAlert('Please fill in all fields', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showAlert('Please enter a valid email address', 'error');
                return;
            }
            
            showRegisterStep(2);
        });
    }

    if (step2BackBtn) {
        step2BackBtn.addEventListener('click', () => {
            showRegisterStep(1);
        });
    }

    if (step2NextBtn) {
        step2NextBtn.addEventListener('click', () => {
            const password = document.getElementById('registerPassword')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;
            
            if (!password || !confirmPassword) {
                showAlert('Please fill in all fields', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showAlert('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 8) {
                showAlert('Password should be at least 8 characters long', 'error');
                return;
            }
            
            showRegisterStep(3);
        });
    }

    if (step3BackBtn) {
        step3BackBtn.addEventListener('click', () => {
            showRegisterStep(2);
        });
    }

    // Profile picture upload
    if (profileUpload) {
        profileUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && profilePreview) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    profilePreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;
            
            try {
                const response = await fetch(`${API_BASE_URL}?action=login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Save user info and token
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Update UI
                    checkAuthStatus();
                    if (loginModal) loginModal.style.display = 'none';
                    
                    // Clear form
                    loginForm.reset();
                    
                    showAlert('Login successful', 'success');
                } else {
                    showAlert(data.message, 'error');
                }
            } catch (error) {
                showAlert('Login failed. Please try again later.', 'error');
                console.error('Login error:', error);
            }
        });
    }

    // Registration completion
    if (registerFinishBtn) {
        registerFinishBtn.addEventListener('click', async () => {
            const username = document.getElementById('registerUsername')?.value;
            const email = document.getElementById('registerEmail')?.value;
            const password = document.getElementById('registerPassword')?.value;
            const profileImage = profilePreview?.src;
            
            try {
                // Show a progress indicator
                showAlert('Creating your account...', 'info');
                
                // Add a flag to track whether we should attempt image upload
                const shouldUploadImage = profileImage && profileImage !== 'assets/pictures/default-profile.png';
                
                // Variable to store profile image URL
                let profileImageUrl = null;
                let skipImageUpload = false;
                
                // Attempt to upload the profile image if one was selected
                if (shouldUploadImage) {
                    try {
                        // Generate a temporary UUID for the upload
                        const tempUuid = Array.from(Array(13), () => 
                            Math.floor(Math.random() * 36).toString(36)).join('');
                        
                        console.log(`Attempting to upload to: ${UPLOAD_HANDLER_PATH}`);
                        
                        const uploadResponse = await fetch(`${UPLOAD_HANDLER_PATH}?action=upload_base64`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                image: profileImage,
                                userId: tempUuid
                            }),
                        });
                        
                        // Check if the response is JSON
                        const contentType = uploadResponse.headers.get("content-type");
                        if (contentType && contentType.includes("application/json")) {
                            const uploadData = await uploadResponse.json();
                            if (uploadData.success) {
                                profileImageUrl = uploadData.url;
                                console.log('Upload successful');
                            } else {
                                throw new Error(uploadData.message || 'Failed to upload profile image');
                            }
                        } else {
                            // Non-JSON response
                            const text = await uploadResponse.text();
                            console.error('Non-JSON response from upload handler:', text);
                            throw new Error('Server returned an invalid response format');
                        }
                    } catch (uploadError) {
                        console.error('Profile image upload error:', uploadError);
                        
                        // Ask the user if they want to continue without a profile picture
                        if (confirm('Profile image upload failed. Do you want to create your account without a profile picture?')) {
                            skipImageUpload = true;
                        } else {
                            showAlert('Registration cancelled', 'info');
                            return;
                        }
                    }
                }
                
                // FIXED: Log data before sending
                console.log('Sending registration data to:', `${API_BASE_URL}?action=register`);
                
                // Register the user with the image URL (if any)
                const response = await fetch(`${API_BASE_URL}?action=register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username,
                        email,
                        password,
                        profileImage: profileImageUrl,
                        skipImageUpload: skipImageUpload
                    }),
                });
                
                // Enhanced error handling for non-JSON responses
                try {
                    // First get the response text
                    const responseText = await response.text();
                    console.log('Raw response:', responseText);
                    
                    let data;
                    
                    try {
                        // Try to parse as JSON
                        data = JSON.parse(responseText);
                    } catch (jsonError) {
                        console.error('JSON parse error:', jsonError);
                        console.error('Raw response that caused the error:', responseText);
                        
                        // FIXED: Check for common HTTP status errors
                        if (response.status === 404) {
                            throw new Error('Registration API endpoint not found (404). Check if auth.php exists at the server root.');
                        } else if (response.status === 400) {
                            throw new Error(`Bad request (400): ${responseText.substring(0, 100)}`);
                        } else {
                            throw new Error(`Server returned an invalid JSON response (HTTP status ${response.status})`);
                        }
                    }
                    
                    if (data.success) {
                        // Save user info and token
                        localStorage.setItem('authToken', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        
                        // Update UI
                        checkAuthStatus();
                        if (registerModal) registerModal.style.display = 'none';
                        
                        showAlert(`Welcome to Thinfinity, ${username}!`, 'success');
                    } else {
                        showAlert(data.message, 'error');
                    }
                } catch (parseError) {
                    console.error('Error parsing registration response:', parseError);
                    showAlert(`Registration failed: ${parseError.message}`, 'error');
                }
            } catch (error) {
                showAlert(`Registration failed: ${error.message}`, 'error');
                console.error('Registration error:', error);
            }
        });
    }
    
    // Logout event
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const token = localStorage.getItem('authToken');
            
            if (token) {
                try {
                    const response = await fetch(`${API_BASE_URL}?action=logout`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ token }),
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('user');
                        checkAuthStatus();
                        showAlert('Logout successful', 'success');
                    } else {
                        showAlert(data.message, 'error');
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                }
            } else {
                localStorage.removeItem('user');
                checkAuthStatus();
            }
        });
    }

    // Helper functions
    function showRegisterStep(step) {
        if (!registerStep1 || !registerStep2 || !registerStep3) return;
        
        registerStep1.style.display = step === 1 ? 'block' : 'none';
        registerStep2.style.display = step === 2 ? 'block' : 'none';
        registerStep3.style.display = step === 3 ? 'block' : 'none';
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Authentication functions
    async function checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        
        if (token) {
            try {
                const response = await fetch(`${API_BASE_URL}?action=verify`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token }),
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Update user data from server
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    const userData = data.user;
                    if (userDisplayName) userDisplayName.textContent = userData.username;
                    
                    // Fix for profile image path
                    if (userProfilePic) {
                        if (userData.profileImage) {
                            // Check if the profile image is a full URL or just a path
                            if (userData.profileImage.startsWith('http://') || userData.profileImage.startsWith('https://')) {
                                userProfilePic.src = userData.profileImage;
                            } else {
                                // Append to base URL if it's a relative path
                                userProfilePic.src = `/${userData.profileImage.replace(/^\//, '')}`;
                            }
                        } else {
                            userProfilePic.src = 'assets/pictures/default-profile.png';
                        }
                    }
                    
                    if (userProfileSection) userProfileSection.style.display = 'block';
                    if (authButtonsSection) authButtonsSection.style.display = 'none';
                } else {
                    // Token is invalid or expired
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    if (userProfileSection) userProfileSection.style.display = 'none';
                    if (authButtonsSection) authButtonsSection.style.display = 'flex';
                }
            } catch (error) {
                console.error('Auth verification error:', error);
                if (userProfileSection) userProfileSection.style.display = 'none';
                if (authButtonsSection) authButtonsSection.style.display = 'flex';
            }
        } else if (user) {
            // Fallback to local storage if token is missing
            const userData = JSON.parse(user);
            if (userDisplayName) userDisplayName.textContent = userData.username;
            
            if (userProfilePic) {
                if (userData.profileImage) {
                    if (userData.profileImage.startsWith('http://') || userData.profileImage.startsWith('https://')) {
                        userProfilePic.src = userData.profileImage;
                    } else {
                        userProfilePic.src = `/${userData.profileImage.replace(/^\//, '')}`;
                    }
                } else {
                    userProfilePic.src = 'assets/pictures/default-profile.png';
                }
            }
            
            if (userProfileSection) userProfileSection.style.display = 'block';
            if (authButtonsSection) authButtonsSection.style.display = 'none';
        } else {
            if (userProfileSection) userProfileSection.style.display = 'none';
            if (authButtonsSection) authButtonsSection.style.display = 'flex';
        }
    }

    // Create notification alert
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
});
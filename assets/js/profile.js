document.addEventListener('DOMContentLoaded', () => {
    const userDisplayName = document.querySelectorAll('[id="userDisplayName"]');
    const profileTagline = document.getElementById('profileTagline');
    const userProfilePic = document.querySelectorAll('[id="userProfilePic"]');
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    const editProfileModal = document.getElementById('editProfileModal');
    const closeEditModal = editProfileModal.querySelector('.close');
    const editProfileForm = document.getElementById('editProfileForm');
    const editUsername = document.getElementById('editUsername');
    const editTagline = document.getElementById('editTagline');
    const editBio = document.getElementById('editBio');
    const uploadImageModal = document.getElementById('uploadImageModal');
    const closeUploadModal = uploadImageModal.querySelector('.close');
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const confirmUploadBtn = document.getElementById('confirmUploadBtn');
    const cancelUploadBtn = document.getElementById('cancelUploadBtn');
    const editProfilePictureBtn = document.querySelector('.edit-profile-picture-btn');
    const editCoverBtn = document.querySelector('.edit-cover-btn');
    
    // Tab elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // API Endpoints
    const API_BASE_URL = '/backend/api/profile.php';
    const UPLOAD_HANDLER_PATH = '/backend/handlers/upload_handler.php';
    
    // Debug flag
    const DEBUG = true;
    
    // Helper Functions
    function getUserData() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    async function loadUserProfile() {
        const userData = getUserData();
        
        // Update username display
        if (userData) {
            userDisplayName.forEach(el => {
                el.textContent = userData.username || 'Guest';
                if (DEBUG) console.log('Updated display name to:', el.textContent);
            });
        }
        
        // Update profile picture
        if (userProfilePic && userData) {
            userProfilePic.forEach(el => {
                el.src = userData.profileImage || 'assets/pictures/default-profile.png';
                if (DEBUG) console.log('Updated profile picture to:', el.src);
            });
        }
            
        // Fetch additional profile data
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                if (DEBUG) console.log('No auth token found');
                throw new Error('Not authenticated');
            }
            
            if (DEBUG) console.log('Fetching profile data from API');
            const response = await fetch(`${API_BASE_URL}?action=get_profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
            });
            
            const data = await response.json();
            if (DEBUG) console.log('Profile API response:', data);
            
            if (data.success) {
                // Update tagline and other profile data
                if (profileTagline) {
                    profileTagline.textContent = data.profile.tagline || 'Learning enthusiast';
                    if (DEBUG) console.log('Updated tagline to:', profileTagline.textContent);
                }
                
                if (editBio) {
                    editBio.value = data.profile.bio || '';
                    if (DEBUG) console.log('Updated bio field');
                }
                
                // Prefill the edit form
                if (editUsername && userData) {
                    editUsername.value = userData.username || '';
                }
                
                if (editTagline) {
                    editTagline.value = data.profile.tagline || 'Learning enthusiast';
                }
            } else {
                if (DEBUG) console.log('API returned error:', data.message);
                // Still show default values if API fails
                if (profileTagline) {
                    profileTagline.textContent = 'Learning enthusiast';
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            // Still show default values if API fails
            if (profileTagline) {
                profileTagline.textContent = 'Learning enthusiast';
            }
        }
    }
    
    async function updateUserProfile(userData) {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Not authenticated');
        
        const response = await fetch(`${API_BASE_URL}?action=update_profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token,
                ...userData
            }),
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Update failed');
        }
        
        // Update local user data if username changed
        if (userData.username) {
            const localUser = getUserData();
            if (localUser) {
                localUser.username = userData.username;
                localStorage.setItem('user', JSON.stringify(localUser));
            }
            
            // Fix: Update all username displays
            userDisplayName.forEach(el => {
                el.textContent = userData.username;
            });
        }
        
        if (userData.tagline && profileTagline) {
            profileTagline.textContent = userData.tagline;
        }
        
        if (userData.profileImage) {
            const localUser = getUserData();
            if (localUser) {
                localUser.profileImage = userData.profileImage;
                localStorage.setItem('user', JSON.stringify(localUser));
                
                // Update all profile pictures
                userProfilePic.forEach(el => {
                    el.src = userData.profileImage;
                });
            }
        }
        
        return data;
    }
    
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

    loadUserProfile();

    editProfileBtn.addEventListener('click', () => {
        // Populate form with current values
        const userData = getUserData();
        if (userData) {
            editUsername.value = userData.username || '';
            editTagline.value = profileTagline.textContent || '';
            // Bio would be loaded from API
        }
        editProfileModal.style.display = 'block';
    });
    
    closeEditModal.addEventListener('click', () => {
        editProfileModal.style.display = 'none';
    });
    
    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userData = {
            username: editUsername.value,
            tagline: editTagline.value,
            bio: editBio.value
        };
        
        try {
            await updateUserProfile(userData);
            editProfileModal.style.display = 'none';
            showAlert('Profile updated successfully', 'success');
        } catch (error) {
            showAlert('Failed to update profile: ' + error.message, 'error');
        }
    });
    
    // Profile picture upload
    editProfilePictureBtn.addEventListener('click', () => {
        const profilePicSrc = userProfilePic.length > 0 ? userProfilePic[0].src : 'assets/pictures/default-profile.png';
        imagePreview.src = profilePicSrc;
        uploadImageModal.style.display = 'block';
    });
    
    closeUploadModal.addEventListener('click', () => {
        uploadImageModal.style.display = 'none';
    });
    
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    confirmUploadBtn.addEventListener('click', async () => {
        const profilePicSrc = userProfilePic.length > 0 ? userProfilePic[0].src : 'assets/pictures/default-profile.png';
        if (imagePreview.src === profilePicSrc) {
            uploadImageModal.style.display = 'none';
            return;
        }
        
        try {
            const userData = getUserData();
            if (!userData || !userData.uuid) {
                throw new Error('User data not available');
            }
            
            const response = await fetch(`${UPLOAD_HANDLER_PATH}?action=upload_base64`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imagePreview.src,
                    userId: userData.uuid
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                await updateUserProfile({ profileImage: data.url });
                // Update all profile pictures
                userProfilePic.forEach(el => {
                    el.src = data.url;
                });
                uploadImageModal.style.display = 'none';
                showAlert('Profile picture updated successfully', 'success');
            } else {
                throw new Error(data.message || 'Failed to upload image');
            }
        } catch (error) {
            showAlert('Failed to update profile picture: ' + error.message, 'error');
        }
    });
    
    cancelUploadBtn.addEventListener('click', () => {
        uploadImageModal.style.display = 'none';
    });
    
    // Cover image upload
    editCoverBtn.addEventListener('click', () => {
        showAlert('Cover image upload not implemented in this version', 'info');
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
});
document.addEventListener('DOMContentLoaded', () => {
    const settingsUsername = document.getElementById('settingsUsername');
    const settingsUserPic = document.getElementById('settingsUserPic');
    const settingsNavItems = document.querySelectorAll('.settings-nav-item');
    const settingsPanels = document.querySelectorAll('.settings-panel');
    const accountSettingsForm = document.getElementById('accountSettingsForm');
    const securitySettingsForm = document.getElementById('securitySettingsForm');
    const fullNameInput = document.getElementById('fullName');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const countrySelect = document.getElementById('country');
    const educationSelect = document.getElementById('education');
    const fieldInput = document.getElementById('field');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const updatePasswordBtn = document.querySelector('#security-panel .action-btn');
    
    // Theme controls
    const themeOptions = document.querySelectorAll('.theme-option');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const colorOptions = document.querySelectorAll('.color-option');
    const applyAppearanceBtn = document.querySelector('#appearance-panel .submit-btn');
    
    // API Endpoints
    const API_BASE_URL = '/backend/api/settings.php';
    
    // Debug flag
    const DEBUG = true;
    
    // Define education options by country
    const educationOptions = {
        // German education options
        'de': [
            { value: 'hauptschule', label: 'Hauptschulabschluss' },
            { value: 'realschule', label: 'Realschulabschluss (Mittlere Reife)' },
            { value: 'abitur', label: 'Abitur/Fachabitur' },
            { value: 'ausbildung', label: 'Abgeschlossene Berufsausbildung' },
            { value: 'bachelor', label: 'Bachelor' },
            { value: 'master', label: 'Master/Diplom/Magister' },
            { value: 'promotion', label: 'Promotion (Doktortitel)' },
            { value: 'other', label: 'Sonstiges' }
        ],
        // Default education options for other countries
        'default': [
            { value: 'high-school', label: 'High School' },
            { value: 'associate', label: 'Associate Degree' },
            { value: 'bachelor', label: 'Bachelor\'s Degree' },
            { value: 'master', label: 'Master\'s Degree' },
            { value: 'phd', label: 'PhD or Doctorate' },
            { value: 'other', label: 'Other' }
        ]
    };
    
    // Function to update education options based on selected country
    function updateEducationOptions(country) {
        // Clear existing options
        educationSelect.innerHTML = '';
        
        // Get appropriate options list based on country
        const options = educationOptions[country] || educationOptions['default'];
        
        // Add options to select element
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            educationSelect.appendChild(optionElement);
        });
    }
    
    // Initialize settings
    loadUserSettings();
    
    // Event Listeners for Settings Navigation
    if (settingsNavItems && settingsNavItems.length) {
        settingsNavItems.forEach(item => {
            item.addEventListener('click', () => {
                settingsNavItems.forEach(i => i.classList.remove('active'));
                if (settingsPanels && settingsPanels.length) {
                    settingsPanels.forEach(p => p.classList.remove('active'));
                }
                
                item.classList.add('active');
                const tabId = item.getAttribute('data-tab');
                const panel = document.getElementById(`${tabId}-panel`);
                if (panel) panel.classList.add('active');
            });
        });
    }
    
    // Event listener for country change
    if (countrySelect) {
        countrySelect.addEventListener('change', () => {
            updateEducationOptions(countrySelect.value);
        });
    }
    
    // Account Settings Form Submission
    if (accountSettingsForm) {
        accountSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userData = {
                fullName: fullNameInput ? fullNameInput.value : '',
                username: usernameInput ? usernameInput.value : '',
                email: emailInput ? emailInput.value : '',
                phone: phoneInput ? phoneInput.value : '',
                country: countrySelect ? countrySelect.value : 'us',
                education: educationSelect ? educationSelect.value : 'high-school',
                field: fieldInput ? fieldInput.value : ''
            };
            
            try {
                await updateUserSettings(userData);
                showAlert('Account settings updated successfully', 'success');
            } catch (error) {
                showAlert('Failed to update account settings: ' + error.message, 'error');
            }
        });
    }
    
    // Password Update
    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', async () => {
            if (!currentPasswordInput || !currentPasswordInput.value) {
                showAlert('Please enter your current password', 'error');
                return;
            }
            
            if (!newPasswordInput || !newPasswordInput.value) {
                showAlert('Please enter a new password', 'error');
                return;
            }
            
            if (!confirmNewPasswordInput || newPasswordInput.value !== confirmNewPasswordInput.value) {
                showAlert('New passwords do not match', 'error');
                return;
            }
            
            try {
                await updatePassword(
                    currentPasswordInput.value,
                    newPasswordInput.value
                );
                
                // Clear password fields
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                if (confirmNewPasswordInput) confirmNewPasswordInput.value = '';
                
                showAlert('Password updated successfully', 'success');
            } catch (error) {
                showAlert('Failed to update password: ' + error.message, 'error');
            }
        });
    }
    
    // Theme Options
    if (themeOptions && themeOptions.length) {
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                themeOptions.forEach(o => o.classList.remove('active'));
                option.classList.add('active');
            });
        });
    }
    
    // Color Options
    if (colorOptions && colorOptions.length) {
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                colorOptions.forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                
                // Immediately apply the color for preview
                const color = option.getAttribute('data-color');
                document.body.style.setProperty('--primary-color', color);
                document.body.style.setProperty('--primary-hover', adjustColorBrightness(color, -10));
            });
        });
    }
    
    // Helper function to adjust color brightness for hover states
    function adjustColorBrightness(hex, percent) {
        // Convert hex to RGB
        let r = parseInt(hex.substring(1, 3), 16);
        let g = parseInt(hex.substring(3, 5), 16);
        let b = parseInt(hex.substring(5, 7), 16);
        
        // Adjust brightness
        r = Math.max(0, Math.min(255, r + percent));
        g = Math.max(0, Math.min(255, g + percent));
        b = Math.max(0, Math.min(255, b + percent));
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    // Apply Appearance Settings
    if (applyAppearanceBtn) {
        applyAppearanceBtn.addEventListener('click', async () => {
            const activeTheme = document.querySelector('.theme-option.active');
            const activeColor = document.querySelector('.color-option.active');
            
            if (!activeTheme || !activeColor) {
                showAlert('Please select theme and color options', 'error');
                return;
            }
            
            const appearanceSettings = {
                theme: activeTheme.getAttribute('data-theme'),
                fontSize: fontSizeSlider ? fontSizeSlider.value : 100,
                accentColor: activeColor.getAttribute('data-color')
            };
            
            try {
                // Save to localStorage for client-side
                localStorage.setItem('themeSettings', JSON.stringify(appearanceSettings));
                
                // Apply settings and update on server
                applyThemeSettings(appearanceSettings);
                await updateUserSettings(appearanceSettings);
                
                showAlert('Appearance settings applied and saved', 'success');
            } catch (error) {
                applyThemeSettings(appearanceSettings);
                showAlert('Applied settings locally, but failed to save to server: ' + error.message, 'warning');
            }
        });
    }
    
    // Password strength meter
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', () => {
            updatePasswordStrength(newPasswordInput.value);
        });
    }
    
    // Helper Functions
    function getUserData() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }
    
    async function loadUserSettings() {
        const userData = getUserData();
        if (!userData) {
            window.location.href = 'index.html'; // Redirect if not logged in
            return;
        }
        
        if (DEBUG) console.log('Loading settings with user data:', userData);
        
        // Update username and profile picture in sidebar
        if (settingsUsername) {
            settingsUsername.textContent = userData.username || 'Username';
            if (DEBUG) console.log('Updated settings username to:', settingsUsername.textContent);
        }
        
        if (settingsUserPic) {
            settingsUserPic.src = userData.profileImage || 'assets/pictures/default-profile.png';
            if (DEBUG) console.log('Updated settings profile picture to:', settingsUserPic.src);
        }
        
        // First apply any saved theme settings from localStorage
        loadAppearanceSettings();
        
        // Fetch additional user data from API
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                if (DEBUG) console.log('No auth token found');
                throw new Error('Not authenticated');
            }
            
            if (DEBUG) console.log('Fetching settings data from API');
            
            // Make sure API endpoint directory exists
            if (DEBUG) console.log('API path:', API_BASE_URL);
            
            const response = await fetch(`${API_BASE_URL}?action=get_settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Added Authorization header
                },
                body: JSON.stringify({ token }),
            });
            
            // Get response as text first
            const responseText = await response.text();
            
            if (DEBUG) console.log('API raw response:', responseText ? responseText.substring(0, 100) + '...' : 'Empty response');
            
            // Try to parse JSON regardless of response status
            let data;
            try {
                data = JSON.parse(responseText);
                if (DEBUG) console.log('Settings API response parsed:', data);
            } catch (e) {
                if (DEBUG) console.error('Failed to parse API response as JSON:', e);
                throw new Error('Invalid JSON response from API');
            }
            
            // Check for success in data (even if HTTP status is not 200)
            if (data && data.success) {
                // Populate account settings form
                if (fullNameInput) {
                    fullNameInput.value = data.settings.fullName || '';
                    if (DEBUG) console.log('Updated fullName to:', fullNameInput.value);
                }
                if (usernameInput) {
                    usernameInput.value = userData.username || '';
                    if (DEBUG) console.log('Updated username to:', usernameInput.value);
                }
                if (emailInput) {
                    emailInput.value = userData.email || '';
                    if (DEBUG) console.log('Updated email to:', emailInput.value);
                }
                if (phoneInput) {
                    phoneInput.value = data.settings.phone || '';
                    if (DEBUG) console.log('Updated phone to:', phoneInput.value);
                }
                if (countrySelect) {
                    countrySelect.value = data.settings.country || 'us';
                    if (DEBUG) console.log('Updated country to:', countrySelect.value);
                    
                    // Update education options based on country
                    updateEducationOptions(countrySelect.value);
                }
                if (educationSelect) {
                    educationSelect.value = data.settings.education || 'high-school';
                    if (DEBUG) console.log('Updated education to:', educationSelect.value);
                }
                if (fieldInput) {
                    fieldInput.value = data.settings.field || '';
                    if (DEBUG) console.log('Updated field to:', fieldInput.value);
                }
                
                // Update appearance settings from server
                const serverThemeSettings = {
                    theme: data.settings.theme || 'light',
                    fontSize: data.settings.fontSize || 100,
                    accentColor: data.settings.accentColor || '#4a6cf7'
                };
                
                // Only update appearance UI if we don't have local settings
                if (!localStorage.getItem('themeSettings')) {
                    updateAppearanceUI(serverThemeSettings);
                }
            } else {
                if (DEBUG) console.log('API returned error or invalid data format:', data.message || 'No error message');
                // Fallback to local data if API returns error
                fallbackToLocalData(userData);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            if (DEBUG) console.log('Falling back to local data due to error');
            fallbackToLocalData(userData);
        }
    }
    
    function fallbackToLocalData(userData) {
        // Fallback to local data
        if (usernameInput) usernameInput.value = userData.username || '';
        if (emailInput) emailInput.value = userData.email || '';
        
        // Set other fields to empty or default values
        if (fullNameInput) fullNameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (countrySelect) {
            countrySelect.value = 'us';
            // Update education options based on country
            updateEducationOptions(countrySelect.value);
        }
        if (educationSelect) educationSelect.value = 'high-school';
        if (fieldInput) fieldInput.value = '';
    }
    
    async function updateUserSettings(userData) {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Not authenticated');
        
        // Debug the data being sent
        if (DEBUG) console.log('Updating settings with data:', userData);
        
        const response = await fetch(`${API_BASE_URL}?action=update_settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token,
                settings: userData
            }),
        });
        
        // Handle non-OK responses
        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }
        
        const responseText = await response.text();
        
        // Try to parse response as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error('Invalid JSON response from API');
        }
        
        if (DEBUG) console.log('Update settings response:', data);
        
        if (!data.success) {
            throw new Error(data.message || 'Update failed');
        }
        
        // Update local user data if username or email changed
        if (userData.username || userData.email) {
            const localUser = getUserData();
            if (localUser) {
                if (userData.username) localUser.username = userData.username;
                if (userData.email) localUser.email = userData.email;
                localStorage.setItem('user', JSON.stringify(localUser));
                
                // Update displayed username
                if (settingsUsername && userData.username) {
                    settingsUsername.textContent = userData.username;
                }
            }
        }
        
        return data;
    }
    
    async function updatePassword(currentPassword, newPassword) {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Not authenticated');
        
        const response = await fetch(`${API_BASE_URL}?action=update_password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token,
                currentPassword,
                newPassword
            }),
        });
        
        // Handle non-OK responses
        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }
        
        const responseText = await response.text();
        
        // Try to parse response as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error('Invalid JSON response from API');
        }
        
        if (!data.success) {
            throw new Error(data.message || 'Password update failed');
        }
        
        return data;
    }
    
    function updatePasswordStrength(password) {
        const strengthMeter = document.querySelector('.strength-meter');
        const strengthText = document.querySelector('.strength-text');
        
        if (!strengthMeter || !strengthText) return;
        
        // Reset segments
        const segments = strengthMeter.querySelectorAll('.strength-segment');
        if (segments && segments.length) {
            segments.forEach(segment => {
                segment.style.backgroundColor = '';
            });
        }
        
        if (password.length === 0) {
            strengthText.textContent = 'Password strength';
            return;
        }
        
        // Calculate strength score (0-4)
        let score = 0;
        
        // Length check
        if (password.length >= 8) score++;
        
        // Complexity checks
        if (/[A-Z]/.test(password)) score++; // Has uppercase
        if (/[0-9]/.test(password)) score++; // Has number
        if (/[^A-Za-z0-9]/.test(password)) score++; // Has special character
        
        // Update the UI
        if (segments && segments.length) {
            for (let i = 0; i < score; i++) {
                if (segments[i]) {
                    segments[i].style.backgroundColor = getStrengthColor(score);
                }
            }
        }
        
        const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
        strengthText.textContent = strengthLabels[score-1] || 'Password strength';
    }
    
    function getStrengthColor(score) {
        switch(score) {
            case 1: return '#ff4d4d'; // Red
            case 2: return '#ffaa00'; // Orange
            case 3: return '#ffdd00'; // Yellow
            case 4: return '#00cc44'; // Green
            default: return '#cccccc'; // Grey
        }
    }
    
    function loadAppearanceSettings() {
        // Try to load from localStorage
        const savedSettings = localStorage.getItem('themeSettings');
        
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                
                // Update UI to match saved settings
                updateAppearanceUI(settings);
                
                // Apply the settings
                applyThemeSettings(settings);
            } catch (e) {
                console.error('Error parsing saved theme settings:', e);
            }
        }
    }
    
    function updateAppearanceUI(settings) {
        if (!settings) return;
        
        // Select the saved theme option
        if (themeOptions && themeOptions.length) {
            themeOptions.forEach(option => {
                if (option.getAttribute('data-theme') === settings.theme) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });
        }
        
        // Set font size slider
        if (fontSizeSlider && settings.fontSize) {
            fontSizeSlider.value = settings.fontSize;
        }
        
        // Select the saved color option
        if (colorOptions && colorOptions.length) {
            colorOptions.forEach(option => {
                if (option.getAttribute('data-color') === settings.accentColor) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });
        }
    }
    
    function applyThemeSettings(settings) {
        if (!settings) return;
        
        // Apply theme (light/dark/system)
        const htmlElement = document.documentElement;
        
        if (settings.theme === 'dark') {
            htmlElement.setAttribute('data-theme', 'dark');
        } else if (settings.theme === 'system') {
            // Use system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                htmlElement.setAttribute('data-theme', 'dark');
            } else {
                htmlElement.setAttribute('data-theme', 'light');
            }
        } else {
            // Default to light
            htmlElement.setAttribute('data-theme', 'light');
        }
        
        // Apply font size
        if (settings.fontSize) {
            htmlElement.style.fontSize = `${settings.fontSize}%`;
        }
        
        // Apply accent color - FIX: Update both CSS variables
        if (settings.accentColor) {
            document.body.style.setProperty('--primary-color', settings.accentColor);
            document.body.style.setProperty('--primary-hover', adjustColorBrightness(settings.accentColor, -10));
            
            // Update color options UI to match
            if (colorOptions && colorOptions.length) {
                colorOptions.forEach(option => {
                    if (option.getAttribute('data-color') === settings.accentColor) {
                        option.classList.add('active');
                    } else {
                        option.classList.remove('active');
                    }
                });
            }
        }
    }
    
    function showAlert(message, type = 'info') {
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type}`;
        alertElement.textContent = message;

        document.body.appendChild(alertElement);

        if (!document.querySelector('style#alert-styles')) {
            const styles = document.createElement('style');
            styles.id = 'alert-styles';
            styles.textContent = `
                .alert {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 5px;
                    opacity: 0;
                    transform: translateY(-20px);
                    transition: opacity 0.3s, transform 0.3s;
                    z-index: 9999;
                    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                    max-width: 300px;
                }
                .alert-success {
                    background-color: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }
                .alert-error {
                    background-color: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }
                .alert-warning {
                    background-color: #fff3cd;
                    color: #856404;
                    border: 1px solid #ffeeba;
                }
                .alert-info {
                    background-color: #d1ecf1;
                    color: #0c5460;
                    border: 1px solid #bee5eb;
                }
            `;
            document.head.appendChild(styles);
        }
        
        setTimeout(() => {
            alertElement.style.opacity = '1';
            alertElement.style.transform = 'translateY(0)';
        }, 10);
        
        setTimeout(() => {
            alertElement.style.opacity = '0';
            alertElement.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                document.body.removeChild(alertElement);
            }, 300);
        }, 3000);
    }
});
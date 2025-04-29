// Check if API constants are already defined in the global scope
if (typeof API_BASE_URL === 'undefined') {
    const API_BASE_URL = '/backend/api/classes.php';
}

if (typeof UPLOAD_HANDLER_PATH === 'undefined') {
    const UPLOAD_HANDLER_PATH = '/backend/handlers/upload_handler.php';
}

// Create a Classes module to avoid polluting the global namespace
const ClassesModule = (function() {
    // Use the global constants or define them locally if they don't exist
    const apiBaseUrl = window.API_BASE_URL || '/backend/api/classes.php';
    const uploadHandlerPath = window.UPLOAD_HANDLER_PATH || '/backend/handlers/upload_handler.php';
    
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize the classes page
        initClassesPage();
        
        // Tab navigation
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
        
        // Modal controls
        const joinClassBtn = document.getElementById('joinClassBtn');
        const createClassBtn = document.getElementById('createClassBtn');
        const joinClassModal = document.getElementById('joinClassModal');
        const createClassModal = document.getElementById('createClassModal');
        const closeBtns = document.querySelectorAll('.close');
        
        if (joinClassBtn && joinClassModal) {
            joinClassBtn.addEventListener('click', () => {
                joinClassModal.style.display = 'block';
            });
        }
        
        if (createClassBtn && createClassModal) {
            createClassBtn.addEventListener('click', () => {
                createClassModal.style.display = 'block';
            });
        }
        
        if (closeBtns) {
            closeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (joinClassModal) joinClassModal.style.display = 'none';
                    if (createClassModal) createClassModal.style.display = 'none';
                });
            });
        }
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (joinClassModal && e.target === joinClassModal) {
                joinClassModal.style.display = 'none';
            }
            if (createClassModal && e.target === createClassModal) {
                createClassModal.style.display = 'none';
            }
        });
        
        // Join class submission
        const joinClassSubmitBtn = document.getElementById('joinClassSubmitBtn');
        if (joinClassSubmitBtn) {
            joinClassSubmitBtn.addEventListener('click', joinClassHandler);
        }
        
        // Create class form submission
        const createClassForm = document.getElementById('createClassForm');
        if (createClassForm) {
            createClassForm.addEventListener('submit', createClassHandler);
        }
        
        // Cover image upload preview
        const coverUpload = document.getElementById('coverUpload');
        const coverPreview = document.getElementById('coverPreview');
        const coverPlaceholder = document.getElementById('coverPlaceholder');
        
        if (coverUpload && coverPreview && coverPlaceholder) {
            coverUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        coverPreview.src = e.target.result;
                        coverPreview.style.display = 'block';
                        coverPlaceholder.style.display = 'none';
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        // "Find Classes to Join" button
        const findClassesToJoinBtn = document.getElementById('findClassesToJoin');
        if (findClassesToJoinBtn) {
            findClassesToJoinBtn.addEventListener('click', () => {
                switchTab('explore');
            });
        }
        
        // "Create Your First Class" button
        const createFirstClassBtn = document.getElementById('createFirstClass');
        if (createFirstClassBtn) {
            createFirstClassBtn.addEventListener('click', () => {
                if (createClassModal) createClassModal.style.display = 'block';
            });
        }
        
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const classSearch = document.getElementById('classSearch');
        
        if (searchBtn && classSearch) {
            searchBtn.addEventListener('click', () => {
                const searchTerm = classSearch.value.trim();
                if (searchTerm) {
                    searchClasses(searchTerm);
                }
            });
            
            classSearch.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    const searchTerm = classSearch.value.trim();
                    if (searchTerm) {
                        searchClasses(searchTerm);
                    }
                }
            });
        }
        
        // Apply filters button
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', applyFilters);
        }
    });

    // Initialize the classes page
    async function initClassesPage() {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            console.log('User not authenticated, showing limited view');
            // Redirect to login or show message
            return;
        }
        
        try {
            // Load user's classes
            await loadUserClasses();
            
            // Load teaching classes
            await loadTeachingClasses();
            
            // Load explore classes
            await loadExploreClasses();
            
        } catch (error) {
            console.error('Error initializing classes page:', error);
            showAlert('Error loading classes data. Please try again.', 'error');
        }
    }

    // Switch between tabs
    function switchTab(tabId) {
        // Update active tab button
        const tabButtons = document.querySelectorAll('.tab-btn');
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
            if (content.id === `${tabId}-content`) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
        
        // If switching to explore tab and it's empty, load classes
        if (tabId === 'explore') {
            const exploreClassesList = document.getElementById('exploreClassesList');
            const loadingMessage = document.getElementById('loadingExploreClasses');
            
            if (exploreClassesList && loadingMessage && 
                exploreClassesList.children.length === 1 && 
                exploreClassesList.children[0] === loadingMessage) {
                loadExploreClasses();
            }
        }
    }

    // Load user's classes
    async function loadUserClasses() {
        const token = localStorage.getItem('authToken');
        const myClassesList = document.getElementById('myClassesList');
        const noMyClassesMessage = document.getElementById('noMyClassesMessage');
        
        if (!token || !myClassesList) return;
        
        try {
            // Make API call to get user classes
            const response = await fetch(`${apiBaseUrl}?action=get_user_classes`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.classes && data.classes.length > 0) {
                // Hide no classes message
                if (noMyClassesMessage) noMyClassesMessage.style.display = 'none';
                
                // Create class cards
                let classCardsHTML = '';
                
                data.classes.forEach(classItem => {
                    classCardsHTML += createClassCard(classItem);
                });
                
                // Insert class cards before any existing content (like empty state message)
                if (noMyClassesMessage) {
                    myClassesList.innerHTML = classCardsHTML + noMyClassesMessage.outerHTML;
                } else {
                    myClassesList.innerHTML = classCardsHTML;
                }
                
                // Add click event listeners to class cards
                addClassCardEventListeners();
            } else {
                // Show no classes message
                if (noMyClassesMessage) noMyClassesMessage.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error loading user classes:', error);
            if (noMyClassesMessage) {
                noMyClassesMessage.innerHTML = `
                    <p>Error loading your classes</p>
                    <button class="action-link" onclick="ClassesModule.loadUserClasses()">Try Again</button>
                `;
                noMyClassesMessage.style.display = 'flex';
            }
        }
    }

    // Load teaching classes
    async function loadTeachingClasses() {
        const token = localStorage.getItem('authToken');
        const teachingClassesList = document.getElementById('teachingClassesList');
        const noTeachingClassesMessage = document.getElementById('noTeachingClassesMessage');
        
        if (!token || !teachingClassesList) return;
        
        try {
            // Make API call to get teaching classes
            const response = await fetch(`${apiBaseUrl}?action=get_teaching_classes`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.classes && data.classes.length > 0) {
                // Hide no classes message
                if (noTeachingClassesMessage) noTeachingClassesMessage.style.display = 'none';
                
                // Create class cards
                let classCardsHTML = '';
                
                data.classes.forEach(classItem => {
                    classCardsHTML += createClassCard(classItem);
                });
                
                // Insert class cards before any existing content
                if (noTeachingClassesMessage) {
                    teachingClassesList.innerHTML = classCardsHTML + noTeachingClassesMessage.outerHTML;
                } else {
                    teachingClassesList.innerHTML = classCardsHTML;
                }
                
                // Add click event listeners to class cards
                addClassCardEventListeners();
            } else {
                // Show no classes message
                if (noTeachingClassesMessage) noTeachingClassesMessage.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error loading teaching classes:', error);
            if (noTeachingClassesMessage) {
                noTeachingClassesMessage.innerHTML = `
                    <p>Error loading your teaching classes</p>
                    <button class="action-link" onclick="ClassesModule.loadTeachingClasses()">Try Again</button>
                `;
                noTeachingClassesMessage.style.display = 'flex';
            }
        }
    }

    // Load explore classes
    async function loadExploreClasses(filters = {}) {
        const token = localStorage.getItem('authToken');
        const exploreClassesList = document.getElementById('exploreClassesList');
        const loadingMessage = document.getElementById('loadingExploreClasses');
        
        if (!exploreClassesList) return;
        
        try {
            // Show loading message
            if (loadingMessage) loadingMessage.style.display = 'flex';
            
            // Build query string from filters
            let queryParams = ['action=get_explore_classes'];
            if (filters.category) queryParams.push(`category=${encodeURIComponent(filters.category)}`);
            if (filters.level) queryParams.push(`level=${encodeURIComponent(filters.level)}`);
            if (filters.search) queryParams.push(`search=${encodeURIComponent(filters.search)}`);
            
            const queryString = queryParams.join('&');
            
            // Make API call to get explore classes
            const url = `${apiBaseUrl}?${queryString}`;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.classes && data.classes.length > 0) {
                // Create class cards
                let classCardsHTML = '';
                
                data.classes.forEach(classItem => {
                    classCardsHTML += createClassCard(classItem);
                });
                
                // Replace loading message with class cards
                exploreClassesList.innerHTML = classCardsHTML;
                
                // Add click event listeners to class cards
                addClassCardEventListeners();
            } else {
                // Show no classes message
                exploreClassesList.innerHTML = `
                    <div class="empty-state">
                        <p>No classes found</p>
                        <button class="action-link" onclick="ClassesModule.loadExploreClasses()">Reset Filters</button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading explore classes:', error);
            exploreClassesList.innerHTML = `
                <div class="empty-state">
                    <p>Error loading classes</p>
                    <button class="action-link" onclick="ClassesModule.loadExploreClasses()">Try Again</button>
                </div>
            `;
        }
    }

    // Create HTML for a class card
    function createClassCard(classItem) {
        const bannerStyle = classItem.coverImage ? 
            `background-image: url('${classItem.coverImage}');` : 
            `background-color: ${classItem.color || '#4A6FFF'};`;
            
        const statusClass = classItem.status === 'active' ? 'status-active' : 
                            classItem.status === 'pending' ? 'status-pending' : 'status-archived';
                            
        const statusText = classItem.status === 'active' ? 'Active' : 
                          classItem.status === 'pending' ? 'Pending' : 'Archived';
        
        return `
        <div class="class-card" data-class-id="${classItem.id}">
            <div class="class-banner" style="${bannerStyle}">
                ${!classItem.coverImage ? classItem.name.charAt(0).toUpperCase() : ''}
            </div>
            <div class="class-content">
                <h3 class="class-name">${classItem.name}</h3>
                <p class="class-description">${classItem.description || 'No description available'}</p>
                <div class="class-meta">
                    <span>${classItem.category || 'General'}</span>
                    <span class="class-status ${statusClass}">${statusText}</span>
                </div>
            </div>
            <div class="class-footer">
                <span class="teacher">${classItem.teacher}</span>
                <span class="students-count">${classItem.studentsCount} students</span>
            </div>
        </div>
        `;
    }

    // Add event listeners to class cards
    function addClassCardEventListeners() {
        const classCards = document.querySelectorAll('.class-card');
        classCards.forEach(card => {
            card.addEventListener('click', () => {
                const classId = card.getAttribute('data-class-id');
                navigateToClassDetail(classId);
            });
        });
    }

    // Navigate to class detail page
    function navigateToClassDetail(classId) {
        window.location.href = `class-detail.html?id=${classId}`;
    }

    // Join class handler
    async function joinClassHandler() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showAlert('Please log in to join a class', 'error');
            return;
        }
        
        const classCode = document.getElementById('classCode').value.trim();
        if (!classCode) {
            showAlert('Please enter a class code', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${apiBaseUrl}?action=join_class`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    classCode: classCode
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                showAlert(data.message || 'Successfully joined the class', 'success');
                
                // Close modal
                const joinClassModal = document.getElementById('joinClassModal');
                if (joinClassModal) joinClassModal.style.display = 'none';
                
                // Clear input field
                document.getElementById('classCode').value = '';
                
                // Navigate to class detail or reload classes
                if (data.classId) {
                    navigateToClassDetail(data.classId);
                } else {
                    loadUserClasses();
                }
            } else {
                showAlert(data.message || 'Failed to join class', 'error');
            }
        } catch (error) {
            console.error('Error joining class:', error);
            showAlert('An error occurred while joining the class', 'error');
        }
    }

    // Upload cover image function
    async function uploadCoverImage(imageData, userId) {
        try {
            const response = await fetch(`${uploadHandlerPath}?action=upload_base64`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageData,
                    userId: userId,
                    fileExtension: 'png'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to upload image');
            }
            
            return data.url;
        } catch (error) {
            console.error('Error uploading cover image:', error);
            throw error;
        }
    }

    // Create class handler
    async function createClassHandler(e) {
        e.preventDefault();
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            showAlert('Please log in to create a class', 'error');
            return;
        }
        
        // Get form values
        const className = document.getElementById('className').value.trim();
        const classDescription = document.getElementById('classDescription').value.trim();
        const classCategory = document.getElementById('classCategory').value;
        const classLevel = document.getElementById('classLevel').value;
        const classVisibility = document.querySelector('input[name="classVisibility"]:checked').value;
        const classColor = document.querySelector('input[name="classColor"]:checked').value;
        
        // Validation
        if (!className || !classCategory || !classLevel) {
            showAlert('Please fill in all required fields', 'error');
            return;
        }
        
        // Get cover image if uploaded
        const coverPreview = document.getElementById('coverPreview');
        let coverImageUrl = null;
        
        try {
            showAlert('Creating your class...', 'info');
            
            // Upload cover image if it exists
            if (coverPreview && coverPreview.style.display !== 'none') {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (user.id) {
                    try {
                        coverImageUrl = await uploadCoverImage(coverPreview.src, user.id);
                    } catch (imageError) {
                        console.error('Failed to upload cover image:', imageError);
                        // Continue without cover image
                    }
                }
            }
            
            const response = await fetch(`${apiBaseUrl}?action=create_class`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: className,
                    description: classDescription,
                    category: classCategory,
                    level: classLevel,
                    visibility: classVisibility,
                    color: classColor,
                    coverImage: coverImageUrl
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                showAlert(data.message || 'Class created successfully!', 'success');
                
                // Close modal
                const createClassModal = document.getElementById('createClassModal');
                if (createClassModal) createClassModal.style.display = 'none';
                
                // Reset form
                e.target.reset();
                
                // Hide cover preview
                if (coverPreview) {
                    coverPreview.style.display = 'none';
                    document.getElementById('coverPlaceholder').style.display = 'block';
                }
                
                // If we have the class code, show it to the user
                if (data.classCode) {
                    showAlert(`Your class code is ${data.classCode}. Share it with your students so they can join.`, 'info', 6000);
                }
                
                // Navigate to class detail or reload teaching classes
                if (data.classId) {
                    navigateToClassDetail(data.classId);
                } else {
                    loadTeachingClasses();
                }
            } else {
                showAlert(data.message || 'Failed to create class', 'error');
            }
        } catch (error) {
            console.error('Error creating class:', error);
            showAlert('An error occurred while creating the class', 'error');
        }
    }

    // Search classes
    function searchClasses(searchTerm) {
        // Get current active tab
        const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        
        // Search in the active tab only
        switch (activeTab) {
            case 'my-classes':
                filterClassesBySearchTerm('myClassesList', searchTerm);
                break;
            case 'teaching':
                filterClassesBySearchTerm('teachingClassesList', searchTerm);
                break;
            case 'explore':
                // For explore tab, reload with search parameter
                loadExploreClasses({ search: searchTerm });
                break;
        }
    }

    // Filter displayed classes by search term
    function filterClassesBySearchTerm(listId, searchTerm) {
        const classesList = document.getElementById(listId);
        if (!classesList) return;
        
        const classCards = classesList.querySelectorAll('.class-card');
        let hasVisibleCards = false;
        
        classCards.forEach(card => {
            const className = card.querySelector('.class-name').textContent.toLowerCase();
            const classDescription = card.querySelector('.class-description').textContent.toLowerCase();
            const teacher = card.querySelector('.teacher').textContent.toLowerCase();
            
            if (className.includes(searchTerm.toLowerCase()) || 
                classDescription.includes(searchTerm.toLowerCase()) ||
                teacher.includes(searchTerm.toLowerCase())) {
                card.style.display = 'flex';
                hasVisibleCards = true;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Handle no results
        const noResultsMessage = classesList.querySelector('.no-results-message');
        
        if (!hasVisibleCards) {
            if (!noResultsMessage) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'empty-state no-results-message';
                messageDiv.innerHTML = `
                    <p>No classes matching "${searchTerm}"</p>
                    <button class="action-link" onclick="document.getElementById('classSearch').value = ''; ClassesModule.searchClasses('');">Clear Search</button>
                `;
                classesList.appendChild(messageDiv);
            }
        } else {
            if (noResultsMessage) {
                noResultsMessage.remove();
            }
        }
    }

    // Apply filters for explore tab
    function applyFilters() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const levelFilter = document.getElementById('levelFilter').value;
        
        const filters = {};
        if (categoryFilter !== 'all') filters.category = categoryFilter;
        if (levelFilter !== 'all') filters.level = levelFilter;
        
        loadExploreClasses(filters);
    }

    // Show notification alert
    function showAlert(message, type = 'info', duration = 3000) {
        // First, remove any existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => {
            document.body.removeChild(alert);
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
                document.body.removeChild(alertElement);
            }, 300);
        }, duration);
    }

    // Return public methods
    return {
        initClassesPage,
        loadUserClasses,
        loadTeachingClasses,
        loadExploreClasses,
        searchClasses,
        filterClassesBySearchTerm,
        applyFilters,
        showAlert
    };
})();

// Make public functions available globally
window.ClassesModule = ClassesModule;
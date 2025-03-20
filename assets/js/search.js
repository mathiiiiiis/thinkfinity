document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const filterField = document.getElementById('filterField');
    const searchResults = document.getElementById('searchResults');
    const resultCount = document.getElementById('resultCount');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const paginationInfo = document.getElementById('paginationInfo');
    const userCardTemplate = document.getElementById('userCardTemplate');
    
    // API Endpoints
    const API_BASE_URL = '/backend/api/search.php';
    
    // Search state
    let currentSearch = {
        query: '',
        filter: 'all',
        page: 1,
        resultsPerPage: 10,
        totalResults: 0,
        totalPages: 1
    };
    
    // Debug flag
    const DEBUG = true;
    
    // Event listeners
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    filterField.addEventListener('change', () => {
        currentSearch.filter = filterField.value;
        currentSearch.page = 1;
        if (currentSearch.query) {
            performSearch();
        }
    });
    
    prevPageBtn.addEventListener('click', () => {
        if (currentSearch.page > 1) {
            currentSearch.page--;
            performSearch(false);
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        if (currentSearch.page < currentSearch.totalPages) {
            currentSearch.page++;
            performSearch(false);
        }
    });
    
    function performSearch(resetPage = true) {
        const query = searchInput.value.trim();
        
        if (query === '' && resetPage) {
            // Show no results message
            displayNoResults('Enter a search term to find members');
            return;
        }
        
        if (resetPage) {
            currentSearch.page = 1;
        }
        
        currentSearch.query = query;
        
        // Show loading state
        searchResults.innerHTML = '<div class="no-results"><p>Searching...</p></div>';
        
        // Fetch search results
        fetchSearchResults();
    }
    
    async function fetchSearchResults() {
        try {
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`${API_BASE_URL}?action=search_users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: currentSearch.query,
                    filter: currentSearch.filter,
                    page: currentSearch.page,
                    limit: currentSearch.resultsPerPage,
                    token: token || ''
                })
            });
            
            const data = await response.json();
            
            if (DEBUG) console.log('Search results:', data);
            
            if (data.success) {
                displaySearchResults(data.users, data.totalResults);
            } else {
                displayNoResults(data.message || 'Failed to search for users');
            }
        } catch (error) {
            console.error('Error searching users:', error);
            displayNoResults('An error occurred while searching. Please try again.');
            
            // If search.php hasn't been implemented yet, show mock results for testing
            if (DEBUG) {
                displayMockSearchResults();
            }
        }
    }
    
    function displaySearchResults(users, totalResults) {
        if (!users || users.length === 0) {
            displayNoResults('No users found matching your search criteria');
            return;
        }
        
        // Update search state
        currentSearch.totalResults = totalResults;
        currentSearch.totalPages = Math.ceil(totalResults / currentSearch.resultsPerPage);
        
        // Update result count and pagination
        resultCount.textContent = totalResults;
        updatePagination();
        
        // Clear previous results
        searchResults.innerHTML = '';
        
        // Display each user
        users.forEach(user => {
            const userCard = userCardTemplate.content.cloneNode(true);
            
            const userAvatar = userCard.querySelector('.user-avatar');
            const userName = userCard.querySelector('.user-name');
            const userTagline = userCard.querySelector('.user-tagline');
            const viewProfileBtn = userCard.querySelector('.view-profile-btn');
            
            userAvatar.src = user.profileImage || 'assets/pictures/default-profile.png';
            userName.textContent = user.username;
            userTagline.textContent = user.tagline || 'Learning enthusiast';
            viewProfileBtn.href = `user/${user.uuid}`;
            
            searchResults.appendChild(userCard);
        });
    }
    
    function displayNoResults(message) {
        searchResults.innerHTML = `<div class="no-results"><p>${message}</p></div>`;
        resultCount.textContent = '0';
        
        // Reset pagination
        currentSearch.totalResults = 0;
        currentSearch.totalPages = 1;
        updatePagination();
    }
    
    function updatePagination() {
        paginationInfo.textContent = `Page ${currentSearch.page} of ${currentSearch.totalPages}`;
        
        prevPageBtn.disabled = currentSearch.page === 1;
        nextPageBtn.disabled = currentSearch.page === currentSearch.totalPages;
    }
    
    // Mock data function for testing the UI without backend
    function displayMockSearchResults() {
        const mockUsers = [
            {
                uuid: 'user-123',
                username: 'learner123',
                tagline: 'Physics enthusiast and math lover',
                profileImage: 'assets/pictures/default-profile.png'
            },
            {
                uuid: 'user-456',
                username: 'knowledge_seeker',
                tagline: 'Learning something new every day',
                profileImage: 'assets/pictures/default-profile.png'
            },
            {
                uuid: 'user-789',
                username: 'code_master',
                tagline: 'Full-stack developer | AI enthusiast',
                profileImage: 'assets/pictures/default-profile.png'
            },
            {
                uuid: 'user-101',
                username: 'science_guru',
                tagline: 'PhD student in Quantum Physics',
                profileImage: 'assets/pictures/default-profile.png'
            }
        ];
        
        displaySearchResults(mockUsers, mockUsers.length);
    }
});
document.addEventListener('DOMContentLoaded', function() {
    const userDropdown = document.querySelector('.navbar-dropdown');
    const profileInfo = document.querySelector('.profile-info');
    
    // Toggle dropdown on click
    if (profileInfo) {
      profileInfo.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
      });
    }
    
    // Close dropdown when clicking elsewhere on the page
    document.addEventListener('click', function(e) {
      if (userDropdown && userDropdown.classList.contains('active') && !userDropdown.contains(e.target)) {
        userDropdown.classList.remove('active');
      }
    });
    
    // Prevent dropdown from closing when clicking inside it
    const dropdownContent = document.querySelector('.dropdown-content');
    if (dropdownContent) {
      dropdownContent.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }
    
    if (userDropdown) {
      userDropdown.addEventListener('keydown', function(e) {
        // Toggle dropdown on Enter or Space
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          userDropdown.classList.toggle('active');
        }
        
        // Close dropdown on Escape
        if (e.key === 'Escape' && userDropdown.classList.contains('active')) {
          userDropdown.classList.remove('active');
        }
      });
      
      // Make dropdown focusable
      profileInfo.setAttribute('tabindex', '0');
      profileInfo.setAttribute('role', 'button');
      profileInfo.setAttribute('aria-haspopup', 'true');
      profileInfo.setAttribute('aria-expanded', 'false');

      profileInfo.addEventListener('click', function() {
        const expanded = userDropdown.classList.contains('active');
        profileInfo.setAttribute('aria-expanded', expanded.toString());
      });
    }
  });
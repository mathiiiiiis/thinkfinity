/**
 * Assignment Manager
 * Handles assignment-related functionality
 */
const AssignmentManager = (function() {
    // Load assignments
    async function loadAssignments(classId) {
        const assignmentsList = document.getElementById('assignmentsList');
        if (!assignmentsList) return;
        
        // Show loading message
        assignmentsList.innerHTML = '<div class="loading-message">Loading assignments...</div>';
        
        const token = localStorage.getItem('authToken');
        
        try {
            const response = await fetch(`${API_BASE_URL}?action=get_assignments&classId=${classId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load assignments');
            }
            
            renderAssignments(data.assignments);
            
        } catch (error) {
            console.error('Error loading assignments:', error);
            assignmentsList.innerHTML = `
                <div class="error-message">
                    <p>Error loading assignments</p>
                    <button class="retry-btn" onclick="AssignmentManager.loadAssignments('${classId}')">Retry</button>
                </div>
            `;
        }
    }

    // Render assignments
    function renderAssignments(assignments) {
        const assignmentsList = document.getElementById('assignmentsList');
        if (!assignmentsList) return;
        
        if (!assignments || assignments.length === 0) {
            assignmentsList.innerHTML = `
                <div class="empty-state">
                    <p>No assignments yet</p>
                    ${window.getUserRole() === 'teacher' || window.getUserRole() === 'assistant' ? 
                        '<p>Create an assignment to get started!</p>' : 
                        '<p>Check back later for assignments.</p>'}
                </div>
            `;
            return;
        }
        
        // Group assignments by due date
        const currentDate = new Date();
        const overdueAssignments = [];
        const upcomingAssignments = [];
        const submittedAssignments = [];
        const gradedAssignments = [];
        
        assignments.forEach(assignment => {
            const dueDate = new Date(assignment.dueDate);
            
            if (assignment.submission) {
                if (assignment.submission.status === 'graded') {
                    gradedAssignments.push(assignment);
                } else {
                    submittedAssignments.push(assignment);
                }
            } else if (assignment.isOverdue) {
                overdueAssignments.push(assignment);
            } else {
                upcomingAssignments.push(assignment);
            }
        });
        
        // Sort by due date
        const sortByDueDate = (a, b) => new Date(a.dueDate) - new Date(b.dueDate);
        overdueAssignments.sort(sortByDueDate);
        upcomingAssignments.sort(sortByDueDate);
        submittedAssignments.sort(sortByDueDate);
        gradedAssignments.sort(sortByDueDate);
        
        let assignmentsHTML = '';
        
        // Overdue assignments
        if (overdueAssignments.length > 0) {
            assignmentsHTML += `<div class="assignments-section overdue">
                <h3>Overdue</h3>
                <div class="assignments-group">
                    ${renderAssignmentGroup(overdueAssignments)}
                </div>
            </div>`;
        }
        
        // Upcoming assignments
        if (upcomingAssignments.length > 0) {
            assignmentsHTML += `<div class="assignments-section upcoming">
                <h3>Upcoming</h3>
                <div class="assignments-group">
                    ${renderAssignmentGroup(upcomingAssignments)}
                </div>
            </div>`;
        }
        
        // Submitted assignments
        if (submittedAssignments.length > 0) {
            assignmentsHTML += `<div class="assignments-section submitted">
                <h3>Submitted</h3>
                <div class="assignments-group">
                    ${renderAssignmentGroup(submittedAssignments)}
                </div>
            </div>`;
        }
        
        // Graded assignments
        if (gradedAssignments.length > 0) {
            assignmentsHTML += `<div class="assignments-section graded">
                <h3>Graded</h3>
                <div class="assignments-group">
                    ${renderAssignmentGroup(gradedAssignments)}
                </div>
            </div>`;
        }
        
        assignmentsList.innerHTML = assignmentsHTML;
        
        // Add event listeners to assignment cards
        const assignmentCards = assignmentsList.querySelectorAll('.assignment-card');
        assignmentCards.forEach(card => {
            card.addEventListener('click', () => {
                const assignmentId = card.getAttribute('data-assignment-id');
                showAssignmentDetails(assignmentId);
            });
        });
    }

    // Render assignment group
    function renderAssignmentGroup(assignments) {
        let html = '';
        
        assignments.forEach(assignment => {
            const dueDate = new Date(assignment.dueDate);
            const formattedDate = dueDate.toLocaleDateString();
            const formattedTime = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            let statusClass = 'status-active';
            let statusText = 'Active';
            
            if (assignment.submission) {
                if (assignment.submission.status === 'graded') {
                    statusClass = 'status-graded';
                    statusText = `Graded: ${assignment.submission.grade}/${assignment.points}`;
                } else {
                    statusClass = 'status-submitted';
                    statusText = 'Submitted';
                }
            } else if (assignment.isOverdue) {
                statusClass = 'status-overdue';
                statusText = 'Overdue';
            }
            
            html += `
                <div class="assignment-card" data-assignment-id="${assignment.id}">
                    <div class="assignment-content">
                        <h3 class="assignment-title">${assignment.title}</h3>
                        <p class="assignment-due">Due: ${formattedDate} at ${formattedTime}</p>
                        <div class="assignment-meta">
                            <span class="assignment-points">${assignment.points} points</span>
                            <span class="assignment-status ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return html;
    }

    // Show assignment details
    async function showAssignmentDetails(assignmentId) {
        const token = localStorage.getItem('authToken');
        const modal = document.getElementById('assignmentModal');
        const modalContent = document.getElementById('assignmentModalContent');
        
        if (!modal || !modalContent) return;
        
        // Show loading message
        modalContent.innerHTML = '<div class="loading-message">Loading assignment details...</div>';
        modal.style.display = 'block';
        
        try {
            // Fetch assignment details
            const response = await fetch(`${API_BASE_URL}?action=get_assignment_details&id=${assignmentId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // If this endpoint doesn't exist, you can use mock data for now
            let assignmentData;
            
            if (!response.ok) {
                console.log("Using mock data since endpoint may not exist");
                // Use mock data
                assignmentData = {
                    id: assignmentId,
                    title: "Assignment " + assignmentId,
                    description: "This is a mock description since the API endpoint isn't implemented yet.",
                    dueDate: new Date().toISOString(),
                    points: 100,
                    status: "published",
                    createdBy: "Teacher",
                    submission: null
                };
            } else {
                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.message || 'Failed to load assignment details');
                }
                assignmentData = data.assignment;
            }
            
            // Format date
            const dueDate = new Date(assignmentData.dueDate);
            const formattedDate = dueDate.toLocaleDateString();
            const formattedTime = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Render assignment details
            let modalHTML = `
                <div class="assignment-details">
                    <h2>${assignmentData.title}</h2>
                    <div class="assignment-meta-details">
                        <div class="meta-item">
                            <span class="meta-label">Due:</span>
                            <span class="meta-value">${formattedDate} at ${formattedTime}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Points:</span>
                            <span class="meta-value">${assignmentData.points}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Created by:</span>
                            <span class="meta-value">${assignmentData.createdBy}</span>
                        </div>
                    </div>
                    
                    <div class="assignment-description">
                        <h3>Description</h3>
                        <div class="description-content">
                            ${assignmentData.description || 'No description provided.'}
                        </div>
                    </div>
            `;
            
            // Add submission section if student
            if (window.getUserRole() === 'student') {
                modalHTML += `
                    <div class="assignment-submission">
                        <h3>Your Submission</h3>
                        ${assignmentData.submission ? renderSubmission(assignmentData.submission) : renderSubmissionForm(assignmentId)}
                    </div>
                `;
            }
            
            // Add submission list if teacher/assistant
            if (window.getUserRole() === 'teacher' || window.getUserRole() === 'assistant') {
                modalHTML += `
                    <div class="submissions-list">
                        <h3>Student Submissions</h3>
                        <p>Submissions will be shown here when available.</p>
                    </div>
                `;
            }
            
            modalHTML += `</div>`;
            modalContent.innerHTML = modalHTML;
            
            // Add event listener for submission form
            const submissionForm = document.getElementById('submissionForm');
            if (submissionForm) {
                submissionForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    submitAssignment(assignmentId);
                });
            }
            
        } catch (error) {
            console.error('Error loading assignment details:', error);
            modalContent.innerHTML = `
                <div class="error-message">
                    <p>Error loading assignment details</p>
                    <button class="retry-btn" onclick="AssignmentManager.showAssignmentDetails('${assignmentId}')">Retry</button>
                </div>
            `;
        }
    }

    // Render submission if exists
    function renderSubmission(submission) {
        let submissionHTML = '';
        
        switch(submission.status) {
            case 'submitted':
submissionHTML = `
                    <div class="submission-status">
                        <span class="status-badge submitted">Submitted</span>
                        <span class="submission-date">Submitted on ${new Date(submission.submissionDate).toLocaleString()}</span>
                    </div>
                    <div class="submission-content">
                        ${submission.content || 'No content'}
                    </div>
                    ${submission.attachmentUrl ? `
                        <div class="submission-attachment">
                            <a href="${submission.attachmentUrl}" target="_blank" class="attachment-link">View Attachment</a>
                        </div>
                    ` : ''}
                `;
                break;
                
            case 'graded':
                submissionHTML = `
                    <div class="submission-status">
                        <span class="status-badge graded">Graded: ${submission.grade}</span>
                        <span class="submission-date">Submitted on ${new Date(submission.submissionDate).toLocaleString()}</span>
                    </div>
                    <div class="submission-content">
                        ${submission.content || 'No content'}
                    </div>
                    ${submission.attachmentUrl ? `
                        <div class="submission-attachment">
                            <a href="${submission.attachmentUrl}" target="_blank" class="attachment-link">View Attachment</a>
                        </div>
                    ` : ''}
                    <div class="submission-feedback">
                        <h4>Feedback</h4>
                        <p>${submission.feedback || 'No feedback provided.'}</p>
                    </div>
                `;
                break;
                
            default:
                submissionHTML = `
                    <p>Your submission is in progress.</p>
                    <button class="edit-submission-btn">Edit Submission</button>
                `;
        }
        
        return submissionHTML;
    }

    // Render submission form
    function renderSubmissionForm(assignmentId) {
        return `
            <form id="submissionForm">
                <div class="form-group">
                    <label for="submissionContent">Your Answer</label>
                    <textarea id="submissionContent" placeholder="Write your answer here..." required></textarea>
                </div>
                <div class="form-group">
                    <label for="submissionAttachment">Attachments (Optional)</label>
                    <input type="file" id="submissionAttachment">
                    <div id="attachmentPreview" class="attachment-preview"></div>
                </div>
                <button type="submit" class="submit-btn">Submit Assignment</button>
            </form>
        `;
    }

    // Submit assignment
    async function submitAssignment(assignmentId) {
        const token = localStorage.getItem('authToken');
        const content = document.getElementById('submissionContent').value.trim();
        const attachmentInput = document.getElementById('submissionAttachment');
        
        if (!content) {
            UIManager.showAlert('Please enter your answer', 'error');
            return;
        }
        
        try {
            const submitBtn = document.querySelector('#submissionForm .submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            
            // Upload attachment if exists
            let attachmentUrl = null;
            if (attachmentInput && attachmentInput.files && attachmentInput.files[0]) {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                try {
                    attachmentUrl = await FileUploader.uploadFile(attachmentInput.files[0], user.id);
                } catch (uploadError) {
                    console.error('Error uploading attachment:', uploadError);
                    UIManager.showAlert('Error uploading attachment. Your submission will continue without it.', 'warning');
                }
            }
            
            const response = await fetch(`${API_BASE_URL}?action=submit_assignment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    assignmentId: assignmentId,
                    content: content,
                    attachmentUrl: attachmentUrl
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to submit assignment');
            }
            
            UIManager.showAlert('Assignment submitted successfully', 'success');
            
            // Close modal and refresh assignments
            UIManager.closeModal(document.getElementById('assignmentModal'));
            loadAssignments(window.getClassData().id);
            
        } catch (error) {
            console.error('Error submitting assignment:', error);
            UIManager.showAlert('Failed to submit assignment: ' + error.message, 'error');
        } finally {
            const submitBtn = document.querySelector('#submissionForm .submit-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Assignment';
            }
        }
    }

    // Show create assignment modal
    function showCreateAssignmentModal() {
        const modal = document.getElementById('createAssignmentModal');
        if (modal) {
            // Reset form
            const form = document.getElementById('createAssignmentForm');
            if (form) form.reset();
            
            // Set default due date (1 week from now)
            const dueDateInput = document.getElementById('assignmentDueDate');
            if (dueDateInput) {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                
                // Format for datetime-local input
                const year = nextWeek.getFullYear();
                const month = String(nextWeek.getMonth() + 1).padStart(2, '0');
                const day = String(nextWeek.getDate()).padStart(2, '0');
                const hours = String(nextWeek.getHours()).padStart(2, '0');
                const minutes = String(nextWeek.getMinutes()).padStart(2, '0');
                
                dueDateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
            }
            
            // Show modal
            modal.style.display = 'block';
        }
    }

    // Create assignment
    async function createAssignment(e) {
        e.preventDefault();
        
        const token = localStorage.getItem('authToken');
        
        // Get form values
        const title = document.getElementById('assignmentTitle').value.trim();
        const description = document.getElementById('assignmentDescription').value.trim();
        const dueDate = document.getElementById('assignmentDueDate').value;
        const points = document.getElementById('assignmentPoints').value;
        const status = document.querySelector('input[name="assignmentStatus"]:checked').value;
        
        if (!title || !dueDate) {
            UIManager.showAlert('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            const submitBtn = document.querySelector('#createAssignmentForm .submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';
            
            const response = await fetch(`${API_BASE_URL}?action=create_assignment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    classId: window.getClassData().id,
                    title: title,
                    description: description,
                    dueDate: dueDate,
                    points: points,
                    status: status
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to create assignment');
            }
            
            UIManager.showAlert('Assignment created successfully', 'success');
            
            // Close modal and refresh assignments
            UIManager.closeModal(document.getElementById('createAssignmentModal'));
            loadAssignments(window.getClassData().id);
            
        } catch (error) {
            console.error('Error creating assignment:', error);
            UIManager.showAlert('Failed to create assignment: ' + error.message, 'error');
        } finally {
            const submitBtn = document.querySelector('#createAssignmentForm .submit-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Assignment';
            }
        }
    }

    // Set up attachment preview
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'submissionAttachment') {
            const previewDiv = document.getElementById('attachmentPreview');
            if (previewDiv) {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    previewDiv.innerHTML = `
                        <div class="attachment-info">
                            <span class="attachment-name">${file.name}</span>
                            <span class="attachment-size">(${(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                    `;
                } else {
                    previewDiv.innerHTML = '';
                }
            }
        }
    });

    return {
        loadAssignments,
        renderAssignments,
        showAssignmentDetails,
        submitAssignment,
        showCreateAssignmentModal,
        createAssignment
    };
})();

// Make functions available globally
window.AssignmentManager = AssignmentManager;
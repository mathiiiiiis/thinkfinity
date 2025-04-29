/**
 * Members Manager
 * Handles class members and invitations
 */
const MembersManager = (function() {
    // Load class members
    async function loadClassMembers(classId) {
        const membersList = document.getElementById('membersList');
        if (!membersList) return;
        
        // Show loading message
        membersList.innerHTML = '<div class="loading-message">Loading members...</div>';
        
        try {
            // Use the members from the class details we already have
            const classData = window.getClassData();
            if (classData && classData.members && classData.members.length > 0) {
                renderClassMembers(classData.members);
            } else {
                // If we don't have members yet, render empty state
                membersList.innerHTML = `
                    <div class="empty-state">
                        <p>No members found</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading class members:', error);
            membersList.innerHTML = `
                <div class="error-message">
                    <p>Error loading class members</p>
                    <button class="retry-btn" onclick="MembersManager.loadClassMembers('${classId}')">Retry</button>
                </div>
            `;
        }
    }

    // Render class members
    function renderClassMembers(members) {
        const membersList = document.getElementById('membersList');
        if (!membersList) return;
        
        if (!members || members.length === 0) {
            membersList.innerHTML = `
                <div class="empty-state">
                    <p>No members found</p>
                </div>
            `;
            return;
        }
        
        // Group members by role
        const teachers = members.filter(member => member.role === 'teacher');
        const assistants = members.filter(member => member.role === 'assistant');
        const students = members.filter(member => member.role === 'student');
        
        let membersHTML = '';
        
        // Teachers section
        if (teachers.length > 0) {
            membersHTML += `
                <div class="members-section teachers">
                    <h3>Teachers</h3>
                    <div class="members-group">
                        ${renderMemberGroup(teachers)}
                    </div>
                </div>
            `;
        }
        
        // Assistants section
        if (assistants.length > 0) {
            membersHTML += `
                <div class="members-section assistants">
                    <h3>Teaching Assistants</h3>
                    <div class="members-group">
                        ${renderMemberGroup(assistants)}
                    </div>
                </div>
            `;
        }
        
        // Students section
        if (students.length > 0) {
            membersHTML += `
                <div class="members-section students">
                    <h3>Students (${students.length})</h3>
                    <div class="members-group">
                        ${renderMemberGroup(students)}
                    </div>
                </div>
            `;
        }
        
        membersList.innerHTML = membersHTML;
        
        // Add event listeners to member cards
        const memberItems = membersList.querySelectorAll('.member-item');
        memberItems.forEach(item => {
            item.addEventListener('click', () => {
                const memberId = item.getAttribute('data-member-id');
                const memberUuid = item.getAttribute('data-member-uuid');
                showMemberProfile(memberId, memberUuid);
            });
        });
        
        // Add event listeners to message buttons
        document.querySelectorAll('.message-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent opening profile
                
                const memberId = btn.getAttribute('data-member-id');
                const memberName = btn.closest('.member-item').querySelector('.member-name').textContent;
                
                // Switch to chat tab
                ClassDetailManager.switchTab('chat');
                
                // Select this user for DM
                const dmItem = document.querySelector(`#directMessagesList li[data-user-id="${memberId}"]`);
                if (dmItem) {
                    // Simulate a click on the DM list item
                    dmItem.click();
                }
            });
        });
    }

    // Render member group
    function renderMemberGroup(members) {
        let html = '';
        
        members.forEach(member => {
            html += `
                <div class="member-item" data-member-id="${member.id}" data-member-uuid="${member.uuid}">
                    <div class="member-avatar" style="background-image: url('${member.profileImage || ''}');">
                        ${!member.profileImage ? member.username.charAt(0).toUpperCase() : ''}
                    </div>
                    <div class="member-info">
                        <h4 class="member-name">${member.username}</h4>
                    </div>
                    ${window.getUserRole() === 'teacher' && member.role !== 'teacher' ? 
                        `<div class="member-actions">
                            <button class="member-action-btn message-btn" data-action="message" data-member-id="${member.id}">Message</button>
                        </div>` : ''}
                </div>
            `;
        });
        
        return html;
    }

    // Show member profile
    function showMemberProfile(memberId, memberUuid) {
        window.location.href = `profile.html?uuid=${memberUuid}`;
    }

    // Show invite modal
    function showInviteModal() {
        const modal = document.getElementById('inviteModal');
        if (modal) {
            // Update class code text
            const classCodeText = document.getElementById('classCodeText');
            const classData = window.getClassData();
            if (classCodeText && classData && classData.classCode) {
                classCodeText.textContent = classData.classCode;
            }
            
            // Show modal
            modal.style.display = 'block';
        }
    }

    // Copy class code to clipboard
    function copyClassCodeToClipboard() {
        const classCodeText = document.getElementById('classCodeText');
        if (classCodeText) {
            const code = classCodeText.textContent;
            
            // Create a temporary input element
            const tempInput = document.createElement('input');
            tempInput.value = code;
            document.body.appendChild(tempInput);
            
            // Select and copy the text
            tempInput.select();
            document.execCommand('copy');
            
            // Remove the temporary element
            document.body.removeChild(tempInput);
            
            // Show success message
            UIManager.showAlert('Class code copied to clipboard', 'success');
        }
    }

    // Send email invitations
    function sendInvitations() {
        const inviteEmails = document.getElementById('inviteEmails');
        if (!inviteEmails) return;
        
        const emails = inviteEmails.value.trim();
        if (!emails) {
            UIManager.showAlert('Please enter at least one email address', 'error');
            return;
        }
        
        // In a real implementation, this would make an API call
        // For now, just show a success message
        UIManager.showAlert('Invitations sent successfully', 'success');
        
        // Clear the input and close the modal
        inviteEmails.value = '';
        UIManager.closeModal(document.getElementById('inviteModal'));
    }

    return {
        loadClassMembers,
        renderClassMembers,
        showMemberProfile,
        showInviteModal,
        copyClassCodeToClipboard,
        sendInvitations
    };
})();

// Make functions available globally
window.MembersManager = MembersManager;
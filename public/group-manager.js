// ===== STUDY GROUP MANAGEMENT MODULE =====

// Modal Management Functions
function showGroupModal() {
    document.getElementById('group-modal').classList.remove('hidden');
    document.getElementById('group-modal').classList.add('flex');
}

function closeGroupModal() {
    document.getElementById('group-modal').classList.add('hidden');
    document.getElementById('group-modal').classList.remove('flex');
    document.getElementById('group-form').reset();
    document.getElementById('group-error').textContent = '';
}

function showPartnerModal() {
    document.getElementById('partner-modal').classList.remove('hidden');
    document.getElementById('partner-modal').classList.add('flex');
}

function closePartnerModal() {
    document.getElementById('partner-modal').classList.add('hidden');
    document.getElementById('partner-modal').classList.remove('flex');
    document.getElementById('partner-form').reset();
    document.getElementById('partner-error').textContent = '';
}

// ===== FRIENDS & DM MANAGEMENT =====
window.currentDMTargetId = null;

function showFriendModal() {
    document.getElementById('friend-modal').classList.remove('hidden');
    document.getElementById('friend-modal').classList.add('flex');
}

function closeFriendModal() {
    document.getElementById('friend-modal').classList.add('hidden');
    document.getElementById('friend-modal').classList.remove('flex');
    document.getElementById('friend-search-id').value = '';
    closeDMChat(); // reset view
}

async function searchFriendProfile() {
    const code = document.getElementById('friend-search-id').value.trim();
    const errorEl = document.getElementById('friend-search-error');
    const resultEl = document.getElementById('friend-search-result');
    const token = localStorage.getItem('token');
    
    errorEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    
    if (!code || code.length !== 4) {
        errorEl.textContent = 'Lütfen geçerli 4 haneli ID girin.';
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch(`/api/social?type=friends&action=profile&uniqueId=${code}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (!res.ok || !data.profile) {
            throw new Error(data.error || 'Kullanıcı bulunamadı.');
        }

        // Show profile
        document.getElementById('friend-result-name').textContent = data.profile.name || 'Bilinmeyen Kullanıcı';
        document.getElementById('friend-result-type').textContent = `ID #${data.profile.uniqueId}`;
        
        if (data.profile.avatar) {
            document.getElementById('friend-result-icon').classList.add('hidden');
            const img = document.getElementById('friend-result-avatar');
            img.src = data.profile.avatar;
            img.classList.remove('hidden');
        } else {
            document.getElementById('friend-result-icon').classList.remove('hidden');
            document.getElementById('friend-result-avatar').classList.add('hidden');
        }
        
        window.currentDMTargetId = data.profile.uniqueId;
        resultEl.classList.remove('hidden');
        
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
    }
}

function startDMChat() {
    document.getElementById('friend-search-result').classList.add('hidden');
    document.getElementById('friend-search-id').parentElement.classList.add('hidden');
    document.getElementById('dm-target-name').textContent = `Mesaj: #${window.currentDMTargetId}`;
    
    const dmSection = document.getElementById('friend-dm-section');
    dmSection.classList.remove('hidden');
    dmSection.classList.add('flex');
    
    loadFriendDMs();
}

function closeDMChat() {
    document.getElementById('friend-dm-section').classList.add('hidden');
    document.getElementById('friend-dm-section').classList.remove('flex');
    document.getElementById('friend-search-id').parentElement.classList.remove('hidden');
    document.getElementById('friend-search-result').classList.add('hidden');
    window.currentDMTargetId = null;
}

async function loadFriendDMs() {
    const token = localStorage.getItem('token');
    const targetId = window.currentDMTargetId;
    if (!targetId || !token) return;

    try {
        const res = await fetch(`/api/social?type=friends&action=dm&targetId=${targetId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        const msgBox = document.getElementById('friend-dm-messages');
        
        if (!data.messages || data.messages.length === 0) {
            msgBox.innerHTML = '<p class="text-center text-slate-500 text-xs mt-10">Henüz mesaj yok, merhaba de!</p>';
            return;
        }
        
        const uStr = localStorage.getItem('user');
        const myId = uStr ? JSON.parse(uStr).id : 'missing';
        
        msgBox.innerHTML = data.messages.map(msg => {
            const isMe = msg.senderId === myId;
            return `
                <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
                    <div class="${isMe ? 'bg-amber-600' : 'bg-slate-700'} rounded-lg px-3 py-1.5 max-w-[80%]">
                        <p class="text-xs font-bold ${isMe ? 'text-amber-200' : 'text-indigo-300'}">${isMe ? 'Sen' : msg.senderName}</p>
                        <p class="text-white">${msg.content}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        msgBox.scrollTop = msgBox.scrollHeight;
    } catch (err) {
        console.error('Load DM error:', err);
    }
}

async function sendFriendDM() {
    const token = localStorage.getItem('token');
    const targetId = window.currentDMTargetId;
    const input = document.getElementById('friend-dm-input');
    const content = input.value.trim();
    
    if (!content || !targetId || !token) return;

    try {
        const res = await fetch('/api/social?type=friends&action=dm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ targetId, content })
        });
        
        if (res.ok) {
            input.value = '';
            loadFriendDMs();
        }
    } catch (err) {
        console.error('Send DM error:', err);
    }
}

// Create Study Group
async function createStudyGroup(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    
    if (!token) {
        showToast('Lütfen giriş yapın', 'error');
        return;
    }

    const formData = {
        name: document.getElementById('group-name').value,
        description: document.getElementById('group-description').value,
        subject: document.getElementById('group-subject').value,
        isPublic: document.getElementById('group-is-public').checked
    };

    if (!formData.name || !formData.description || !formData.subject) {
        document.getElementById('group-error').textContent = 'Tüm alanlar doldurulmalı';
        return;
    }

    try {
        const res = await fetch('/api/social?type=groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Grup oluşturulamadı');
        }

        showToast('✅ Çalışma grubu başarıyla oluşturuldu!', 'success');
        closeGroupModal();
        loadStudyGroups();
    } catch (err) {
        console.error('Create group error:', err);
        document.getElementById('group-error').textContent = err.message || 'Hata oluştu';
    }
}

// Join Study Group
async function joinStudyGroup(groupId) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        showToast('Lütfen giriş yapın', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/social?type=groups&action=join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ groupId })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Gruba katılamadı');
        }

        showToast('✅ Gruba başarıyla katıldınız!', 'success');
        loadStudyGroups();
        viewGroupDetail(groupId);
    } catch (err) {
        console.error('Join group error:', err);
        showToast(err.message || 'Hata oluştu', 'error');
    }
}

// View Group Details
async function viewGroupDetail(groupId) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        showToast('Lütfen giriş yapın', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/social?type=groups&id=${groupId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error('Grup bulunamadı');
        }

        const data = await res.json();
        const group = data.group;
        const isOwner = data.isOwner;

        // Hide list, show detail
        document.getElementById('groups-list').classList.add('hidden');
        document.getElementById('group-detail-container').classList.remove('hidden');

        // Fill group info
        document.getElementById('group-detail-name').textContent = group.name;
        document.getElementById('group-detail-desc').textContent = group.description;
        document.getElementById('group-detail-subject').textContent = group.subject || 'Genel';
        document.getElementById('group-member-count').textContent = group.members.length;
        
        const typeSpan = document.getElementById('group-detail-type');
        typeSpan.className = group.isPublic ? 'px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium' : 'px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium';
        typeSpan.textContent = group.isPublic ? '🔓 Halka Açık' : '🔒 Özel';

        // Show/hide admin actions
        const actionDiv = document.getElementById('group-actions');
        if (isOwner) {
            actionDiv.innerHTML = `
                <button onclick="switchGroupTab('settings')" class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30">⚙️ Ayarlar</button>
                <button onclick="leaveGroup('${groupId}')" class="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30">🚪 Çık</button>
            `;
        } else {
            actionDiv.innerHTML = `<button onclick="leaveGroup('${groupId}')" class="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30">🚪 Grubdan Çık</button>`;
        }

        // Load members
        loadGroupMembers(groupId, group.members);

        // Load messages
        loadGroupMessages(groupId);

        // Store current group ID for later use
        window.currentGroupId = groupId;
        window.currentGroupIsOwner = isOwner;

        // Setup settings form if owner
        if (isOwner) {
            document.getElementById('group-edit-name').value = group.name;
            document.getElementById('group-edit-desc').value = group.description;
            document.getElementById('group-edit-subject').value = group.subject || 'Genel';
            document.getElementById('group-edit-public').checked = group.isPublic;
        }

    } catch (err) {
        console.error('View group detail error:', err);
        showToast(err.message || 'Hata oluştu', 'error');
    }
}

// Back to Groups List
function backToGroupsList() {
    document.getElementById('group-detail-container').classList.add('hidden');
    document.getElementById('groups-list').classList.remove('hidden');
    document.getElementById('group-chat-tab').classList.remove('hidden');
    document.getElementById('group-members-tab').classList.add('hidden');
    document.getElementById('group-settings-tab').classList.add('hidden');
    window.currentGroupId = null;
}

// Switch between tabs
function switchGroupTab(tabName) {
    // Hide all tabs
    document.getElementById('group-chat-tab').classList.add('hidden');
    document.getElementById('group-members-tab').classList.add('hidden');
    document.getElementById('group-settings-tab').classList.add('hidden');

    // Remove active styling from all buttons
    document.getElementById('btn-chat-tab').classList.remove('border-teal-500', 'text-teal-400');
    document.getElementById('btn-members-tab').classList.remove('border-teal-500', 'text-teal-400');
    document.getElementById('btn-settings-tab-group').classList.remove('border-teal-500', 'text-teal-400');

    // Show selected tab
    if (tabName === 'chat') {
        document.getElementById('group-chat-tab').classList.remove('hidden');
        document.getElementById('btn-chat-tab').classList.add('border-teal-500', 'text-teal-400');
    } else if (tabName === 'members') {
        document.getElementById('group-members-tab').classList.remove('hidden');
        document.getElementById('btn-members-tab').classList.add('border-teal-500', 'text-teal-400');
    } else if (tabName === 'settings') {
        if (!window.currentGroupIsOwner) {
            showToast('Sadece grup sahibi ayarları değiştirebilir', 'error');
            return;
        }
        document.getElementById('group-settings-tab').classList.remove('hidden');
        document.getElementById('btn-settings-tab-group').classList.add('border-teal-500', 'text-teal-400');
    }
}

// Load Group Members
function loadGroupMembers(groupId, members) {
    const membersList = document.getElementById('group-members-list');
    
    if (!members || members.length === 0) {
        membersList.innerHTML = '<p class="text-slate-500">Üye yok</p>';
        return;
    }

    membersList.innerHTML = members.map(memberId => `
        <div class="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                    ${memberId[0].toUpperCase()}
                </div>
                <span class="text-slate-300 text-sm">${memberId}</span>
            </div>
            <div class="flex gap-1">
                ${window.currentGroupIsOwner && memberId !== 'owner' ? `
                    <button onclick="removeGroupMember('${groupId}', '${memberId}')" class="text-red-400 hover:text-red-300 text-xs">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Load Group Messages
async function loadGroupMessages(groupId) {
    const token = localStorage.getItem('token');
    
    if (!token) return;

    try {
        const res = await fetch(`/api/social?type=groups&id=${groupId}&action=messages&limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Mesajlar alınamadı');

        const data = await res.json();
        const messages = data.messages || [];

        const messagesDiv = document.getElementById('group-messages');
        
        if (messages.length === 0) {
            messagesDiv.innerHTML = '<p class="text-slate-500 text-center">Henüz mesaj yok. Sohbet başlat!</p>';
            return;
        }

        messagesDiv.innerHTML = messages.map(msg => `
            <div class="mb-3 text-sm">
                <p class="text-teal-400 text-xs font-semibold">${msg.senderId}</p>
                <p class="text-slate-300 bg-white/5 p-2 rounded mt-1">${msg.content}</p>
                <p class="text-slate-500 text-xs mt-1">${new Date(msg.timestamp).toLocaleTimeString('tr-TR')}</p>
            </div>
        `).join('');

        // Scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (err) {
        console.error('Load messages error:', err);
    }
}

// Send Group Message
async function sendGroupMessage() {
    const token = localStorage.getItem('token');
    const groupId = window.currentGroupId;
    const input = document.getElementById('group-message-input');
    const content = input.value.trim();

    if (!token || !groupId || !content) {
        showToast('Mesaj boş olamaz', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/social?type=groups&id=${groupId}&action=message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        if (!res.ok) throw new Error('Mesaj gönderilemedi');

        input.value = '';
        loadGroupMessages(groupId);
    } catch (err) {
        console.error('Send message error:', err);
        showToast(err.message || 'Hata oluştu', 'error');
    }
}

// Update Group Settings
async function updateGroupSettings() {
    const token = localStorage.getItem('token');
    const groupId = window.currentGroupId;

    if (!token || !groupId || !window.currentGroupIsOwner) {
        showToast('Yetkisiz işlem', 'error');
        return;
    }

    const formData = {
        name: document.getElementById('group-edit-name').value,
        description: document.getElementById('group-edit-desc').value,
        subject: document.getElementById('group-edit-subject').value,
        isPublic: document.getElementById('group-edit-public').checked
    };

    try {
        const res = await fetch(`/api/social?type=groups&id=${groupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        if (!res.ok) throw new Error('Ayarlar güncellenemedi');

        showToast('✅ Grup ayarları güncellendi', 'success');
        viewGroupDetail(groupId);
    } catch (err) {
        console.error('Update settings error:', err);
        showToast(err.message || 'Hata oluştu', 'error');
    }
}

// Delete Group
async function deleteGroup() {
    const token = localStorage.getItem('token');
    const groupId = window.currentGroupId;

    if (!token || !groupId || !window.currentGroupIsOwner) {
        showToast('Yetkisiz işlem', 'error');
        return;
    }

    if (!confirm('Grubu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        return;
    }

    try {
        const res = await fetch(`/api/social?type=groups&id=${groupId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Grup silinemedi');

        showToast('✅ Grup silindi', 'success');
        backToGroupsList();
        loadStudyGroups();
    } catch (err) {
        console.error('Delete group error:', err);
        showToast(err.message || 'Hata oluştu', 'error');
    }
}

// Leave Group
async function leaveGroup(groupId) {
    const token = localStorage.getItem('token');

    if (!token) {
        showToast('Lütfen giriş yapın', 'error');
        return;
    }

    if (!confirm('Gruptan çıkmak istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const res = await fetch(`/api/social?type=groups&id=${groupId}&action=leave`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Grupdan çıkılamadı');

        showToast('✅ Gruptan çıktınız', 'success');
        backToGroupsList();
        loadStudyGroups();
    } catch (err) {
        console.error('Leave group error:', err);
        showToast(err.message || 'Hata oluştu', 'error');
    }
}

// Remove Member from Group
async function removeGroupMember(groupId, memberId) {
    const token = localStorage.getItem('token');

    if (!token || !window.currentGroupIsOwner) {
        showToast('Yetkisiz işlem', 'error');
        return;
    }

    if (!confirm('Bu üyeyi gruptan çıkarmak istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const res = await fetch(`/api/social?type=groups&id=${groupId}&action=removeMember`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ memberId })
        });

        if (!res.ok) throw new Error('Üye çıkarılamadı');

        showToast('✅ Üye gruptan çıkarıldı', 'success');
        viewGroupDetail(groupId);
    } catch (err) {
        console.error('Remove member error:', err);
        showToast(err.message || 'Hata oluştu', 'error');
    }
}

// Add Accountability Partner
async function addAccountabilityPartner(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');

    if (!token) {
        showToast('Lütfen giriş yapın', 'error');
        return;
    }

    const formData = {
        partnerEmail: document.getElementById('partner-email').value,
        note: document.getElementById('partner-note').value
    };

    try {
        const res = await fetch('/api/social?type=partners', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Partner eklenemedi');
        }

        showToast('✅ Hesap verme partneri eklendi!', 'success');
        closePartnerModal();
        loadAccountability();
    } catch (err) {
        console.error('Add partner error:', err);
        document.getElementById('partner-error').textContent = err.message || 'Hata oluştu';
    }
}

// Initialize form submits
document.addEventListener('DOMContentLoaded', () => {
    const groupForm = document.getElementById('group-form');
    if (groupForm) {
        groupForm.addEventListener('submit', createStudyGroup);
    }

    const partnerForm = document.getElementById('partner-form');
    if (partnerForm) {
        partnerForm.addEventListener('submit', addAccountabilityPartner);
    }
});

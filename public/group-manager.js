// ===== STUDY GROUP MANAGEMENT MODULE (DISCORD STYLE) =====
let socket;
window.currentGroupId = null;
window.currentChannelId = 'genel';
window.currentGroupIsOwner = false;

// Initialize Socket.io
function initGroupSocket() {
    if (socket) return;
    try {
        socket = io();
        updateSocketListener();
        
        socket.on('connect', () => {
            if (window.currentGroupId) {
                const room = window.currentChannelId === 'genel' ? window.currentGroupId : `${window.currentGroupId}_${window.currentChannelId}`;
                socket.emit('join_room', room);
            }
        });
    } catch (e) {
        console.error('Socket initialization failed:', e);
    }
}

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
    
    if (!code) {
        errorEl.textContent = 'Lütfen bir isim veya 4 haneli ID girin.';
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        const queryParam = code.length === 4 && !isNaN(code) ? `uniqueId=${code}` : `query=${encodeURIComponent(code)}`;
        const res = await fetch(`/api/social?type=friends&action=profile&${queryParam}`, {
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
        
        window.currentDMTargetId = data.profile.id; // Gerçek ID'yi sakla
        window.currentDMUniqueId = data.profile.uniqueId; // 4 haneli kodu da sakla
        resultEl.classList.remove('hidden');
        
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
    }
}

function startDMChat() {
    document.getElementById('friend-search-result').classList.add('hidden');
    document.getElementById('friend-search-id').parentElement.classList.add('hidden');
    document.getElementById('dm-target-name').textContent = `Mesaj: @${document.getElementById('friend-result-name').textContent}`;
    
    const dmSection = document.getElementById('friend-dm-section');
    dmSection.classList.remove('hidden');
    dmSection.classList.add('flex');
    
    // Socket odasına katıl
    if (socket) {
        const uStr = localStorage.getItem('user');
        if (uStr) {
            const myId = JSON.parse(uStr).id;
            const conversationId = [myId, window.currentDMTargetId].sort().join('_');
            socket.emit('join_room', `dm_${conversationId}`);
        }
    }

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
            const data = await res.json();
            input.value = '';
            loadFriendDMs();
            if (data.xpGained && typeof window.showXP === 'function') {
                window.showXP(data.xpGained);
            } else if (data.xpGained) {
                showToast(`+${data.xpGained} XP Kazandın!`, 'success');
            }
        }
    } catch (err) {
        console.error('Send DM error:', err);
    }
}

// Create Study Group
async function createStudyGroup(event) {
    if(event) event.preventDefault();
    const token = localStorage.getItem('token');
    
    if (!token) {
        showToast('Lütfen giriş yapın', 'error');
        return;
    }

    const formData = {
        name: document.getElementById('group-name').value,
        description: document.getElementById('group-description').value,
        subject: document.getElementById('group-subject').value,
        isPublic: document.getElementById('group-is-public').checked,
        avatarUrl: document.getElementById('group-avatar-preview').src,
        noLinks: document.getElementById('group-no-links').checked,
        noAds: document.getElementById('group-no-ads').checked
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
        if (!res.ok) throw new Error(data.error || 'Gruba katılamadı');

        showToast('✅ Gruba başarıyla katıldınız!', 'success');
        loadStudyGroups();
        // Hemen odaya gir (SPA içi)
        viewGroupDetail(groupId);
    } catch (err) {
        console.error('Join group error:', err);
        showToast(err.message || 'Hata oluştu', 'error');
    }
}

async function joinGroupByCode() {
    const code = document.getElementById('group-join-code-input').value.trim();
    const token = localStorage.getItem('token');
    
    if (!code || code.length !== 4) {
        showToast('4 haneli geçerli bir kod girin!', 'error');
        return;
    }

    try {
        const res = await fetch('/api/social?type=groups&action=joinByCode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ joinCode: code })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Grup bulunamadı veya katılamadı');
        
        showToast('✅ Grubun kodunu çözdün! Başarıyla katıldın.', 'success');
        document.getElementById('group-join-code-input').value = '';
        loadStudyGroups();
        // Hemen odaya gir (SPA içi)
        viewGroupDetail(data.groupId);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// View Group Details
async function viewGroupDetail(groupId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Lütfen giriş yapın', 'error');
        return;
    }

    // Modern Discord tarzı chat sayfasına yönlendir
    window.location.href = `discord.html?groupId=${groupId}`;
}



function renderChannels(channels) {
    const textContainer = document.getElementById('group-text-channels');
    const voiceContainer = document.getElementById('group-voice-channels');
    
    textContainer.innerHTML = '';
    voiceContainer.innerHTML = '';

    if (channels.length === 0) {
        // Fallback if no channels exist (for old groups)
        channels = [
            { id: 'genel', name: 'Genel Sohbet', type: 'text' },
            { id: 'yardim', name: 'Yardımlaşma', type: 'text' },
            { id: 'sesli', name: 'Sesli Çalışma', type: 'voice' }
        ];
    }

    channels.forEach(ch => {
        const isActive = window.currentChannelId === ch.id;
        const html = `
            <div onclick="switchGroupChannel('${ch.id}', '${ch.type}', '${ch.name}')" 
                class="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}">
                <i class="fa-solid ${ch.type === 'text' ? 'fa-hashtag' : 'fa-volume-high'} text-xs opacity-50"></i>
                <span class="text-xs font-medium truncate">${ch.name}</span>
            </div>
        `;
        if (ch.type === 'text') textContainer.insertAdjacentHTML('beforeend', html);
        else voiceContainer.insertAdjacentHTML('beforeend', html);
    });
}

function switchGroupChannel(channelId, type, name) {
    if (type === 'voice') {
        showToast('🔊 Sesli kanal özelliği çok yakında! WebRTC entegrasyonu üzerinde çalışıyoruz.', 'info');
        return;
    }

    window.currentChannelId = channelId;
    document.getElementById('current-channel-name').textContent = name;
    document.getElementById('group-message-input').placeholder = `#${name} kanalına mesaj gönder...`;
    
    // Join socket room
    if (socket) {
        const room = channelId === 'genel' ? window.currentGroupId : `${window.currentGroupId}_${channelId}`;
        socket.emit('join_room', room);
    }

    // Refresh Sidebar to show active state
    loadStudyGroups().then(() => {
        // Actually we need to re-render channels but we'll do it from local cache or re-fetch group
        fetchGroupAndRefetchChannels();
    });

    loadGroupMessages(window.currentGroupId, channelId);
}

async function fetchGroupAndRefetchChannels() {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/social?type=groups&id=${window.currentGroupId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
        const data = await res.json();
        renderChannels(data.group.channels || []);
    }
}

// Back to Groups List
function backToGroupsList() {
    document.getElementById('group-detail-container').classList.add('hidden');
    document.getElementById('group-detail-container').classList.remove('flex');
    document.getElementById('groups-list').classList.remove('hidden');
    window.currentGroupId = null;
    window.currentChannelId = 'genel';
}

// Load Group Messages
async function loadGroupMessages(groupId, channelId = 'genel') {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`/api/social?type=groups&id=${groupId}&action=messages&channelId=${channelId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Mesajlar alınamadı');

        const data = await res.json();
        const messages = data.messages || [];
        const messagesDiv = document.getElementById('group-messages');
        
        messagesDiv.innerHTML = '';
        if (messages.length === 0) {
            messagesDiv.innerHTML = '<p class="text-slate-500 text-center py-10 text-xs">Bu kanalda henüz mesaj yok. İlk mesajı sen gönder!</p>';
        } else {
            messages.forEach(msg => appendMessageToUI(msg, false));
        }

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (err) {
        console.error('Load messages error:', err);
    }
}

function appendMessageToUI(msg, scroll = true) {
    const messagesDiv = document.getElementById('group-messages');
    if (!messagesDiv) return;

    // Check if message belongs to current channel (this is simplified as socket room handles segregation)
    
    const time = new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`;
    
    // Sıralı mesaj kontrolü (WhatsApp tarzı)
    const lastMsg = messagesDiv.lastElementChild;
    let isSequential = false;
    if (lastMsg) {
        const prevSender = lastMsg.getAttribute('data-sender');
        const prevTime = parseInt(lastMsg.getAttribute('data-time'));
        if (prevSender === msg.senderId && (msg.timestamp - prevTime) < (5 * 60 * 1000)) {
            isSequential = true;
        }
    }

    let attachmentHtml = '';
    if (msg.attachment) {
        if (msg.attachment.type.startsWith('image/')) {
            attachmentHtml = `<div class="mt-1 max-w-[200px] rounded overflow-hidden border border-white/10"><img src="${msg.attachment.data}" class="w-full"></div>`;
        } else {
            attachmentHtml = `<div class="mt-1 p-2 bg-white/5 rounded text-[10px] flex items-center gap-1"><i class="fa-solid fa-file opacity-50"></i> <span class="truncate">${msg.attachment.name}</span></div>`;
        }
    }
    
    let html = '';
    if (isSequential) {
        html = `
            <div class="group relative py-0.5 animate-fade-in pl-14" data-sender="${msg.senderId}" data-time="${msg.timestamp}">
                <span class="absolute left-0 text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 top-1 w-12 text-right">${time}</span>
                <p class="text-slate-300 text-sm break-words">${msg.content}</p>
                ${attachmentHtml}
            </div>
        `;
    } else {
        html = `
            <div class="flex items-start gap-4 group hover:bg-white/3 p-1 rounded-lg transition-all animate-fade-in" data-sender="${msg.senderId}" data-time="${msg.timestamp}">
                <img src="${avatar}" class="w-10 h-10 rounded-xl bg-slate-700 p-0.5 mt-0.5">
                <div class="flex-1 overflow-hidden">
                    <div class="flex items-center gap-2">
                        <span class="text-teal-400 font-bold text-sm">${msg.senderName || msg.senderId}</span>
                        <span class="text-[10px] text-slate-500">${time}</span>
                    </div>
                    <p class="text-slate-300 text-sm break-words">${msg.content}</p>
                    ${attachmentHtml}
                </div>
            </div>
        `;
    }
    
    // Remove "no messages" placeholder if exists
    if (messagesDiv.querySelector('.text-slate-500')) {
        messagesDiv.innerHTML = '';
    }
    
    messagesDiv.insertAdjacentHTML('beforeend', html);
    if (scroll) messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Mesaj çakışmasını önlemek için yerel ID takibi
let lastSentMsgId = null;

async function sendGroupMessage() {
    const token = localStorage.getItem('token');
    const uStr = localStorage.getItem('user');
    const groupId = window.currentGroupId;
    const channelId = window.currentChannelId;
    const input = document.getElementById('group-message-input');
    const content = input.value.trim();

    if (!token || !groupId || !content) return;

    // Optimistic UI: Mesajı anında ekrana bas
    const myUser = uStr ? JSON.parse(uStr) : { id: 'Sen', name: 'Sen' };
    const myId = myUser.id;
    const tempMsg = {
        senderId: myUser.name || myId.substring(0, 5),
        content,
        timestamp: Date.now(),
        isTemp: true // Geçici olduğunu belirt
    };
    
    // Ekrana anında ekle
    appendMessageToUI(tempMsg, true);
    input.value = ''; // Girişi temizle
    input.focus();

    try {
        const res = await fetch(`/api/social?type=groups&id=${groupId}&action=message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content, channelId })
        });

        if (!res.ok) throw new Error('Mesaj gönderilemedi');
        
        // Son gönderdiğimiz içeriği kaydet ki socketten geri gelince tekrar basmayalım
        lastSentMsgId = content + tempMsg.timestamp;
    } catch (err) {
        showToast('⚠️ Mesaj gönderilemedi, lütfen tekrar deneyin.', 'error');
        // İstersen burada mesajı ekrandan silebilir veya "hata" ikonu ekleyebilirsin
    }
}

// Socket dinleyicisini güncelle
function updateSocketListener() {
    if (!socket) return;
    socket.off('new_message'); 
    socket.off('new_dm');

    socket.on('new_message', (msg) => {
        const uStr = localStorage.getItem('user');
        const myName = uStr ? JSON.parse(uStr).name : null;
        if (msg.senderName === myName) return; 
        
        appendMessageToUI(msg, true);
    });

    socket.on('new_dm', (msg) => {
        // Eğer şu an bu kişiyle mesajlaşıyorsak mesajı ekrana bas
        const uStr = localStorage.getItem('user');
        if (!uStr) return;
        const myId = JSON.parse(uStr).id;
        const conversationId = [myId, window.currentDMTargetId].sort().join('_');

        if (msg.conversationId === conversationId) {
            loadFriendDMs(); // Basitçe listeyi yenile veya append et
        } else {
            showToast(`📩 Yeni mesaj: ${msg.senderName}`, 'info');
        }
    });
}

// Update Group Settings
async function updateGroupSettings() {
    const token = localStorage.getItem('token');
    const groupId = window.currentGroupId;

    if (!token || !groupId || !window.currentGroupIsOwner) return;

    const formData = {
        name: document.getElementById('group-edit-name').value,
        description: document.getElementById('group-edit-desc').value,
        isPublic: document.getElementById('group-edit-public').checked,
        noLinks: document.getElementById('group-edit-no-links').checked,
        noAds: document.getElementById('group-edit-no-ads').checked
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
        document.getElementById('group-settings-tab').classList.add('hidden');
        viewGroupDetail(groupId);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Delete Group
async function deleteGroup() {
    const token = localStorage.getItem('token');
    const groupId = window.currentGroupId;
    if (!token || !groupId || !window.currentGroupIsOwner) return;

    if (!confirm('Grubu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;

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
        showToast(err.message, 'error');
    }
}

// Leave Group
async function leaveGroup(groupId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!confirm('Gruptan çıkmak istediğinizden emin misiniz?')) return;

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
        showToast(err.message, 'error');
    }
}

// Tab Switching logic updated for Discord style (overlay/sidebar)
function switchGroupTab(tabName) {
    if (tabName === 'members') {
        const m = document.getElementById('group-members-tab');
        m.classList.toggle('hidden');
    } else if (tabName === 'settings') {
        const s = document.getElementById('group-settings-tab');
        s.classList.toggle('hidden');
    }
}

// Load Group Members
function loadGroupMembers(groupId, members) {
    const membersList = document.getElementById('group-members-list');
    if (!members || members.length === 0) {
        membersList.innerHTML = '<p class="text-slate-500 text-xs">Üye yok</p>';
        return;
    }

    document.getElementById('group-member-count').textContent = members.length;

    membersList.innerHTML = members.map(m => {
        const mId = typeof m === 'object' ? m.id : m;
        const status = typeof m === 'object' ? m.status : { text: 'Çevrimiçi', emoji: '🟢' };
        
        return `
            <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer">
                <div class="relative">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${mId}" class="w-8 h-8 rounded-full bg-slate-700">
                    <div class="absolute bottom-0 right-0 text-[8px] flex items-center justify-center bg-slate-900 rounded-full w-3.5 h-3.5 border border-white/10">
                        ${status.emoji}
                    </div>
                </div>
                <div class="overflow-hidden">
                    <p class="text-xs text-slate-300 font-bold truncate">${mId}</p>
                    <p class="text-[9px] text-slate-500">${status.text}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Friend & Partner Management
async function addAccountabilityPartner(event) {
    if(event) event.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

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
        if (!res.ok) throw new Error(data.error || 'Partner eklenemedi');

        showToast('✅ Hesap verme partneri eklendi!', 'success');
        closePartnerModal();
        loadAccountability();
    } catch (err) {
        document.getElementById('partner-error').textContent = err.message;
        document.getElementById('partner-error').classList.remove('hidden');
    }
}

// Global Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const groupForm = document.getElementById('group-form');
    if (groupForm) groupForm.addEventListener('submit', createStudyGroup);

    const partnerForm = document.getElementById('partner-form');
    if (partnerForm) partnerForm.addEventListener('submit', addAccountabilityPartner);
    
    // Message input enter key support
    const msgInput = document.getElementById('group-message-input');
    if (msgInput) {
        msgInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendGroupMessage();
        });
    }

    // Join code input enter support
    const joinInput = document.getElementById('group-join-code-input');
    if (joinInput) {
        joinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') joinGroupByCode();
        });
    }

    // Friend search input enter support
    const friendInput = document.getElementById('friend-search-id');
    if (friendInput) {
        friendInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchFriendProfile();
        });
    }

    // DM input enter support
    const dmInput = document.getElementById('friend-dm-input');
    if (dmInput) {
        dmInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendFriendDM();
        });
    }

    // Initialize Socket
    initGroupSocket();
});

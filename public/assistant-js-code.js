// AI Asistan - Mobil Uyumlu JavaScript
// Ozellikler: Emoji tepkiler, Persona secici, Kalici hafiza, Yansima, Sesli konusma, Dosya yukleme
(function() {
    'use strict';

    const elements = {
        chatContainer: document.getElementById('chatContainer'),
        messagesWrapper: document.getElementById('messagesWrapper'),
        welcomeScreen: document.getElementById('welcomeScreen'),
        messageInput: document.getElementById('messageInput'),
        typingIndicator: document.getElementById('typingIndicator'),
        btnSend: document.getElementById('btnSend'),
        btnNewChat: document.getElementById('btnNewChat'),
        btnHistory: document.getElementById('btnHistory'),
        btnEmoji: document.getElementById('btnEmoji'),
        btnAttach: document.getElementById('btnAttach'),
        btnVoice: document.getElementById('btnVoice'),
        btnTools: document.getElementById('btnTools')
    };

    const state = {
        messages: [],
        isTyping: false,
        currentConversationId: null,
        conversationHistory: [],
        attachedFiles: [],
        generatedFiles: [],
        currentPersona: 'empathetic',
        userMemory: {},
        currentMessageId: null,
        isRecording: false,
        voiceConversation: false,
        recognition: null
    };

    const PERSONAS = {
        empathetic: { name: 'Empatik Rehber', icon: '💚', style: 'warm' },
        disciplined: { name: 'Sert Disipliner', icon: '⚡', style: 'strict' },
        socratic: { name: 'Sokratik Bilge', icon: '🧠', style: 'philosophical' }
    };

    function init() {
        bindEvents();
        loadConversationHistory();
        loadUserMemory();
        loadPersona();
        setupInputAutoResize();
        setupKeyboardHandling();
        setupFileUpload();
        showReflectionOnWelcome();
    }

    function bindEvents() {
        elements.btnSend.addEventListener('click', handleSendMessage);
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
        elements.btnNewChat.addEventListener('click', startNewChat);
        elements.btnHistory.addEventListener('click', showHistory);
        elements.btnEmoji.addEventListener('click', toggleEmojiPicker);
        elements.btnAttach.addEventListener('click', () => {
            document.getElementById('fileInput')?.click();
        });
        elements.btnVoice.addEventListener('click', toggleVoiceInput);
        elements.btnTools.addEventListener('click', () => showToast('Araclar menusu yakinda'));
    }

    function handleSendMessage() {
        const text = elements.messageInput.value.trim();
        if ((!text && state.attachedFiles.length === 0) || state.isTyping) return;
        let messageText = text;
        if (state.attachedFiles.length > 0) {
            const fileNames = state.attachedFiles.map(f => f.name).join(', ');
            messageText += messageText ? '\n[Eklenen dosyalar: ' + fileNames + ']' : '[Dosyalar: ' + fileNames + ']';
        }
        addMessage(messageText, 'user');
        elements.messageInput.value = '';
        resetInputHeight();
        hideWelcomeScreen();
        hideReflection();
        
        // Deep Search Integration
        if (deepSearchMode && text) {
            processMessageWithDeepSearch(text);
        } else {
            processMessageWithFiles(text);
        }
    }

    async function processMessageWithDeepSearch(text) {
        state.isTyping = true;
        showTypingIndicator();
        
        // Perform deep search
        const searchResults = await performDeepSearch(text);
        
        // Process with AI after search
        setTimeout(() => {
            hideTypingIndicator();
            if (searchResults.length > 0) {
                const persona = PERSONAS[state.currentPersona];
                const name = state.userMemory.name || '';
                const greeting = name ? name + ', ' : '';
                let aiResponse = '';
                
                if (state.currentPersona === 'empathetic') {
                    aiResponse = greeting + 'Web aramasi sonuclarini inceledim. Bulduğum bilgileri seninle paylaşmak istiyorum. Yukaridaki sonuclara bakabilirsin.';
                } else if (state.currentPersona === 'disciplined') {
                    aiResponse = greeting + 'Arama tamamlandi! Bulduğum kaynaklari incele ve aksiyon al.';
                } else {
                    aiResponse = greeting + 'İlginc bulgular! Bu kaynaklari nasil degerlendiriyorsun?';
                }
                
                addMessage(aiResponse, 'assistant');
            } else {
                simulateAIResponse(text);
            }
            state.isTyping = false;
        }, 1000);
    }

    function addMessage(text, type) {
        const message = { id: Date.now(), text: text, type: type, timestamp: new Date(), reactions: {} };
        state.messages.push(message);
        const messageEl = createMessageElement(message);
        elements.messagesWrapper.appendChild(messageEl);
        scrollToBottom();
        saveCurrentConversation();
    }

    function createMessageElement(message) {
        const div = document.createElement('div');
        div.className = 'message ' + message.type;
        div.setAttribute('data-message-id', message.id);
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = message.type === 'user' ? '👤' : '🍃';
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-content-wrapper';
        contentWrapper.innerHTML = formatMessageText(message.text);
        const reactionsEl = document.createElement('div');
        reactionsEl.className = 'message-reactions';
        reactionsEl.innerHTML = '<button class="add-reaction-btn" onclick="window.AIAssistant.setCurrentMessageId(' + message.id + '); window.AIAssistant.toggleEmojiPicker()" title="Tepki ekle">+</button>';
        contentWrapper.appendChild(reactionsEl);
        div.appendChild(avatar);
        div.appendChild(contentWrapper);
        return div;
    }

    function formatMessageText(text) {
        if (!text) return '';
        if (text.includes('|') && text.includes('\n')) text = formatTables(text);
        text = text.replace(/^• (.+)$/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>');
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        const paragraphs = text.split('\n\n');
        return paragraphs.map(p => p.trim() ? '<p>' + p + '</p>' : '').join('');
    }

    function formatTables(text) {
        const lines = text.split('\n');
        let inTable = false, tableHTML = '<table class="message-table"><thead>', isHeader = true, result = [];
        for (const line of lines) {
            if (line.trim().startsWith('|')) {
                const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
                if (cells.length > 0) {
                    if (!inTable) inTable = true;
                    if (cells.every(c => c.match(/^[-:]+$/))) { tableHTML += '</thead><tbody>'; isHeader = false; continue; }
                    const cellTag = isHeader ? 'th' : 'td';
                    const row = cells.map(c => '<' + cellTag + '>' + c + '</' + cellTag + '>').join('');
                    tableHTML += '<tr>' + row + '</tr>';
                }
            } else {
                if (inTable) { tableHTML += '</tbody></table>'; result.push(tableHTML); tableHTML = '<table class="message-table"><thead>'; isHeader = true; inTable = false; }
                result.push(line);
            }
        }
        if (inTable) { tableHTML += isHeader ? '</thead>' : '</tbody>'; tableHTML += '</table>'; result.push(tableHTML); }
        return result.join('\n');
    }

    function processMessageWithFiles(text) {
        state.isTyping = true;
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            simulateAIResponse(text);
            state.isTyping = false;
        }, 1500);
    }

    function simulateAIResponse(userText) {
        const persona = PERSONAS[state.currentPersona];
        const name = state.userMemory.name || '';
        const greeting = name ? name + ', ' : '';
        let response = '';
        if (state.currentPersona === 'empathetic') response = greeting + 'Anliyorum, size bu konuda yardimci olabilirim. Ne hissettigini anlamaya calisiyorum.';
        else if (state.currentPersona === 'disciplined') response = greeting + 'Hadi yap! Bahane yok. Hedefe odaklan, aksiyona gec.';
        else response = greeting + 'Ilgin bir soru! Neden boyle dusunuyorsun? Birlikte derinlemesine inceleyelim.';
        addMessage(response, 'assistant');
    }

    function toggleEmojiPicker() {
        const picker = document.getElementById('emojiPicker');
        if (picker) picker.classList.toggle('active');
    }

    function setCurrentMessageId(id) { state.currentMessageId = id; }

    function addReaction(emoji) {
        if (!state.currentMessageId) return;
        const message = state.messages.find(m => m.id === state.currentMessageId);
        if (!message) return;
        if (!message.reactions) message.reactions = {};
        if (!message.reactions[emoji]) message.reactions[emoji] = 0;
        message.reactions[emoji]++;
        document.getElementById('emojiPicker')?.classList.remove('active');
        updateMessageReactions(state.currentMessageId);
        if (message.type === 'assistant') {
            setTimeout(() => {
                const aiReactions = ['💚', '⚡', '🧠', '👍', '✨'];
                addReactionToMessage(state.currentMessageId, aiReactions[Math.floor(Math.random() * aiReactions.length)]);
            }, 500);
        }
    }

    function addReactionToMessage(messageId, emoji) {
        const message = state.messages.find(m => m.id === messageId);
        if (!message) return;
        if (!message.reactions) message.reactions = {};
        if (!message.reactions[emoji]) message.reactions[emoji] = 0;
        message.reactions[emoji]++;
        updateMessageReactions(messageId);
    }

    function updateMessageReactions(messageId) {
        const messageEl = document.querySelector('[data-message-id="' + messageId + '"]');
        if (!messageEl) return;
        const message = state.messages.find(m => m.id === messageId);
        if (!message || !message.reactions) return;
        let reactionsEl = messageEl.querySelector('.message-reactions');
        if (!reactionsEl) { reactionsEl = document.createElement('div'); reactionsEl.className = 'message-reactions'; messageEl.querySelector('.message-content-wrapper')?.appendChild(reactionsEl); }
        let html = '';
        for (const [emoji, count] of Object.entries(message.reactions)) { if (count > 0) html += '<button class="reaction-btn active">' + emoji + ' <span class="count">' + count + '</span></button>'; }
        html += '<button class="add-reaction-btn" onclick="window.AIAssistant.setCurrentMessageId(' + messageId + '); window.AIAssistant.toggleEmojiPicker()">+</button>';
        reactionsEl.innerHTML = html;
    }

    function togglePersonaSelector() {
        const selector = document.getElementById('personaSelector');
        if (selector) selector.classList.toggle('active');
    }

    function selectPersona(personaId) {
        state.currentPersona = personaId;
        document.querySelectorAll('.persona-option').forEach(el => el.classList.remove('active'));
        const selected = document.querySelector('[data-persona="' + personaId + '"]');
        if (selected) selected.classList.add('active');
        try { localStorage.setItem('aiPersona', personaId); } catch (e) {}
        togglePersonaSelector();
        showToast(PERSONAS[personaId].icon + ' ' + PERSONAS[personaId].name + ' modu aktif');
    }

    function loadPersona() {
        try {
            const saved = localStorage.getItem('aiPersona');
            if (saved && PERSONAS[saved]) {
                state.currentPersona = saved;
                document.querySelectorAll('.persona-option').forEach(el => el.classList.remove('active'));
                const selected = document.querySelector('[data-persona="' + saved + '"]');
                if (selected) selected.classList.add('active');
            }
        } catch (e) {}
    }

    function toggleMemoryPanel() {
        const panel = document.getElementById('memoryPanel');
        const overlay = document.getElementById('memoryPanelOverlay');
        if (panel && overlay) { panel.classList.toggle('active'); overlay.classList.toggle('active'); }
    }

    function saveMemory() {
        const name = document.getElementById('memoryName')?.value || '';
        const goals = document.getElementById('memoryGoals')?.value || '';
        const interests = document.getElementById('memoryInterests')?.value || '';
        const challenges = document.getElementById('memoryChallenges')?.value || '';
        state.userMemory = { name, goals, interests, challenges };
        try { localStorage.setItem('userMemory', JSON.stringify(state.userMemory)); } catch (e) {}
        toggleMemoryPanel();
        showToast('🧠 Bilgilerin kaydedildi!');
        if (name) setTimeout(() => addMessage('Merhaba ' + name + '! Seni hatirliyorum. ' + (goals ? 'Hedeflerin: ' + goals.slice(0, 50) + '... ' : '') + 'Bu bilgilerle sana daha kisisellestirilmis destek sunabilirim.', 'assistant'), 500);
    }

    function loadUserMemory() {
        try {
            const saved = localStorage.getItem('userMemory');
            if (saved) {
                state.userMemory = JSON.parse(saved);
                const { name, goals, interests, challenges } = state.userMemory;
                if (document.getElementById('memoryName')) document.getElementById('memoryName').value = name || '';
                if (document.getElementById('memoryGoals')) document.getElementById('memoryGoals').value = goals || '';
                if (document.getElementById('memoryInterests')) document.getElementById('memoryInterests').value = interests || '';
                if (document.getElementById('memoryChallenges')) document.getElementById('memoryChallenges').value = challenges || '';
            }
        } catch (e) {}
    }

    function showReflectionOnWelcome() {
        const container = document.getElementById('reflectionContainer');
        if (container) container.style.display = 'block';
    }

    function hideReflection() {
        const container = document.getElementById('reflectionContainer');
        if (container) container.style.display = 'none';
    }

    function submitReflection() {
        const input = document.getElementById('reflectionInput');
        const text = input?.value?.trim();
        if (!text) { showToast('Lutfen dusuncelerini yaz'); return; }
        hideReflection();
        if (input) input.value = '';
        const emotionalState = analyzeEmotions(text);
        const name = state.userMemory.name || '';
        hideWelcomeScreen();
        addMessage('📝 Yansima: ' + text, 'user');
        setTimeout(() => {
            addEmotionalMessage(generateEmotionalUnderstanding(emotionalState));
            setTimeout(() => addMessage(generateEmotionalResponse(emotionalState, name), 'assistant'), 1000);
        }, 500);
    }

    function analyzeEmotions(text) {
        const emotions = {
            stress: /stres|baski|zor|yorgun|tuken/i.test(text),
            sadness: /uzgun|mutsuz|kotu/i.test(text),
            anxiety: /kaygi|endise|korku|panik/i.test(text),
            anger: /sinir|ofke|kizgin/i.test(text),
            happiness: /mutlu|iyi|harika|guzel/i.test(text),
            confusion: /kafam karisik|ne yapacagim/i.test(text),
            motivation: /istekli|hevesli|motivasyon/i.test(text)
        };
        const dominant = Object.entries(emotions).filter(([_, v]) => v).map(([k]) => k);
        return { emotions: emotions, dominant: dominant.length > 0 ? dominant : ['neutral'], intensity: text.length > 100 ? 'high' : text.length > 50 ? 'medium' : 'low' };
    }

    function generateEmotionalUnderstanding(emotionalState) {
        const mainEmotion = emotionalState.dominant[0];
        const understandings = {
            stress: 'Bu donemde stresli hissetmen cok normal. Kendini baski altinda hissediyorsun.',
            sadness: 'Uzgun oldugunu hissediyorum. Bu duygularin gecici oldugunu unutma.',
            anxiety: 'Kaygili ve endiseli gorunuyorsun. Derin bir nefes al, simdi buradayim.',
            anger: 'Sinirli ve haksizliga ugramis hissediyor olabilirsin. Bu duygunu anliyorum.',
            happiness: 'Mutlu ve enerjik hissediyorsun! Bu pozitif enerjiyi koru.',
            confusion: 'Kafan karisik gorunuyor. Secenekleri birlikte degerlendirelim.',
            motivation: 'Hedef odakli ve isteklisin! Bu motivasyonu yakalamak harika.',
            neutral: 'Bugunku durumunu anlamaya calisiyorum. Bana biraz daha anlatabilir misin?'
        };
        return understandings[mainEmotion] || understandings.neutral;
    }

    function generateEmotionalResponse(emotionalState, name) {
        const mainEmotion = emotionalState.dominant[0];
        const greeting = name ? name + ', ' : '';
        const persona = state.currentPersona;
        if (persona === 'empathetic') {
            const responses = { stress: greeting + 'Stresli oldugunu duyduguma uzuldum. Kucuk bir mola ver, nefes al.', sadness: greeting + 'Bu zor duygulari yasiyor olman normal. Seni dinliyorum.', anxiety: greeting + 'Kaygin oldugunu goruyorum. Su an guvendesin.', anger: greeting + 'Sinirlenmeni anliyorum.', happiness: greeting + 'Mutlulugunu paylastigin icin tesekkurler!', confusion: greeting + 'Kararsizlik zordur.', motivation: greeting + 'Bu motivasyon harika!', neutral: greeting + 'Anlatmaya devam et.' };
            return responses[mainEmotion] || responses.neutral;
        } else if (persona === 'disciplined') {
            const responses = { stress: greeting + 'Stres bahane degil. Durumu analiz et, aksiyon plani yap.', sadness: greeting + 'Uzulmek vakit kaybi. Enerjini hedeflerine yonlendir.', anxiety: greeting + 'Kaygi seni yavaslatir. Kontrol edebilecegin seylere odaklan.', anger: greeting + 'Ofke enerjisini donustur.', happiness: greeting + 'Harika! Bu enerjiyi kullan.', confusion: greeting + 'Kararsizlik = zaman kaybi.', motivation: greeting + 'Mukemmel! Motivasyonu yakaladin.', neutral: greeting + 'Net ol. Ne istiyorsun?' };
            return responses[mainEmotion] || responses.neutral;
        } else {
            const responses = { stress: greeting + 'Stres... Bu durum sana ne ogretiyor?', sadness: greeting + 'Uzuntu... Bu duygunun kaynagi nedir?', anxiety: greeting + 'Kaygi... Ne olmasindan korkuyorsun?', anger: greeting + 'Sinir... Haksizliga mi ugradin?', happiness: greeting + 'Mutluluk... Bu hissin kaynagi nedir?', confusion: greeting + 'Kararsizlik... Secenekler neler?', motivation: greeting + 'Motivasyon... Bu enerjinin kaynagi nedir?', neutral: greeting + 'Dusuncelerini daha derinlemesine anlamak istiyorum.' };
            return responses[mainEmotion] || responses.neutral;
        }
    }

    function addEmotionalMessage(text) {
        const div = document.createElement('div');
        div.className = 'emotional-response';
        div.innerHTML = '💭 ' + text;
        elements.messagesWrapper.appendChild(div);
        scrollToBottom();
    }

    function toggleVoiceInput() {
        if (state.voiceConversation) { stopVoiceConversation(); return; }
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { showToast('Tarayiciniz sesli girisi desteklemiyor'); return; }
        startVoiceConversation();
    }

    function startVoiceConversation() {
        state.voiceConversation = true;
        elements.btnVoice.style.color = '#ef4444';
        elements.btnVoice.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
        showToast('🎙️ Sesli konusma modu aktif - \"Dur\" diyerek bitirebilirsin');
        listenForVoice();
    }

    function stopVoiceConversation() {
        state.voiceConversation = false;
        elements.btnVoice.style.color = '';
        elements.btnVoice.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
        showToast('Sesli konusma sonlandirildi');
        if (state.recognition) state.recognition.stop();
    }

    function listenForVoice() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.recognition = new SpeechRecognition();
        const recognition = state.recognition;
        recognition.lang = 'tr-TR';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onstart = () => { state.isRecording = true; };
        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            if (transcript.toLowerCase().includes('dur') || transcript.toLowerCase().includes('bitir')) { stopVoiceConversation(); return; }
            if (transcript.trim()) { elements.messageInput.value = transcript; handleSendMessage(); }
        };
        recognition.onerror = (event) => { console.error('Speech error:', event.error); if (state.voiceConversation) setTimeout(() => { if (state.voiceConversation) listenForVoice(); }, 1000); };
        recognition.onend = () => { state.isRecording = false; if (state.voiceConversation) setTimeout(() => listenForVoice(), 500); };
        recognition.start();
    }

    function setupFileUpload() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'fileInput';
        fileInput.style.display = 'none';
        fileInput.accept = '.docx,.xlsx,.xls,.pptx,.ppt,.pdf,.txt,image/*';
        fileInput.multiple = true;
        document.body.appendChild(fileInput);
        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            await processFiles(files);
            fileInput.value = '';
        });

        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            
            chatContainer.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const files = Array.from(e.dataTransfer.files);
                    await processFiles(files);
                }
            });
        }
    }

    async function processFiles(files) {
        const MAX_SIZE = 500 * 1024 * 1024; // 500 MB
        for (const file of files) {
            if (file.size > MAX_SIZE) {
                showToast(file.name + ' boyutu çok büyük. Maksimum 500MB yükleyebilirsiniz.');
                continue;
            }
            await handleFileUpload(file);
        }
    }


    async function handleFileUpload(file) {
        const fileData = { id: Date.now() + Math.random(), name: file.name, type: file.type, size: file.size, file: file };
        state.attachedFiles.push(fileData);
        showFilePreview(fileData);
        showToast(file.name + ' yuklendi');
    }

    function showFilePreview(fileData) {
        const previewContainer = document.getElementById('filePreviewContainer') || createFilePreviewContainer();
        const fileIcon = getFileIcon(fileData.name);
        const preview = document.createElement('div');
        preview.className = 'file-preview-item';
        preview.dataset.fileId = fileData.id;
        preview.innerHTML = '<div class="file-preview-icon">' + fileIcon + '</div><div class="file-preview-name">' + fileData.name + '</div><button class="file-preview-remove" onclick="window.AIAssistant.removeFile(' + fileData.id + ')">×</button>';
        previewContainer.appendChild(preview);
        previewContainer.style.display = 'flex';
    }

    function createFilePreviewContainer() {
        const container = document.createElement('div');
        container.id = 'filePreviewContainer';
        container.className = 'file-preview-container';
        container.style.cssText = 'display:none;flex-wrap:wrap;gap:8px;padding:8px 16px;background:var(--bg-secondary);border-top:1px solid var(--border-color);';
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer?.parentNode) inputContainer.parentNode.insertBefore(container, inputContainer);
        return container;
    }

    function getFileIcon(filename) {
        const lowerName = filename.toLowerCase();
        if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) return '📄';
        if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) return '📊';
        if (lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt')) return '📽️';
        if (lowerName.endsWith('.pdf')) return '📑';
        if (lowerName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return '🖼️';
        return '📎';
    }

    function removeFile(fileId) {
        state.attachedFiles = state.attachedFiles.filter(f => f.id !== fileId);
        const preview = document.querySelector('[data-file-id="' + fileId + '"]');
        if (preview) preview.remove();
        const container = document.getElementById('filePreviewContainer');
        if (container && container.children.length === 0) container.style.display = 'none';
    }

    function showTypingIndicator() { elements.typingIndicator.classList.add('active'); scrollToBottom(); }
    function hideTypingIndicator() { elements.typingIndicator.classList.remove('active'); }
    function hideWelcomeScreen() { if (elements.welcomeScreen.style.display !== 'none') { elements.welcomeScreen.style.display = 'none'; elements.messagesWrapper.style.display = 'flex'; } }
    function showWelcomeScreen() { elements.welcomeScreen.style.display = 'flex'; elements.messagesWrapper.style.display = 'none'; elements.messagesWrapper.innerHTML = ''; }

    function startNewChat() {
        if (state.messages.length > 0) saveConversationToHistory();
        state.messages = []; state.attachedFiles = []; state.generatedFiles = []; state.currentConversationId = null;
        showWelcomeScreen(); showReflectionOnWelcome(); elements.messageInput.value = ''; resetInputHeight();
        const previewContainer = document.getElementById('filePreviewContainer');
        if (previewContainer) previewContainer.innerHTML = '';
        showToast('Yeni sohbet baslatildi');
    }

    function showHistory() {
        if (state.conversationHistory.length === 0) { showToast('Heniz gecmis konusma yok'); return; }
        showToast(state.conversationHistory.length + ' konusma kayitli');
    }

    function setupInputAutoResize() {
        const input = elements.messageInput;
        input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });
    }

    function resetInputHeight() { elements.messageInput.style.height = 'auto'; }

    function setupKeyboardHandling() {
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            window.addEventListener('resize', () => { setTimeout(() => { if (document.activeElement === elements.messageInput) scrollToBottom(); }, 100); });
        }
    }

    function scrollToBottom() { elements.chatContainer.scrollTo({ top: elements.chatContainer.scrollHeight, behavior: 'smooth' }); }

    function showToast(message) {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(20,184,166,0.9);color:white;padding:12px 24px;border-radius:24px;font-size:14px;font-weight:500;z-index:1000;backdrop-filter:blur(10px);';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    function saveCurrentConversation() {
        if (state.messages.length === 0) return;
        const conversation = { id: state.currentConversationId || Date.now(), title: state.messages[0].text.substring(0, 30) + '...', messages: [...state.messages], timestamp: new Date() };
        state.currentConversationId = conversation.id;
        try { localStorage.setItem('currentConversation', JSON.stringify(conversation)); } catch (e) {}
    }

    function saveConversationToHistory() {
        if (state.messages.length === 0) return;
        const conversation = { id: state.currentConversationId || Date.now(), title: state.messages[0].text.substring(0, 30) + '...', messageCount: state.messages.length, timestamp: new Date() };
        state.conversationHistory.unshift(conversation);
        if (state.conversationHistory.length > 20) state.conversationHistory = state.conversationHistory.slice(0, 20);
        try { localStorage.setItem('conversationHistory', JSON.stringify(state.conversationHistory)); } catch (e) {}
    }

    function loadConversationHistory() {
        try {
            const history = localStorage.getItem('conversationHistory');
            if (history) state.conversationHistory = JSON.parse(history);
            const current = localStorage.getItem('currentConversation');
            if (current) {
                const conversation = JSON.parse(current);
                if (conversation.messages && conversation.messages.length > 0) {
                    state.currentConversationId = conversation.id;
                    state.messages = conversation.messages;
                    hideWelcomeScreen();
                    conversation.messages.forEach(msg => { elements.messagesWrapper.appendChild(createMessageElement(msg)); });
                }
            }
        } catch (e) {}
    }

    window.AIAssistant = { 
        state: state, elements: elements, addMessage: addMessage, startNewChat: startNewChat,
        removeFile: removeFile, selectPersona: selectPersona, togglePersonaSelector: togglePersonaSelector,
        toggleMemoryPanel: toggleMemoryPanel, saveMemory: saveMemory, submitReflection: submitReflection,
        addReaction: addReaction, setCurrentMessageId: setCurrentMessageId, toggleEmojiPicker: toggleEmojiPicker,
        toggleVoiceInput: toggleVoiceInput
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

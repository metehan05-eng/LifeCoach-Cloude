// LifeCoach AI - Tüm Yeni Features için Initialization Module
// Bu dosya tüm API'ları initialize eder ve UI'ı hazırlar

class LifeCoachAI {
  constructor() {
    this.apiBase = '/api';
    this.token = localStorage.getItem('auth_token');
    this.features = {};
    this.init();
  }

  async init() {
    console.log('🚀 LifeCoach AI Sistem Başlatılıyor...');
    
    // Initialize all features
    this.initCoachingModes();
    this.initVoiceFeature();
    this.initMemory();
    this.initSuggestions();
    this.initAchievements();
    this.initStreaks();
    this.initSocialFeatures();
    this.initNotifications();
    this.initStressDetection();
    this.initLanguage();
    this.initLearningPaths();
    this.initOfflineMode();
    this.initPWA();
    
    console.log('✅ Tüm sistemler aktif!');
  }

  // 1. COACHING MODES
  initCoachingModes() {
    this.features.coachingModes = {
      available: ['mentor', 'therapist', 'drill_sergeant', 'friend', 'dream_coach'],
      current: localStorage.getItem('selected_mode') || 'mentor',
      
      async set(mode) {
        const response = await fetch(`${this.apiBase}/coaching-modes`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ modeId: mode })
        });
        if (response.ok) {
          this.current = mode;
          localStorage.setItem('selected_mode', mode);
          return response.json();
        }
      },
      
      async get() {
        const response = await fetch(`${this.apiBase}/coaching-modes`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        return response.json();
      }
    };
    
    // DOM element'ini oluştur
    this.createCoachingModesUI();
  }

  createCoachingModesUI() {
    const html = `
      <div id="coaching-modes-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-card-dark rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-2xl font-bold text-neon-teal mb-4">⚙️ Koçluk Modunu Seç</h3>
          
          <div class="space-y-3">
            <button class="mode-btn w-full p-3 text-left rounded-lg bg-surface-dark hover:bg-primary transition" data-mode="mentor">
              <span class="font-bold">🎯 Mentor</span>
              <p class="text-sm text-gray-400">Profesyonel rehberlik</p>
            </button>
            
            <button class="mode-btn w-full p-3 text-left rounded-lg bg-surface-dark hover:bg-primary transition" data-mode="therapist">
              <span class="font-bold">💚 Danışman</span>
              <p class="text-sm text-gray-400">Empatik dinleyici</p>
            </button>
            
            <button class="mode-btn w-full p-3 text-left rounded-lg bg-surface-dark hover:bg-primary transition" data-mode="drill_sergeant">
              <span class="font-bold">💪 Eğitmen</span>
              <p class="text-sm text-gray-400">Motivatör</p>
            </button>
            
            <button class="mode-btn w-full p-3 text-left rounded-lg bg-surface-dark hover:bg-primary transition" data-mode="friend">
              <span class="font-bold">😊 Arkadaş</span>
              <p class="text-sm text-gray-400">Samimi sohbet</p>
            </button>
            
            <button class="mode-btn w-full p-3 text-left rounded-lg bg-surface-dark hover:bg-primary transition" data-mode="dream_coach">
              <span class="font-bold">✨ Hayalperest</span>
              <p class="text-sm text-gray-400">Vizyoncu koç</p>
            </button>
          </div>
          
          <button onclick="document.getElementById('coaching-modes-modal').classList.add('hidden')" class="mt-4 w-full p-2 bg-gray-500 rounded-lg">Kapat</button>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Event listeners
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        this.features.coachingModes.set(mode);
      });
    });
  }

  // 2. VOICE FEATURE
  initVoiceFeature() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const synthesis = window.speechSynthesis;
    
    this.features.voice = {
      recognition: SpeechRecognition ? new SpeechRecognition() : null,
      synthesis: synthesis,
      isListening: false,
      
      async startListening() {
        if (!this.recognition) return;
        this.isListening = true;
        this.recognition.start();
      },
      
      async stopListening() {
        if (!this.recognition) return;
        this.isListening = false;
        this.recognition.stop();
      },
      
      speak(text, lang = 'tr-TR') {
        if (!this.synthesis) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        this.synthesis.speak(utterance);
      }
    };
    
    if (this.features.voice.recognition) {
      this.features.voice.recognition.onstart = () => console.log('🎤 Dinleme başladı');
      this.features.voice.recognition.onend = () => console.log('🎤 Dinleme bitti');
      this.features.voice.recognition.onerror = (e) => console.error('🎤 Hata:', e.error);
    }
  }

  // 3. MEMORY (Context)
  initMemory() {
    this.features.memory = {
      async save(data) {
        const response = await fetch(`${this.apiBase}/memory`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify(data)
        });
        return response.json();
      },
      
      async load() {
        const response = await fetch(`${this.apiBase}/memory`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        return response.json();
      },
      
      async clear() {
        const response = await fetch(`${this.apiBase}/memory`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        return response.json();
      }
    };
  }

  // 4. SUGGESTIONS
  initSuggestions() {
    this.features.suggestions = {
      async get(input) {
        const response = await fetch(`${this.apiBase}/suggestions`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ input })
        });
        return response.json();
      }
    };
  }

  // 5. ACHIEVEMENTS
  initAchievements() {
    this.features.achievements = {
      async getAll() {
        const response = await fetch(`${this.apiBase}/achievement`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        return response.json();
      },
      
      async unlock(achievementId) {
        const response = await fetch(`${this.apiBase}/achievement`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ achievementId })
        });
        return response.json();
      }
    };
  }

  // 6. STREAKS & GAMIFICATION
  initStreaks() {
    this.features.streaks = {
      async incrementStreak(habitId) {
        const response = await fetch(`${this.apiBase}/progression?type=streaks`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ habitId })
        });
        return response.json();
      },
      
      async getStreaks() {
        const response = await fetch(`${this.apiBase}/progression?type=streaks`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        return response.json();
      }
    };
    
    this.features.motivation = {
      async setScore(score, factors) {
        const response = await fetch(`${this.apiBase}/progression?type=motivation`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ score, factors })
        });
        return response.json();
      },
      
      async getScore() {
        const response = await fetch(`${this.apiBase}/progression?type=motivation`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        return response.json();
      }
    };
    
    this.features.quests = {
      async getToday() {
        const response = await fetch(`${this.apiBase}/progression?type=quests`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        return response.json();
      },
      
      async createQuest(title, difficulty) {
        const response = await fetch(`${this.apiBase}/progression?type=quests`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ title, difficulty, action: 'create' })
        });
        return response.json();
      },
      
      async completeQuest(questId) {
        const response = await fetch(`${this.apiBase}/progression?type=quests`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ questId, action: 'complete' })
        });
        return response.json();
      }
    };
  }

  // 7. SOCIAL FEATURES
  initSocialFeatures() {
    this.features.social = {
      async createStudyGroup(name, description) {
        const response = await fetch(`${this.apiBase}/social?type=groups`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ name, description })
        });
        return response.json();
      },
      
      async addAccountabilityPartner(partnerId) {
        const response = await fetch(`${this.apiBase}/social?type=partners`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ partnerId })
        });
        return response.json();
      }
    };
  }

  // 8. NOTIFICATIONS
  initNotifications() {
    this.features.notifications = {
      async getOptimalTime() {
        const response = await fetch(`${this.apiBase}/notifications?type=optimal-time`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        return response.json();
      },
      
      async updatePreferences(prefs) {
        const response = await fetch(`${this.apiBase}/notifications?type=preferences`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify(prefs)
        });
        return response.json();
      }
    };
  }

  // 9. STRESS DETECTION
  initStressDetection() {
    this.features.stress = {
      async log(message, level) {
        const response = await fetch(`${this.apiBase}/advanced?type=stress`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ message, level })
        });
        return response.json();
      }
    };
  }

  // 10. MULTI-LANGUAGE
  initLanguage() {
    this.features.language = {
      async setLanguage(lang) {
        const response = await fetch(`${this.apiBase}/advanced?type=language`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ language: lang })
        });
        localStorage.setItem('language', lang);
        return response.json();
      },
      
      current: localStorage.getItem('language') || 'tr'
    };
  }

  // 11. LEARNING PATHS
  initLearningPaths() {
    this.features.learningPaths = {
      async getAll() {
        const response = await fetch(`${this.apiBase}/offline?type=learning-paths`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        return response.json();
      },
      
      async start(templateId) {
        const response = await fetch(`${this.apiBase}/offline?type=learning-paths`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ templateId })
        });
        return response.json();
      }
    };
  }

  // 12. OFFLINE MODE
  initOfflineMode() {
    this.features.offline = {
      isOnline: navigator.onLine,
      syncQueue: [],
      
      async addToSyncQueue(action, data) {
        const item = { action, data, timestamp: Date.now() };
        this.syncQueue.push(item);
        localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
      },
      
      async syncWhenOnline() {
        if (!navigator.onLine) return;
        
        for (const item of this.syncQueue) {
          const response = await fetch(`${this.apiBase}/offline?type=sync`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
            body: JSON.stringify(item)
          });
          if (response.ok) {
            this.syncQueue = this.syncQueue.filter(i => i.timestamp !== item.timestamp);
          }
        }
        
        localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
      }
    };
    
    // Listen to online/offline events
    window.addEventListener('online', () => {
      this.features.offline.isOnline = true;
      this.features.offline.syncWhenOnline();
    });
    window.addEventListener('offline', () => {
      this.features.offline.isOnline = false;
    });
  }

  // 13. PWA
  initPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    }
    
    if ('install' in window) {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.features.pwaInstallPrompt = e;
        // Show install button
        const installBtn = document.createElement('button');
        installBtn.textContent = '📱 Uygulamayı Yükle';
        installBtn.onclick = () => e.prompt();
        // Append to UI
      });
    }
  }
}

// Singleton instance
const lifeCoachApp = new LifeCoachAI();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = lifeCoachApp;
}

// LifeCoach Services - Frontend API Integration

var storage = {
    get: (key) => { 
        try { return localStorage.getItem(key); } 
        catch(e) { return null; } 
    },
    set: (key, value) => { 
        try { localStorage.setItem(key, value); } 
        catch(e) {} 
    }
};

// Generate or get session ID for free users
function getSessionId() {
    let sessionId = storage.get('session-id');
    if (!sessionId) {
        sessionId = 'session-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
        storage.set('session-id', sessionId);
    }
    return sessionId;
}

function getAuthHeaders() {
    const token = storage.get('token');
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Add token if available
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        // For free users, add session ID
        headers['x-session-id'] = getSessionId();
    }
    
    return headers;
}

// ==================== REWARD NOTIFICATIONS ====================

function showRewardNotification(xp, flame, type = 'reward') {
    // Create a floating notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 animate-fade-up';
    
    const rewardMessage = {
        goal_daily: '🎯 Günlük Hedef Tamamlandı!',
        goal_weekly: '🎯 Haftalık Hedef Tamamlandı!',
        goal_monthly: '🎯 Aylık Hedef Tamamlandı!',
        goal_yearly: '🎯 Yıllık Hedef Tamamlandı!',
        focus_session: '🔥 Odaklanma Seansı Tamamlandı!',
        reflection: '💭 Yansıma Kaydedildi!',
        journal: '📓 Günlük Yazıldı!',
        plan_daily: '📝 Günlük Plan Tamamlandı!',
        plan_weekly: '📝 Haftalık Plan Tamamlandı!',
        plan_monthly: '📝 Aylık Plan Tamamlandı!',
        plan_project: '🏆 Proje Tamamlandı!',
        task_7day: '✅ 7 Günlük Plan Başarıldı!',
        task_14day: '✅ 14 Günlük Plan Başarıldı!',
        task_30day: '✅ 30 Günlük Plan Başarıldı!',
        task_90day: '✅ 90 Günlük Plan Başarıldı!',
        system_priority_bonus: '🧠 Sistem Önceliği Tamamlandı!',
        'default': '⭐ Başarı Elde Edildi!'
    };
    
    const title = rewardMessage[type] || rewardMessage['default'];
    
    notification.innerHTML = `
        <div class="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 shadow-xl backdrop-blur-md max-w-xs">
            <div class="flex items-center gap-3">
                <div class="text-2xl">🎁</div>
                <div class="flex-1">
                    <div class="font-semibold text-white text-sm mb-1">${title}</div>
                    <div class="flex gap-4 text-xs">
                        <span class="text-blue-400">+${xp} XP</span>
                        <span class="text-orange-400">+${flame} 🔥</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        notification.style.transition = 'all 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Update stats in dashboard after reward
async function updateStatsDisplay() {
    try {
        const stats = await StatsService.getStats();
        if (window.dashboardStats) {
            window.dashboardStats.xp = stats.xp;
            window.dashboardStats.flameLevel = stats.flameLevel;
            window.dashboardStats.level = stats.level;
        }
        loadDashboard?.();  // Trigger dashboard refresh if function exists
    } catch (error) {
        console.error('Error updating stats display:', error);
    }
}


// ==================== GOALS API ====================

const GoalsService = {
    async getAll() {
        try {
            const res = await fetch('/api/goals', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch goals');
            return await res.json();
        } catch (error) {
            console.error('GoalsService.getAll error:', error);
            return [];
        }
    },

    async create(goalData) {
        try {
            const res = await fetch('/api/goals', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(goalData)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create goal');
            }
            return await res.json();
        } catch (error) {
            console.error('GoalsService.create error:', error);
            throw error;
        }
    },

    async update(goalData) {
        try {
            const res = await fetch('/api/goals', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(goalData)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update goal');
            }
            return await res.json();
        } catch (error) {
            console.error('GoalsService.update error:', error);
            throw error;
        }
    },

    async delete(goalId) {
        try {
            const res = await fetch('/api/goals', {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ id: goalId })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete goal');
            }
            return true;
        } catch (error) {
            console.error('GoalsService.delete error:', error);
            throw error;
        }
    },

    async updateProgress(goalId, progress) {
        return this.update({ id: goalId, progress });
    },

    async completeGoal(goalId, reflection = '') {
        return this.update({ id: goalId, status: 'completed', progress: 100, reflection });
    },

    async toggleDay(goalId) {
        try {
            const res = await fetch('/api/goals/toggle', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ goalId })
            });
            if (!res.ok) throw new Error('Toggle failed');
            return await res.json();
        } catch (error) {
            console.error('GoalsService.toggleDay error:', error);
            throw error;
        }
    },

    async getBriefing(title, description) {
        try {
            const res = await fetch('/api/goals/briefing', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ title, description })
            });
            if (!res.ok) throw new Error('Failed to fetch briefing');
            const data = await res.json();
            return data.briefing;
        } catch (error) {
            console.error('GoalsService.getBriefing error:', error);
            return 'AI önerisi alınamadı.';
        }
    }
};

// ==================== HABITS API ====================

const HabitsService = {
    async getAll() {
        try {
            const res = await fetch('/api/habits', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch habits');
            return await res.json();
        } catch (error) {
            console.error('HabitsService.getAll error:', error);
            return [];
        }
    },

    async create(habitData) {
        try {
            const res = await fetch('/api/habits', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(habitData)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create habit');
            }
            return await res.json();
        } catch (error) {
            console.error('HabitsService.create error:', error);
            throw error;
        }
    },

    async update(habitData) {
        try {
            const res = await fetch('/api/habits', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(habitData)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update habit');
            }
            return await res.json();
        } catch (error) {
            console.error('HabitsService.update error:', error);
            throw error;
        }
    },

    async toggle(habitId) {
        try {
            const res = await fetch('/api/habits', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ action: 'toggle', id: habitId })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to toggle habit');
            }
            return await res.json();
        } catch (error) {
            console.error('HabitsService.toggle error:', error);
            throw error;
        }
    },

    async delete(habitId) {
        try {
            const res = await fetch('/api/habits', {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ id: habitId })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete habit');
            }
            return true;
        } catch (error) {
            console.error('HabitsService.delete error:', error);
            throw error;
        }
    }
};

// ==================== PLANS API ====================

const PlansService = {
    async getAll() {
        try {
            const res = await fetch('/api/plans', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch plans');
            return await res.json();
        } catch (error) {
            console.error('PlansService.getAll error:', error);
            return [];
        }
    },

    async create(planData) {
        try {
            const res = await fetch('/api/plans', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(planData)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create plan');
            }
            return await res.json();
        } catch (error) {
            console.error('PlansService.create error:', error);
            throw error;
        }
    },

    async update(planData) {
        try {
            const res = await fetch('/api/plans', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(planData)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update plan');
            }
            return await res.json();
        } catch (error) {
            console.error('PlansService.update error:', error);
            throw error;
        }
    },

    async updateTask(planId, taskId, status) {
        try {
            const res = await fetch('/api/plans', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ action: 'updateTask', planId, taskId, status })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update task');
            }
            return await res.json();
        } catch (error) {
            console.error('PlansService.updateTask error:', error);
            throw error;
        }
    },

    async delete(planId) {
        try {
            const res = await fetch('/api/plans', {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ id: planId })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete plan');
            }
            return true;
        } catch (error) {
            console.error('PlansService.delete error:', error);
            throw error;
        }
    }
};

// ==================== PROGRESS API ====================

const ProgressService = {
    async getStats() {
        try {
            const res = await fetch('/api/progress', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch progress');
            return await res.json();
        } catch (error) {
            console.error('ProgressService.getStats error:', error);
            return null;
        }
    }
};

// ==================== FOCUS API ====================

const FocusService = {
    async getSessions() {
        try {
            const res = await fetch('/api/focus', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch focus sessions');
            return await res.json();
        } catch (error) {
            console.error('FocusService.getSessions error:', error);
            return null;
        }
    },

    async startSession(duration) {
        try {
            const res = await fetch('/api/focus', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ action: 'start', duration })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to start session');
            }
            return await res.json();
        } catch (error) {
            console.error('FocusService.startSession error:', error);
            throw error;
        }
    },

    async completeSession() {
        try {
            const res = await fetch('/api/focus', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ action: 'complete' })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to complete session');
            }
            return await res.json();
        } catch (error) {
            console.error('FocusService.completeSession error:', error);
            throw error;
        }
    },

    async deleteSession(id) {
        try {
            const res = await fetch('/api/focus', {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ id })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete session');
            }
            return true;
        } catch (error) {
            console.error('FocusService.deleteSession error:', error);
            throw error;
        }
    }
};

// ==================== REFLECTIONS API ====================

const ReflectionsService = {
    async getAll() {
        try {
            const res = await fetch('/api/reflections', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch reflections');
            return await res.json();
        } catch (error) {
            console.error('ReflectionsService.getAll error:', error);
            return null;
        }
    },

    async create(reflectionData) {
        try {
            const res = await fetch('/api/reflections', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(reflectionData)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create reflection');
            }
            return await res.json();
        } catch (error) {
            console.error('ReflectionsService.create error:', error);
            throw error;
        }
    },

    async update(reflectionData) {
        try {
            const res = await fetch('/api/reflections', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(reflectionData)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update reflection');
            }
            return await res.json();
        } catch (error) {
            console.error('ReflectionsService.update error:', error);
            throw error;
        }
    },

    async delete(id) {
        try {
            const res = await fetch('/api/reflections', {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ id })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete reflection');
            }
            return true;
        } catch (error) {
            console.error('ReflectionsService.delete error:', error);
            throw error;
        }
    }
};

// ==================== RECOMMENDATIONS API ====================

const RecommendationsService = {
    async getAll() {
        try {
            const res = await fetch('/api/recommendations', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch recommendations');
            return await res.json();
        } catch (error) {
            console.error('RecommendationsService.getAll error:', error);
            return [];
        }
    }
};

// ==================== SMART COACH API ====================

const SmartCoachService = {
    async getCoaching() {
        try {
            const res = await fetch('/api/smart-coach', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch coaching');
            return await res.json();
        } catch (error) {
            console.error('SmartCoachService.getCoaching error:', error);
            return null;
        }
    }
};

// ==================== NOTIFICATIONS API ====================

const NotificationsService = {
    async getPendingNotifications() {
        try {
            const res = await fetch('/api/notifications', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch notifications');
            return await res.json();
        } catch (error) {
            console.error('NotificationsService.getPendingNotifications error:', error);
            return { notifications: [] };
        }
    },

    async subscribeToPushNotifications(subscription) {
        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ subscription })
            });
            if (!res.ok) throw new Error('Failed to subscribe');
            return await res.json();
        } catch (error) {
            console.error('NotificationsService.subscribeToPushNotifications error:', error);
            throw error;
        }
    },

    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    },

    showLocalNotification(title, message, options = {}) {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/logo-preview.html',
                body: message,
                tag: 'habit-reminder',
                requireInteraction: false,
                ...options
            });
        }
    }
};

// ==================== USER STATS API (XP & Flame Level) ====================

const StatsService = {
    async getStats() {
        try {
            const res = await fetch('/api/user-stats', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch stats');
            return await res.json();
        } catch (error) {
            console.error('StatsService.getStats error:', error);
            return { xp: 0, flameLevel: 0, level: 1, history: [] };
        }
    },

    async addReward(rewardType) {
        try {
            const res = await fetch('/api/user-stats', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ rewardType })
            });
            if (!res.ok) throw new Error('Failed to add reward');
            return await res.json();
        } catch (error) {
            console.error('StatsService.addReward error:', error);
            return null;
        }
    },

    async consumeFlame(consumeType) {
        try {
            const res = await fetch('/api/user-stats', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ action: 'consume', consumeType })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to consume flame');
            }
            return await res.json();
        } catch (error) {
            console.error('StatsService.consumeFlame error:', error);
            throw error;
        }
    }
};

// ==================== TASK BREAKDOWN API ====================

const TaskBreakdownService = {
    async getAll() {
        try {
            const res = await fetch('/api/task-breakdown', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch task breakdowns');
            return await res.json();
        } catch (error) {
            console.error('TaskBreakdownService.getAll error:', error);
            return [];
        }
    },

    async create(title, days, description = '', tasks = []) {
        try {
            const res = await fetch('/api/task-breakdown', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ title, days, description, tasks })
            });
            if (!res.ok) throw new Error('Failed to create task breakdown');
            return await res.json();
        } catch (error) {
            console.error('TaskBreakdownService.create error:', error);
            throw error;
        }
    },

    async update(id, updates) {
        try {
            const res = await fetch('/api/task-breakdown', {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ id, ...updates })
            });
            if (!res.ok) throw new Error('Failed to update task breakdown');
            return await res.json();
        } catch (error) {
            console.error('TaskBreakdownService.update error:', error);
            throw error;
        }
    },

    async delete(id) {
        try {
            const res = await fetch('/api/task-breakdown', {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ id })
            });
            if (!res.ok) throw new Error('Failed to delete task breakdown');
            return await res.json();
        } catch (error) {
            console.error('TaskBreakdownService.delete error:', error);
            throw error;
        }
    }
};

// ==================== WAFFLE (AI Image Generation) API ====================

const WaffleService = {
    async generateImage(prompt, style = 'realistic') {
        try {
            const res = await fetch('/api/waffle', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ prompt, style })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to generate image');
            }
            return await res.json();
        } catch (error) {
            console.error('WaffleService.generateImage error:', error);
            throw error;
        }
    },

    async getGenerations() {
        try {
            const res = await fetch('/api/waffle', {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch generations');
            return await res.json();
        } catch (error) {
            console.error('WaffleService.getGenerations error:', error);
            return { generations: [], totalGenerated: 0 };
        }
    }
};

// Export for global use
window.GoalsService = GoalsService;
window.HabitsService = HabitsService;
window.PlansService = PlansService;
window.ProgressService = ProgressService;
window.FocusService = FocusService;
window.StatsService = StatsService;
window.TaskBreakdownService = TaskBreakdownService;
window.ReflectionsService = ReflectionsService;
window.RecommendationsService = RecommendationsService;
window.SmartCoachService = SmartCoachService;
window.NotificationsService = NotificationsService;
window.WaffleService = WaffleService;

// LifeCoach Services - Frontend API Integration

const storage = {
    get: (key) => { 
        try { return localStorage.getItem(key); } 
        catch(e) { return null; } 
    },
    set: (key, value) => { 
        try { localStorage.setItem(key, value); } 
        catch(e) {} 
    }
};

function getAuthHeaders() {
    const token = storage.get('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
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

    async completeGoal(goalId) {
        return this.update({ id: goalId, status: 'completed', progress: 100 });
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

// Export for global use
window.GoalsService = GoalsService;
window.HabitsService = HabitsService;
window.PlansService = PlansService;
window.ProgressService = ProgressService;

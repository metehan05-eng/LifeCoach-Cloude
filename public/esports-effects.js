/**
 * Esports Animations & Sound Effects Module
 * Provides immersive visual and audio feedback for competitive gameplay
 */

class EsportsEffects {
    constructor() {
        this.audioContext = null;
        this.soundEnabled = true;
        this.particleSystem = [];
        this.initAudio();
    }

    /**
     * Initialize Web Audio API
     */
    initAudio() {
        if (!window.AudioContext && !window.webkitAudioContext) {
            console.warn('Web Audio API not supported');
            return;
        }

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
    }

    /**
     * Play sound effect
     */
    async playSound(soundType, duration = 0.1) {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            const envelope = this.audioContext.createGain();

            osc.connect(envelope);
            envelope.connect(this.audioContext.destination);

            const frequencies = {
                'task_complete': 800,
                'level_up': 1200,
                'victory': 1600,
                'defeat': 400,
                'rank_up': 1400,
                'streak': 900,
                'timing_good': 1000,
                'timing_perfect': 1300,
                'xp_gain': 750
            };

            osc.frequency.value = frequencies[soundType] || 800;
            envelope.gain.setValueAtTime(0.3, now);
            envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

            osc.start(now);
            osc.stop(now + duration);
        } catch (error) {
            console.error('Audio playback error:', error);
        }
    }

    /**
     * Task completion sound & effect
     */
    taskCompletionEffect(element) {
        // Sound: beep
        this.playSound('task_complete', 0.15);

        // Visual: pulse
        element.classList.add('task-complete-pulse');
        setTimeout(() => element.classList.remove('task-complete-pulse'), 500);

        // Particles
        this.createParticles(element, 8, '#4ece47');
    }

    /**
     * Rank up celebration
     */
    rankUpEffect(element) {
        // Sound: three-note ascending
        this.playSound('rank_up', 0.3);
        setTimeout(() => this.playSound('rank_up', 0.2), 150);

        // Visual: scale up with glow
        element.classList.add('rank-up-celebration');
        setTimeout(() => element.classList.remove('rank-up-celebration'), 1000);

        // Confetti particles
        this.createConfetti(element, 15);
    }

    /**
     * Victory effect
     */
    victoryEffect() {
        // Sound: victory fanfare
        this.playSound('victory', 0.5);
        setTimeout(() => this.playSound('timing_perfect', 0.3), 100);
        setTimeout(() => this.playSound('level_up', 0.3), 300);

        // Screen shake
        this.screenShake(2, 0.5);

        // Fireworks
        document.querySelectorAll('body').forEach(el => {
            this.createConfetti(el, 30);
        });
    }

    /**
     * Defeat effect
     */
    defeatEffect() {
        // Sound: sad trombone
        this.playSound('defeat', 0.4);

        // Dim effect
        const overlay = document.createElement('div');
        overlay.className = 'defeat-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.3);
            animation: fadeOut 0.5s ease-out forward;
            pointer-events: none;
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 500);
    }

    /**
     * Streak notification effect
     */
    streakEffect(count) {
        // Sound: ascending beeps
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.playSound('streak', 0.1), i * 100);
        }

        // Visual notification
        this.createNotification(`🔥 ${count} Streak! 🔥`, '#ff6b6b');
    }

    /**
     * XP gain animation
     */
    xpGainEffect(amount, element) {
        // Sound
        this.playSound('xp_gain', 0.2);

        // Floating text
        const floatingText = document.createElement('div');
        floatingText.textContent = `+${amount} XP`;
        floatingText.style.cssText = `
            position: fixed;
            pointer-events: none;
            font-weight: 700;
            color: #00d4ff;
            font-size: 1.2rem;
            text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
            z-index: 9999;
        `;

        const rect = element ? element.getBoundingClientRect() : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        floatingText.style.left = rect.x + 'px';
        floatingText.style.top = rect.y + 'px';

        document.body.appendChild(floatingText);

        // Float up animation
        floatingText.animate([
            { transform: 'translateY(0)', opacity: 1 },
            { transform: 'translateY(-50px)', opacity: 0 }
        ], {
            duration: 1000,
            easing: 'ease-out'
        }).onfinish = () => floatingText.remove();
    }

    /**
     * Opponent task effect
     */
    opponentTaskEffect(count) {
        // Sound: rapid tick
        this.playSound('timing_good', 0.08);

        // Shake effect
        this.screenShake(1, 0.3);
    }

    /**
     * Screen shake effect
     */
    screenShake(intensity = 2, duration = 0.3) {
        const originalTransform = document.body.style.transform;
        const startTime = Date.now();

        const shake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration * 1000) {
                document.body.style.transform = originalTransform;
                return;
            }

            const x = (Math.random() - 0.5) * intensity * 2;
            const y = (Math.random() - 0.5) * intensity * 2;
            document.body.style.transform = `translate(${x}px, ${y}px)`;

            requestAnimationFrame(shake);
        };

        shake();
    }

    /**
     * Create particle effect
     */
    createParticles(element, count, color = '#00d4ff') {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const velocity = 3 + Math.random() * 3;
            
            this.createParticle(x, y, angle, velocity, color);
        }
    }

    /**
     * Create single particle
     */
    createParticle(x, y, angle, velocity, color) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            width: 8px;
            height: 8px;
            background: ${color};
            border-radius: 50%;
            pointer-events: none;
            box-shadow: 0 0 10px ${color};
            left: ${x}px;
            top: ${y}px;
            z-index: 9999;
        `;

        document.body.appendChild(particle);

        let px = x, py = y;
        let vx = Math.cos(angle) * velocity;
        let vy = Math.sin(angle) * velocity;
        let alpha = 1;
        const startTime = Date.now();
        const duration = 1000;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress > 1) {
                particle.remove();
                return;
            }

            vx *= 0.98; // Air resistance
            vy *= 0.98;
            vy += 0.1; // Gravity

            px += vx;
            py += vy;

            alpha = 1 - progress;

            particle.style.left = px + 'px';
            particle.style.top = py + 'px';
            particle.style.opacity = alpha;

            requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Create confetti effect
     */
    createConfetti(element, count) {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const colors = ['#00d4ff', '#7c3aed', '#ffd700', '#ff6b6b', '#4ece47'];

        for (let i = 0; i < count; i++) {
            const angle = (Math.random() - 0.5) * Math.PI * 2;
            const velocity = 5 + Math.random() * 5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            this.createParticle(x, y, angle, velocity, color);
        }
    }

    /**
     * Create notification popup
     */
    createNotification(message, color = '#00d4ff') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(26, 26, 46, 0.95);
            border: 2px solid ${color};
            color: ${color};
            padding: 20px 40px;
            border-radius: 12px;
            font-size: 1.5rem;
            font-weight: 700;
            z-index: 10000;
            pointer-events: none;
            text-align: center;
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        // Animate in
        notification.animate([
            { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 },
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 }
        ], {
            duration: 2000,
            easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        }).onfinish = () => notification.remove();
    }

    /**
     * Winning animation for player card
     */
    winningCardAnimation(element) {
        element.classList.add('winning-pulse');
        this.createParticles(element, 12, '#ffd700');
        this.playSound('level_up', 0.2);
    }

    /**
     * Leaderboard position change animation
     */
    leaderboardPositionChange(element, oldPos, newPos) {
        if (newPos < oldPos) {
            // Moved up - green
            element.classList.add('position-up');
            this.playSound('timing_good', 0.15);
            this.createParticles(element, 6, '#4ece47');
        } else if (newPos > oldPos) {
            // Moved down - red
            element.classList.add('position-down');
            this.playSound('defeat', 0.1);
            this.createParticles(element, 6, '#ff6b6b');
        }
    }

    /**
     * Rank tier change animation
     */
    rankTierAnimation(oldRank, newRank) {
        const rankEmojis = {
            'Bronze': '🥉',
            'Silver': '🥈',
            'Gold': '🥇',
            'Diamond': '💎',
            'Master': '👑',
            'Grandmaster': '⭐'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 140, 0, 0.2));
            border: 2px solid #ffd700;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            z-index: 10000;
            pointer-events: none;
        `;

        notification.innerHTML = `
            <div style="font-size: 1rem; color: rgba(255, 255, 255, 0.7); margin-bottom: 10px;">RANK UP!</div>
            <div style="font-size: 2rem; margin-bottom: 10px;">
                ${rankEmojis[oldRank] || '👑'} → ${rankEmojis[newRank] || '👑'}
            </div>
            <div style="font-size: 1.3rem; color: #ffd700; font-weight: 700;">
                You are now ${newRank}!
            </div>
        `;

        document.body.appendChild(notification);

        // Fireworks
        this.createConfetti(notification, 20);
        this.victoryEffect();

        setTimeout(() => notification.remove(), 3000);
    }

    /**
     * Toggle sound
     */
    toggleSound(enabled) {
        this.soundEnabled = enabled;
    }
}

// Create global instance
const esportsEffects = new EsportsEffects();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes taskCompletePulse {
        0% {
            transform: scale(1);
            filter: brightness(1);
        }
        50% {
            transform: scale(1.2);
            filter: brightness(1.3);
        }
        100% {
            transform: scale(1);
            filter: brightness(1);
        }
    }

    @keyframes rankUpCelebration {
        0% {
            transform: scale(1) rotateZ(0deg);
            filter: drop-shadow(0 0 0px #ffd700);
        }
        50% {
            transform: scale(1.15) rotateZ(5deg);
            filter: drop-shadow(0 0 20px #ffd700);
        }
        100% {
            transform: scale(1) rotateZ(0deg);
            filter: drop-shadow(0 0 0px #ffd700);
        }
    }

    @keyframes winningPulse {
        0%, 100% {
            filter: drop-shadow(0 0 0px #4ece47);
        }
        50% {
            filter: drop-shadow(0 0 15px #4ece47);
        }
    }

    @keyframes positionUp {
        0% {
            opacity: 0.5;
            transform: translateY(10px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes positionDown {
        0% {
            opacity: 0.5;
            transform: translateY(-10px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes fadeOut {
        to {
            opacity: 0;
        }
    }

    @keyframes glow {
        0%, 100% {
            filter: drop-shadow(0 0 5px currentColor);
        }
        50% {
            filter: drop-shadow(0 0 15px currentColor);
        }
    }

    .task-complete-pulse {
        animation: taskCompletePulse 0.5s ease;
    }

    .rank-up-celebration {
        animation: rankUpCelebration 1s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    .winning-pulse {
        animation: winningPulse 0.8s infinite;
    }

    .position-up {
        animation: positionUp 0.5s ease;
    }

    .position-down {
        animation: positionDown 0.5s ease;
    }

    /* Glow effect for various elements */
    .medal-glow {
        animation: glow 0.8s infinite;
    }

    /* Smooth transitions */
    * {
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    /* Prevent animation on load */
    * {
        animation-play-state: paused;
    }

    body.animations-ready * {
        animation-play-state: running;
    }
`;

document.head.appendChild(style);

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EsportsEffects;
}
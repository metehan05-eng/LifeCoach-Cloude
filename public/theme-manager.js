// ===== ADVANCED THEME CUSTOMIZATION SYSTEM =====

const ThemeManager = {
    // Pre-defined Themes
    presets: {
        neon: {
            name: 'Neon Lights',
            icon: '⚡',
            colors: {
                primary: '#00FF41',
                'primary-light': '#33FF66',
                'primary-dark': '#00CC33',
                secondary: '#FF00FF',
                accent: '#00FFFF',
                'neon-teal': '#00FFC8',
                'neon-cyan': '#00E7FF',
                'surface-dark': '#0A0E27',
                'card-dark': '#121831',
                text: '#E0E0E0'
            }
        },
        ocean: {
            name: 'Ocean Breeze',
            icon: '🌊',
            colors: {
                primary: '#006BA6',
                'primary-light': '#0091DA',
                'primary-dark': '#00478B',
                secondary: '#00B4D8',
                accent: '#90E0EF',
                'neon-teal': '#00B4D8',
                'neon-cyan': '#48CAE4',
                'surface-dark': '#0A2540',
                'card-dark': '#103355',
                text: '#D0E8F2'
            }
        },
        forest: {
            name: 'Forest Green',
            icon: '🌲',
            colors: {
                primary: '#2D6A4F',
                'primary-light': '#40916C',
                'primary-dark': '#1B4332',
                secondary: '#95B46F',
                accent: '#D8F3DC',
                'neon-teal': '#52B788',
                'neon-cyan': '#74C69D',
                'surface-dark': '#1B4332',
                'card-dark': '#2D6A4F',
                text: '#D8F3DC'
            }
        },
        sunset: {
            name: 'Sunset Vibes',
            icon: '🌅',
            colors: {
                primary: '#E76F51',
                'primary-light': '#F4A261',
                'primary-dark': '#D62828',
                secondary: '#F77F00',
                accent: '#FCBF49',
                'neon-teal': '#F4A261',
                'neon-cyan': '#ECAA4D',
                'surface-dark': '#22223B',
                'card-dark': '#3A3A52',
                text: '#F4E8E1'
            }
        },
        cyberpunk: {
            name: 'Cyberpunk',
            icon: '🤖',
            colors: {
                primary: '#FF006E',
                'primary-light': '#FF1493',
                'primary-dark': '#C7004C',
                secondary: '#00D9FF',
                accent: '#FFBE0B',
                'neon-teal': '#00D9FF',
                'neon-cyan': '#39FF14',
                'surface-dark': '#0D0221',
                'card-dark': '#1D0E2D',
                text: '#F0F3FF'
            }
        },
        lavender: {
            name: 'Lavender Dream',
            icon: '💜',
            colors: {
                primary: '#9D4EDD',
                'primary-light': '#B497D6',
                'primary-dark': '#7B2CBF',
                secondary: '#C77DFF',
                accent: '#E0AAFF',
                'neon-teal': '#C77DFF',
                'neon-cyan': '#D8B5FF',
                'surface-dark': '#2D0A4E',
                'card-dark': '#3D1565',
                text: '#F0D9FF'
            }
        },
        matcha: {
            name: 'Matcha Tea',
            icon: '🍵',
            colors: {
                primary: '#6B9080',
                'primary-light': '#8BA89A',
                'primary-dark': '#54746E',
                secondary: '#ABC9B5',
                accent: '#D4E4D8',
                'neon-teal': '#8BA89A',
                'neon-cyan': '#A3B999',
                'surface-dark': '#2A3F35',
                'card-dark': '#3D5147',
                text: '#E8F0ED'
            }
        },
        default: {
            name: 'Default Teal',
            icon: '🔷',
            colors: {
                primary: '#0F766E',
                'primary-light': '#14B8A6',
                'primary-dark': '#0D5E57',
                secondary: '#CCFBF1',
                accent: '#F0FDFA',
                'neon-teal': '#2DD4BF',
                'neon-cyan': '#22D3EE',
                'surface-dark': '#1E293B',
                'card-dark': '#0F172A',
                text: '#E2E8F0'
            }
        }
    },

    // Current Active Theme
    currentTheme: null,
    customTheme: {},

    // Initialize Theme System
    init() {
        this.loadTheme();
        this.applyTheme(this.currentTheme);
        this.setupThemeListeners();
    },

    // Load theme from localStorage
    loadTheme() {
        const saved = localStorage.getItem('life-coach-theme');
        if (saved) {
            try {
                const theme = JSON.parse(saved);
                this.currentTheme = theme.name || 'default';
                this.customTheme = theme.custom || {};
                return;
            } catch (e) {
                console.error('Failed to load theme:', e);
            }
        }
        this.currentTheme = 'default';
    },

    // Save theme to localStorage
    saveTheme() {
        const theme = {
            name: this.currentTheme,
            custom: this.customTheme,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('life-coach-theme', JSON.stringify(theme));
    },

    // Apply theme by name or custom colors
    applyTheme(themeName) {
        let colors = {};

        if (themeName && this.presets[themeName]) {
            colors = { ...this.presets[themeName].colors };
            this.currentTheme = themeName;
        } else if (this.currentTheme && this.presets[this.currentTheme]) {
            colors = { ...this.presets[this.currentTheme].colors };
        }

        // Merge with custom overrides
        colors = { ...colors, ...this.customTheme };

        // Apply to CSS variables
        const root = document.documentElement;
        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
        });

        this.saveTheme();
    },

    // Set individual color
    setColor(colorKey, hexValue) {
        if (!/^#[0-9A-F]{6}$/i.test(hexValue)) {
            console.error('Invalid hex color:', hexValue);
            return;
        }
        
        this.customTheme[colorKey] = hexValue;
        document.documentElement.style.setProperty(`--${colorKey}`, hexValue);
        this.saveTheme();
    },

    // Reset to preset theme
    resetToPreset(themeName) {
        if (this.presets[themeName]) {
            this.customTheme = {};
            this.currentTheme = themeName;
            this.applyTheme(themeName);
        }
    },

    // Get current colors
    getCurrentColors() {
        const root = document.documentElement;
        const colors = {};
        
        Object.keys(this.presets[this.currentTheme]?.colors || {}).forEach(key => {
            const value = getComputedStyle(root).getPropertyValue(`--${key}`).trim();
            colors[key] = value || `var(--${key})`;
        });

        return colors;
    },

    // Export theme as JSON
    exportTheme() {
        return {
            name: this.currentTheme,
            colors: this.customTheme,
            timestamp: new Date().toISOString()
        };
    },

    // Import theme from JSON
    importTheme(themeData) {
        try {
            if (themeData.colors) {
                this.customTheme = themeData.colors;
                this.currentTheme = themeData.name || 'custom';
                this.applyTheme();
                return true;
            }
        } catch (e) {
            console.error('Failed to import theme:', e);
        }
        return false;
    },

    // Setup event listeners
    setupThemeListeners() {
        document.addEventListener('theme-changed', () => {
            this.applyTheme(this.currentTheme);
        });
    },

    // Get all preset names
    getPresets() {
        return Object.entries(this.presets).map(([key, val]) => ({
            id: key,
            name: val.name,
            icon: val.icon,
            colors: val.colors
        }));
    }
};

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}

// Expose globally
window.ThemeManager = ThemeManager;

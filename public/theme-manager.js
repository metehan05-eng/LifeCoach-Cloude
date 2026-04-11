// ===== ADVANCED THEME CUSTOMIZATION SYSTEM =====

const ThemeManager = {
    // Pre-defined Themes
    presets: {
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
                'deep-dark': '#030712',
                'bg-body': '#030712',
                'orb1-color': '#0F766E',
                'orb2-color': '#22D3EE',
                'orb3-color': '#2DD4BF',
                text: '#E2E8F0'
            },
            bodyBg: '#030712'
        },
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
                'deep-dark': '#050810',
                'bg-body': '#050810',
                'orb1-color': '#00FF41',
                'orb2-color': '#00E7FF',
                'orb3-color': '#FF00FF',
                text: '#E0E0E0'
            },
            bodyBg: '#050810'
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
                'deep-dark': '#04111F',
                'bg-body': '#04111F',
                'orb1-color': '#006BA6',
                'orb2-color': '#48CAE4',
                'orb3-color': '#0091DA',
                text: '#D0E8F2'
            },
            bodyBg: '#04111F'
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
                'deep-dark': '#081C12',
                'bg-body': '#081C12',
                'orb1-color': '#2D6A4F',
                'orb2-color': '#74C69D',
                'orb3-color': '#52B788',
                text: '#D8F3DC'
            },
            bodyBg: '#081C12'
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
                'deep-dark': '#0F0F1A',
                'bg-body': '#0F0F1A',
                'orb1-color': '#E76F51',
                'orb2-color': '#FCBF49',
                'orb3-color': '#F77F00',
                text: '#F4E8E1'
            },
            bodyBg: '#0F0F1A'
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
                'deep-dark': '#080012',
                'bg-body': '#080012',
                'orb1-color': '#FF006E',
                'orb2-color': '#00D9FF',
                'orb3-color': '#39FF14',
                text: '#F0F3FF'
            },
            bodyBg: '#080012'
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
                'deep-dark': '#130425',
                'bg-body': '#130425',
                'orb1-color': '#9D4EDD',
                'orb2-color': '#D8B5FF',
                'orb3-color': '#C77DFF',
                text: '#F0D9FF'
            },
            bodyBg: '#130425'
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
                'deep-dark': '#111D18',
                'bg-body': '#111D18',
                'orb1-color': '#6B9080',
                'orb2-color': '#A3B999',
                'orb3-color': '#8BA89A',
                text: '#E8F0ED'
            },
            bodyBg: '#111D18'
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

    // Apply theme by name or custom colors — also updates body bg + orbs
    applyTheme(themeName) {
        let colors = {};
        let preset = null;

        if (themeName && this.presets[themeName]) {
            preset = this.presets[themeName];
            colors = { ...preset.colors };
            this.currentTheme = themeName;
        } else if (this.currentTheme && this.presets[this.currentTheme]) {
            preset = this.presets[this.currentTheme];
            colors = { ...preset.colors };
        }

        // Merge with custom overrides
        colors = { ...colors, ...this.customTheme };

        // Apply to CSS variables
        const root = document.documentElement;
        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
        });

        // Update body background color
        if (colors['bg-body']) {
            document.body.style.background = colors['bg-body'];
        }

        // Update mesh gradient background (.bg-mesh)
        this._updateMeshBg(colors);

        // Update orb colors
        this._updateOrbs(colors);

        // Update sidebar border color
        this._updateSidebarAccent(colors);

        // Update scrollbar thumb
        this._updateScrollbar(colors);

        this.saveTheme();
    },

    // Update the animated mesh background
    _updateMeshBg(colors) {
        const mesh = document.querySelector('.bg-mesh');
        if (!mesh) return;
        const p = colors['primary'] || '#0F766E';
        const c = colors['neon-cyan'] || '#22D3EE';
        const t = colors['neon-teal'] || '#2DD4BF';
        const bg = colors['bg-body'] || '#030712';
        mesh.style.background = `
            radial-gradient(ellipse 80% 50% at 20% 40%, ${p}26 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 60%, ${c}14 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 50% 10%, ${t}0f 0%, transparent 60%),
            ${bg}
        `;
    },

    // Update floating orb colors
    _updateOrbs(colors) {
        const orb1 = document.querySelector('.orb-1');
        const orb2 = document.querySelector('.orb-2');
        const orb3 = document.querySelector('.orb-3');
        if (orb1) orb1.style.background = colors['orb1-color'] || colors['primary'] || '#0F766E';
        if (orb2) orb2.style.background = colors['orb2-color'] || colors['neon-cyan'] || '#22D3EE';
        if (orb3) orb3.style.background = colors['orb3-color'] || colors['neon-teal'] || '#2DD4BF';
    },

    // Update sidebar accent border
    _updateSidebarAccent(colors) {
        const sidebar = document.getElementById('main-sidebar');
        if (!sidebar) return;
        const t = colors['neon-teal'] || '#2DD4BF';
        sidebar.style.borderRightColor = `${t}1A`; // 10% opacity
    },

    // Update scrollbar thumb
    _updateScrollbar(colors) {
        const t = colors['neon-teal'] || '#2DD4BF';
        // Inject dynamic scrollbar style
        let styleEl = document.getElementById('theme-scrollbar-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'theme-scrollbar-style';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            ::-webkit-scrollbar-thumb { background: ${t}33; }
            ::-webkit-scrollbar-thumb:hover { background: ${t}80; }
        `;
    },

    // Set individual color
    setColor(colorKey, hexValue) {
        if (!/^#[0-9A-F]{6}$/i.test(hexValue)) {
            console.error('Invalid hex color:', hexValue);
            return;
        }
        this.customTheme[colorKey] = hexValue;
        document.documentElement.style.setProperty(`--${colorKey}`, hexValue);

        // Re-apply derived effects for live preview
        const allColors = { ...(this.presets[this.currentTheme]?.colors || {}), ...this.customTheme };
        this._updateMeshBg(allColors);
        this._updateOrbs(allColors);
        this._updateSidebarAccent(allColors);
        this._updateScrollbar(allColors);

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
            colors[key] = value || '#000000';
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

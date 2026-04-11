// ===== THEME UI FUNCTIONS =====

// Open Theme Modal
function openThemeModal() {
    const modal = document.getElementById('theme-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    initThemeModal();
}

// Close Theme Modal
function closeThemeModal() {
    const modal = document.getElementById('theme-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Initialize Theme Modal UI
function initThemeModal() {
    // Render Preset Themes
    const presetsDiv = document.getElementById('theme-presets');
    const presets = ThemeManager.getPresets();

    presetsDiv.innerHTML = presets.map(preset => {
        const isActive = ThemeManager.currentTheme === preset.id;
        const primaryColor = preset.colors['primary'] || '#0F766E';
        const tealColor = preset.colors['neon-teal'] || '#2DD4BF';
        return `
        <button onclick="selectPresetTheme('${preset.id}')"
            class="p-3 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group ${isActive ? 'border-opacity-100 scale-[1.03] shadow-lg' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:scale-[1.02]'}"
            style="${isActive ? `border-color: ${tealColor}; background: ${primaryColor}22; box-shadow: 0 0 16px ${tealColor}44;` : ''}">
            <div class="text-2xl mb-1">${preset.icon}</div>
            <div class="text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-300'}">${preset.name}</div>
            <div class="flex gap-1 mt-2 justify-center">
                ${Object.entries(preset.colors).slice(0, 4).map(([k, v]) => `<div class="w-3 h-3 rounded-full" style="background:${v}"></div>`).join('')}
            </div>
            ${isActive ? `<div class="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style="background:${tealColor}"><i class="fa-solid fa-check text-black" style="font-size:8px"></i></div>` : ''}
        </button>
    `}).join('');

    // Render Color Controls
    const colorsDiv = document.getElementById('theme-color-controls');
    const currentColors = ThemeManager.getCurrentColors();
    const colorKeys = Object.keys(ThemeManager.presets[ThemeManager.currentTheme]?.colors || {});
    // Only show key visual colors (not bg-body, orb colors etc)
    const visibleKeys = colorKeys.filter(k => !k.startsWith('orb') && k !== 'bg-body' && k !== 'deep-dark');

    colorsDiv.innerHTML = visibleKeys.map(key => {
        const val = currentColors[key] || '#000000';
        const cleanVal = val.startsWith('#') ? val : '#000000';
        const label = key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `
        <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-all">
            <label class="text-xs font-semibold text-slate-400 flex-1 truncate" title="${key}">${label}</label>
            <div class="flex items-center gap-2">
                <input type="color" id="color-${key}" value="${cleanVal}"
                    onchange="changeThemeColor('${key}', this.value)"
                    oninput="livePreviewColor('${key}', this.value)"
                    class="w-9 h-8 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent"
                    style="outline: 1px solid rgba(255,255,255,0.15);">
                <input type="text" id="colortext-${key}" value="${cleanVal}"
                    onchange="changeThemeColor('${key}', this.value)"
                    maxlength="7"
                    class="w-20 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-slate-300 font-mono focus:outline-none focus:border-white/30">
            </div>
        </div>
    `}).join('');
}

// Live preview while dragging color picker (updates text input too)
function livePreviewColor(colorKey, hexValue) {
    const textInput = document.getElementById(`colortext-${colorKey}`);
    if (textInput) textInput.value = hexValue;

    if (!/^#[0-9A-F]{6}$/i.test(hexValue)) return;
    document.documentElement.style.setProperty(`--${colorKey}`, hexValue);

    // Live update orbs/mesh for visual feedback
    const allColors = { ...(ThemeManager.presets[ThemeManager.currentTheme]?.colors || {}), ...ThemeManager.customTheme, [colorKey]: hexValue };
    ThemeManager._updateMeshBg(allColors);
    ThemeManager._updateOrbs(allColors);
}

// Select Preset Theme
function selectPresetTheme(themeName) {
    ThemeManager.resetToPreset(themeName);
    initThemeModal();
    showToast(`✨ ${ThemeManager.presets[themeName].name} teması uygulandı!`, 'success');
}

// Change Individual Color (on change/blur)
function changeThemeColor(colorKey, hexValue) {
    if (!/^#[0-9A-F]{6}$/i.test(hexValue)) return;
    ThemeManager.setColor(colorKey, hexValue);

    // Sync both inputs
    const picker = document.getElementById(`color-${colorKey}`);
    const textInput = document.getElementById(`colortext-${colorKey}`);
    if (picker) picker.value = hexValue;
    if (textInput) textInput.value = hexValue;
}

// Save Theme — explicit save button action
function saveTheme() {
    ThemeManager.saveTheme();
    showToast('💾 Tema kaydedildi!', 'success');

    // Visual feedback on button
    const btn = document.getElementById('theme-save-btn');
    if (btn) {
        btn.textContent = '✅ Kaydedildi!';
        btn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
        setTimeout(() => {
            btn.textContent = '💾 Kaydet';
            btn.style.background = '';
        }, 2000);
    }
}

// Reset Theme to Default
function resetTheme() {
    if (confirm('Temayı varsayılana sıfırlamak istediğinizden emin misiniz?')) {
        ThemeManager.resetToPreset('default');
        initThemeModal();
        showToast('✅ Tema sıfırlandı', 'success');
    }
}

// Export Current Theme as JSON
function exportCurrentTheme() {
    const themeData = ThemeManager.exportTheme();
    const dataStr = JSON.stringify(themeData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lifecoach-theme-${themeData.name}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('📥 Tema dosyası indirildi!', 'success');
}

// Import Theme from File
function importThemeFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const themeData = JSON.parse(e.target.result);
            if (ThemeManager.importTheme(themeData)) {
                initThemeModal();
                showToast('✅ Tema yüklendi!', 'success');
            } else {
                showToast('❌ Tema yüklenemiyor', 'error');
            }
        } catch (err) {
            showToast('❌ Hata: Geçersiz dosya', 'error');
        }
    };
    reader.readAsText(file);
}

// Default toggle (if needed in future)
function toggleDarkMode() {
    openThemeModal();
}

// Export functions globally
window.openThemeModal = openThemeModal;
window.closeThemeModal = closeThemeModal;
window.selectPresetTheme = selectPresetTheme;
window.changeThemeColor = changeThemeColor;
window.livePreviewColor = livePreviewColor;
window.saveTheme = saveTheme;
window.resetTheme = resetTheme;
window.exportCurrentTheme = exportCurrentTheme;

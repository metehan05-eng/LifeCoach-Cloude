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
    
    presetsDiv.innerHTML = presets.map(preset => `
        <button onclick="selectPresetTheme('${preset.id}')" 
            class="p-3 rounded-lg border-2 transition-all ${ThemeManager.currentTheme === preset.id ? 'border-cyan-500 bg-cyan-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}">
            <div class="text-2xl mb-1">${preset.icon}</div>
            <div class="text-xs font-semibold text-slate-300">${preset.name}</div>
        </button>
    `).join('');

    // Render Color Controls
    const colorsDiv = document.getElementById('theme-color-controls');
    const currentColors = ThemeManager.getCurrentColors();
    const colorKeys = Object.keys(ThemeManager.presets[ThemeManager.currentTheme]?.colors || {});
    
    colorsDiv.innerHTML = colorKeys.map(key => `
        <div class="flex items-center gap-2">
            <label class="text-xs font-semibold text-slate-400 uppercase flex-1">${key}</label>
            <input type="color" id="color-${key}" value="${(currentColors[key] || '#000000').replace('var(-${key})', '#000000')}" 
                onchange="changeThemeColor('${key}', this.value)" 
                class="w-10 h-8 rounded cursor-pointer">
            <input type="text" value="${(currentColors[key] || '#000000').replace('var(-${key})', '#000000')}" 
                readonly class="w-20 px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-slate-300">
        </div>
    `).join('');
}

// Select Preset Theme
function selectPresetTheme(themeName) {
    ThemeManager.resetToPreset(themeName);
    initThemeModal();
    showToast(`✨ Tema değiştirildi: ${ThemeManager.presets[themeName].name}`, 'success');
}

// Change Individual Color
function changeThemeColor(colorKey, hexValue) {
    ThemeManager.setColor(colorKey, hexValue);
    
    // Update input display
    const input = document.querySelector(`input[type="text"][value="${hexValue}"]`);
    if (input) input.value = hexValue;
    
    // Update preview
    initThemeModal();
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
    showToast('📥 Tema indirildi!', 'success');
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
window.resetTheme = resetTheme;
window.exportCurrentTheme = exportCurrentTheme;

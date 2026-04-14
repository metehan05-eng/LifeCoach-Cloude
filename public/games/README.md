# Mini Oyunlar Klasörü

Bu klasöre HTML oyun dosyalarınızı ekleyin.

## Nasıl Yeni Oyun Eklenir?

1. Oyununuzu HTML dosyası olarak kaydedin (örn: `mygame.html`)
2. Bu klasöre (`public/games/`) kopyalayın
3. `life-coach-ui.html` dosyasında Mini Oyunlar bölümüne yeni bir kart ekleyin

## Örnek Oyun Kartı

```html
<!-- My Game Card -->
<div class="bg-gradient-to-br from-blue-500/10 to-cyan-600/5 border border-blue-500/20 rounded-2xl overflow-hidden hover:border-blue-400/50 transition-all group cursor-pointer" onclick="openMyGame()">
    <div class="aspect-video bg-gradient-to-br from-[#3b82f6] to-[#1e3a5f] relative overflow-hidden">
        <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center">
                <div class="text-6xl mb-2">🎮</div>
                <div class="text-white font-bold text-lg">Benim Oyunum</div>
            </div>
        </div>
        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div class="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform">
                <i class="fa-solid fa-play text-white text-2xl ml-1"></i>
            </div>
        </div>
    </div>
    <div class="p-4">
        <h3 class="font-semibold text-white mb-1">Benim Oyunum</h3>
        <p class="text-xs text-slate-400 mb-3">Oyun açıklaması buraya</p>
        <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <i class="fa-solid fa-star mr-1"></i>+10 XP
            </span>
        </div>
    </div>
</div>
```

## Örnek JavaScript Fonksiyonu

```javascript
function openMyGame() {
    const modal = document.getElementById('my-game-modal');
    const iframe = document.getElementById('my-game-iframe');
    iframe.src = './games/mygame.html';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    showToast('Oyun başladı!', 'success');
}

function closeMyGame() {
    const modal = document.getElementById('my-game-modal');
    const iframe = document.getElementById('my-game-iframe');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    iframe.src = 'about:blank';
}
```

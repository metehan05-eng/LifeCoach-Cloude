#!/bin/bash

echo "----------------------------------------------------------------"
echo "🧹 Git Temizlik Aracı (node_modules)"
echo "----------------------------------------------------------------"

# 1. node_modules'u Git indeksinden sil (dosyalar diskte kalır)
echo "📦 node_modules takipten çıkarılıyor..."
git rm -r --cached node_modules

# 2. .gitignore kontrolü
if ! grep -q "node_modules/" .gitignore; then
    echo "📝 .gitignore dosyasına node_modules ekleniyor..."
    echo "node_modules/" >> .gitignore
fi

# 3. Değişikliği commit et
git commit -m "FIX: node_modules Git takibinden çıkarıldı"
echo "✅ İşlem tamamlandı. Şimdi 'git push' yapabilirsiniz."
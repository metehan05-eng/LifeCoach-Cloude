#!/bin/bash

REPO_URL="https://github.com/metehan05-eng/LifeCoach-Cloude.git"

echo "----------------------------------------------------------------"
echo "GitHub Yükleme Aracı"
echo "Hedef: $REPO_URL"
echo "----------------------------------------------------------------"
echo "⚠️  ÖNEMLİ: GitHub şifre ile girişi kaldırmıştır."
echo "Şifre sorulduğunda 'Personal Access Token' yapıştırmalısınız."
echo "----------------------------------------------------------------"

# 1. Git Başlatma
if [ ! -d ".git" ]; then
    echo "📂 Git deposu başlatılıyor..."
    git init
    git branch -M main
else
    echo "✅ Git deposu zaten mevcut."
fi

# 2. Remote Ayarlama
if git remote | grep -q "^origin$"; then
    echo "🔄 Mevcut remote bağlantısı güncelleniyor..."
    git remote remove origin
fi

git remote add origin "$REPO_URL"
echo "🔗 Remote eklendi: origin -> $REPO_URL"

# 3. Dosyaları Ekleme ve Commit
echo "📦 Dosyalar ekleniyor..."
git add .

read -p "Commit mesajınız (Varsayılan: Vercel entegrasyonu ve düzeltmeler): " COMMIT_MSG
COMMIT_MSG=${COMMIT_MSG:-"Vercel entegrasyonu ve düzeltmeler"}
git commit -m "$COMMIT_MSG" || echo "⚠️ Commit edilecek yeni değişiklik yok."

# 4. Push
echo "🚀 GitHub'a gönderiliyor..."
echo "👉 Kullanıcı Adı: metehan05-eng"
echo "👉 Şifre: (Token'ınızı yapıştırın)"
git push -u origin main

echo "----------------------------------------------------------------"
echo "✅ İşlem tamamlandı. Şimdi Vercel üzerinden projenizi import edebilirsiniz."
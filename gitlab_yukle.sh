#!/bin/bash

REPO_PATH="gitlab.com/hanshoperbas-group/lifecoachai.git"

echo "----------------------------------------------------------------"
echo "GitLab Yükleme Aracı"
echo "----------------------------------------------------------------"
echo "⚠️  GitLab artık şifre ile giriş kabul etmemektedir."
echo "Lütfen oluşturduğunuz 'Personal Access Token'ı kullanın."
echo "----------------------------------------------------------------"

read -p "GitLab Kullanıcı Adınız: " GIT_USER
read -s -p "GitLab Access Token (glpat-...): " GIT_TOKEN
echo ""

# Token içeren güvenli URL oluşturuluyor
REPO_URL="https://${GIT_USER}:${GIT_TOKEN}@${REPO_PATH}"

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
echo "📦 Dosyalar ekleniyor (node_modules ve hassas dosyalar hariç)..."
git add .
git commit -m "Proje GitLab'a yüklendi" || echo "⚠️ Commit edilecek yeni değişiklik yok."

# 4. Push
echo "🚀 GitLab'a gönderiliyor..."
echo "👉 Not: Giriş yapmanız gerekebilir."
git push -u origin main

echo "----------------------------------------------------------------"
echo "✅ İşlem tamamlandı."
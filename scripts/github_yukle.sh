#!/bin/bash

# Repo bilgileri bu proje için sabitlendi
GITHUB_USER="metehan05-eng"
GITHUB_REPO="LifeCoach-Cloude"
REPO_URL="git@github.com:${GITHUB_USER}/${GITHUB_REPO}.git"

echo "----------------------------------------------------------------"
echo "GitHub Yükleme Aracı"
echo "Hedef: $REPO_URL"
echo "----------------------------------------------------------------"
echo "⚠️  ÖNEMLİ: SSH anahtarları ile otomatik bağlantı kurulacak."
echo "Şifre sorulmayacak, SSH key'ler kullanılacak."
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
# 'origin' adında bir remote olup olmadığını ve doğru URL'ye sahip olup olmadığını kontrol et
if git remote | grep -q "^origin$"; then
    CURRENT_URL=$(git remote get-url origin)
    if [ "$CURRENT_URL" != "$REPO_URL" ]; then
        echo "🔄 Mevcut remote bağlantısı güncelleniyor..."
        git remote set-url origin "$REPO_URL"
        echo "✅ Remote güncellendi: origin -> $REPO_URL"
    else
        echo "✅ Remote bağlantısı zaten doğru şekilde ayarlanmış."
    fi
else
    echo "🔗 Yeni remote bağlantısı ekleniyor..."
    git remote add origin "$REPO_URL"
    echo "🔗 Remote eklendi: origin -> $REPO_URL"
fi

# 3. Dosyaları Ekleme ve Commit
echo "📦 Dosyalar ekleniyor..."
git add .

read -p "Commit mesajınız (Varsayılan: Geliştirmeler ve düzeltmeler): " COMMIT_MSG
COMMIT_MSG=${COMMIT_MSG:-"Geliştirmeler ve düzeltmeler"}
git commit -m "$COMMIT_MSG" || echo "⚠️ Commit edilecek yeni değişiklik yok."

# 4. Push
echo "🚀 GitHub'a gönderiliyor..."
git push -u origin main

echo "----------------------------------------------------------------"
echo "✅ İşlem tamamlandı."
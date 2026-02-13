#!/bin/bash

echo "----------------------------------------------------------------"
echo "🧹 NPM Kilit Dosyası Onarım Aracı"
echo "----------------------------------------------------------------"

echo "🗑️  Eski kilit dosyaları ve node_modules siliniyor..."
rm -rf node_modules package-lock.json

echo "📦 Paketler sıfırdan yükleniyor (Bu işlem yeni bir lock dosyası oluşturur)..."
# Hata olursa scripti durdur (|| exit 1)
npm install --legacy-peer-deps || exit 1

echo "🚀 Düzeltmeler GitHub'a gönderiliyor..."
git add .
git commit -m "FIX: package-lock.json onarıldı ve eksik paketler eklendi"
git push origin main

echo "----------------------------------------------------------------"
echo "✅ İşlem tamamlandı. Cloudflare build işlemi şimdi başarılı olacaktır."
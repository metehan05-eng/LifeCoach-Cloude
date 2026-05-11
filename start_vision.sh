#!/bin/bash

# HAN Vision AI - Linux Başlatıcı
echo "🚀 HAN Vision AI Başlatılıyor (Linux)..."

# 1. Sanal ortam kontrolü (Venv)
if [ ! -d "venv" ]; then
    echo "📦 Sanal ortam oluşturuluyor..."
    python3 -m venv venv
fi

# 2. Aktif et ve paketleri yükle
source venv/bin/activate
echo "📥 Bağımlılıklar kontrol ediliyor..."
pip install --upgrade pip
pip install -r requirements.txt

# 3. OpenCV için gerekli olabilecek sistem kütüphanesi kontrolü (Debian/Ubuntu tabanlılar için)
if command -v apt-get &> /dev/null; then
    echo "🔍 Sistem kütüphaneleri kontrol ediliyor (sudo gerekebilir)..."
    # libgl1 (OpenCV için gerekli)
    # sudo apt-get update && sudo apt-get install -y libgl1
fi

# 4. Servisi Başlat
echo "🔥 HAN Vision API servisi http://localhost:8000 adresinde başlatılıyor..."
python3 api/hanvision.py

#!/bin/bash

# Kimi K2.5 API Test Scripti
# Bu script, Kimi K2.5 API'sinin doğru çalışıp çalışmadığını kontrol eder

# .env.local dosyasından ortam değişkenlerini yükle
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '#' | xargs)
    echo "✅ .env.local yüklendi"
else
    echo "❌ Hata: .env.local dosyası bulunamadı!"
    echo "📝 Lütfen .env.local dosyasını oluşturun ve KIMI_API_KEY'i ekleyin"
    exit 1
fi

# Ortam değişkenlerinden key'i al
KIMI_API_KEY="${KIMI_API_KEY}"
KIMI_API_URL="https://api.moonshot.cn/v1/chat/completions"
KIMI_MODEL="${KIMI_MODEL:-kimi-k2.6}"

# Key'in ayarlanıp ayarlanmadığını kontrol et
if [ -z "$KIMI_API_KEY" ]; then
    echo "❌ Hata: KIMI_API_KEY .env.local dosyasında tanımlı değil!"
    echo "📝 .env.local dosyasına şu satırı ekleyin:"
    echo "   KIMI_API_KEY=sk-YourActualKeyHere"
    exit 1
fi

echo "🚀 Kimi K2.5 API Test Başladı..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "API Key: ${KIMI_API_KEY:0:20}...${KIMI_API_KEY: -10}"
echo "Model: $KIMI_MODEL"
echo "URL: $KIMI_API_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Basit Soru
echo "📝 Test 1: Basit Soru"
echo "Soru: Kimi K2.5 kimdir?"
echo ""

RESPONSE=$(curl -s -X POST "$KIMI_API_URL" \
  -H "Authorization: Bearer $KIMI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'$KIMI_MODEL'",
    "messages": [
      {
        "role": "system",
        "content": "Sen bir yapay zeka asistanısın. Türkçe cevap ver."
      },
      {
        "role": "user",
        "content": "Kimi K2.5 kimdir? Kısaca açıkla."
      }
    ],
    "temperature": 0.7,
    "max_tokens": 1024
  }')

echo "📥 API Yanıtı:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 2: Kod Yazma
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Test 2: Kod Yazma"
echo "İstek: JavaScript'te 'Hello Kimi' yazan bir fonksiyon yaz"
echo ""

RESPONSE=$(curl -s -X POST "$KIMI_API_URL" \
  -H "Authorization: Bearer $KIMI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'$KIMI_MODEL'",
    "messages": [
      {
        "role": "user",
        "content": "JavaScript'"'"'te Hello Kimi yazan bir fonksiyon yaz. Sadece kodu döndür."
      }
    ],
    "temperature": 0.5,
    "max_tokens": 512
  }')

echo "📥 API Yanıtı:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 3: Çok turlu konuşma (Conversation)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Test 3: Çok Turlu Konuşma"
echo "Bağlam: User 'Merhaba', Model cevap verecek, User sorular soracak"
echo ""

RESPONSE=$(curl -s -X POST "$KIMI_API_URL" \
  -H "Authorization: Bearer $KIMI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'$KIMI_MODEL'",
    "messages": [
      {
        "role": "system",
        "content": "Sen LifeCoach AI asistanısın. Kullanıcıya yardımcı ve samimi cevaplar ver."
      },
      {
        "role": "user",
        "content": "Merhaba! Bugün hava çok sıcak."
      },
      {
        "role": "assistant",
        "content": "Merhaba! Evet, yazlık hava başlamış. Hidrasyonunuza dikkat edin ve serin yerlerde vakit geçirmenizi tavsiye ederim."
      },
      {
        "role": "user",
        "content": "Peki sıcakta egzersiz yapmak için ne tavsiye edersin?"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 1024
  }')

echo "📥 API Yanıtı:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test Tamamlandı!"
echo ""
echo "💡 İpuçları:"
echo "  - 'jq' yüklü değilse, JSON yanıtı biçimlendirilmemiş olarak görebilirsiniz"
echo "  - API anahtarını .env.local dosyasına kaydedin (GitHub'a yüklemeyin!)"
echo "  - Production'da bu anahtarı güvenli bir şekilde saklamak önemli"
echo ""

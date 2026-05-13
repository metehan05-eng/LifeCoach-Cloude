#!/bin/bash

# Deepseek API Test Scripti
# Bu script, Deepseek API'sinin doğru çalışıp çalışmadığını kontrol eder

# .env.local dosyasından ortam değişkenlerini yükle
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '#' | xargs)
    echo "✅ .env.local yüklendi"
else
    echo "❌ Hata: .env.local dosyası bulunamadı!"
    echo "📝 Lütfen .env.local dosyasını oluşturun ve DEEPSEEK_API_KEY'i ekleyin"
    exit 1
fi

# Ortam değişkenlerinden key'i al
DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY}"
DEEPSEEK_API_URL="https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL="${DEEPSEEK_MODEL:-deepseek-chat}"

# Key'in ayarlanıp ayarlanmadığını kontrol et
if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo "❌ Hata: DEEPSEEK_API_KEY .env.local dosyasında tanımlı değil!"
    echo "📝 .env.local dosyasına şu satırı ekleyin:"
    echo "   DEEPSEEK_API_KEY=sk-YourActualKeyHere"
    exit 1
fi

echo "🚀 Deepseek API Test Başladı..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "API Key: ${DEEPSEEK_API_KEY:0:20}...${DEEPSEEK_API_KEY: -10}"
echo "Model: $DEEPSEEK_MODEL"
echo "URL: $DEEPSEEK_API_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Basit Soru
echo "📝 Test 1: Basit Soru"
echo "Soru: Deepseek nedir?"
echo ""

RESPONSE=$(curl -s -X POST "$DEEPSEEK_API_URL" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'$DEEPSEEK_MODEL'",
    "messages": [
      {
        "role": "system",
        "content": "Sen bir yapay zeka asistanısın. Türkçe cevap ver."
      },
      {
        "role": "user",
        "content": "Deepseek nedir? Kısaca açıkla."
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
echo "İstek: JavaScript'te 'Hello Deepseek' yazan bir fonksiyon yaz"
echo ""

RESPONSE=$(curl -s -X POST "$DEEPSEEK_API_URL" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'$DEEPSEEK_MODEL'",
    "messages": [
      {
        "role": "user",
        "content": "JavaScript'"'"'te Hello Deepseek yazan bir fonksiyon yaz. Sadece kodu döndür."
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

RESPONSE=$(curl -s -X POST "$DEEPSEEK_API_URL" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'$DEEPSEEK_MODEL'",
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

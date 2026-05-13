#!/bin/bash

# OpenRouter API Test Scripti
# Bu script, OpenRouter API'sinin doğru çalışıp çalışmadığını kontrol eder

# .env.local dosyasından ortam değişkenlerini yükle
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | grep -v '^$' | xargs)
    echo "✅ .env.local yüklendi"
else
    echo "❌ Hata: .env.local dosyası bulunamadı!"
    echo "📝 Lütfen .env.local dosyasını oluşturun ve OPENROUTER_API_KEY'i ekleyin"
    exit 1
fi

DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY}"
OPENROUTER_API_KEY="${OPENROUTER_API_KEY}"
OPENROUTER_MODELS="${OPENROUTER_MODELS:-openai/gpt-4o-mini|mistral/mistral-large|anthropic/claude-3-opus}"
OPENROUTER_API_URL="https://openrouter.ai/api/v1/chat/completions"

if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "❌ Hata: OPENROUTER_API_KEY .env.local dosyasında tanımlı değil!"
    echo "📝 .env.local dosyasına şu satırı ekleyin:"
    echo "   OPENROUTER_API_KEY=sk-YourActualKeyHere"
    exit 1
fi

echo "🚀 OpenRouter API Test Başladı..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "API Key: ${OPENROUTER_API_KEY:0:20}...${OPENROUTER_API_KEY: -10}"
echo "Models: $OPENROUTER_MODELS"
echo "URL: $OPENROUTER_API_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for model in $(echo "$OPENROUTER_MODELS" | tr '|' '\n'); do
  echo "📝 Test: $model"
  RESPONSE=$(curl -s -X POST "$OPENROUTER_API_URL" \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "'
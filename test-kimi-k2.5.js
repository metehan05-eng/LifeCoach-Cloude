/**
 * Kimi K2.5 API Test Dosyası
 * Node.js üzerinden Kimi K2.5 API'nin test edilmesi
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// .env.local dosyasını oku ve parse et
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ Hata: .env.local dosyası bulunamadı!');
    console.error('📝 Lütfen .env.local dosyasını oluşturun ve KIMI_API_KEY\'i ekleyin');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Boş satırları ve yorum satırlarını atla
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;
    
    const [key, ...valueParts] = trimmedLine.split('=');
    const value = valueParts.join('=').trim();
    
    if (key && value) {
      process.env[key.trim()] = value;
    }
  }
}

// .env.local dosyasını yükle
loadEnv();

const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_MODEL = process.env.KIMI_MODEL || 'kimi-k2.6';

// API Key kontrolü
if (!KIMI_API_KEY) {
  console.error('❌ Hata: KIMI_API_KEY .env.local dosyasında tanımlı değil!');
  console.error('📝 .env.local dosyasına şu satırları ekleyin:');
  console.error('   KIMI_API_KEY=sk-YourActualKeyHere');
  console.error('   KIMI_MODEL=kimi-k2.5');
  process.exit(1);
}

// Kimi K2.5 Client oluştur
const kimiClient = new OpenAI({
  apiKey: KIMI_API_KEY.trim(),
  baseURL: 'https://api.moonshot.cn/v1'
});

async function testKimiBasic() {
  console.log('🚀 Kimi K2.5 - Basit Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const response = await kimiClient.chat.completions.create({
      model: KIMI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Sen bir yapay zeka asistanısın. Türkçe, samimi ve yardımcı cevaplar ver.'
        },
        {
          role: 'user',
          content: 'Merhaba! Kimi K2.5 hakkında bana kısaca bilgi verir misin?'
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    console.log('\n✅ API Yanıtı:');
    console.log(response.choices[0].message.content);
    console.log('\n📊 Token Kullanımı:');
    console.log(`  - Prompt: ${response.usage.prompt_tokens}`);
    console.log(`  - Completion: ${response.usage.completion_tokens}`);
    console.log(`  - Total: ${response.usage.total_tokens}`);
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

async function testKimiCode() {
  console.log('\n\n🚀 Kimi K2.5 - Kod Yazma Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const response = await kimiClient.chat.completions.create({
      model: KIMI_MODEL,
      messages: [
        {
          role: 'user',
          content: 'JavaScript\'te bir fibonacci fonksiyonu yaz. Sadece kodu ver.'
        }
      ],
      temperature: 0.5,
      max_tokens: 512
    });

    console.log('\n✅ API Yanıtı:');
    console.log(response.choices[0].message.content);
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

async function testKimiConversation() {
  console.log('\n\n🚀 Kimi K2.5 - Çok Turlu Konuşma Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const response = await kimiClient.chat.completions.create({
      model: KIMI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Sen LifeCoach AI asistanısın. Kullanıcının yaşam hedeflerine ulaşmasını yardımcı ol.'
        },
        {
          role: 'user',
          content: 'Bu hafta spora başlamak istiyorum ama motivasyon bulamıyorum.'
        },
        {
          role: 'assistant',
          content: 'Anladım! Motivasyon bulmak çoğu insanın yaşadığı bir sorun. Sana bazı ipuçları verebilirim.'
        },
        {
          role: 'user',
          content: 'Lütfen, başlaması kolay olan egzersizler nelerdir?'
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    console.log('\n✅ API Yanıtı:');
    console.log(response.choices[0].message.content);
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Kimi K2.5 API Test Suite              ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  console.log(`API Endpoint: https://api.moonshot.cn/v1`);
  console.log(`Model: ${KIMI_MODEL}`);
  console.log(`API Key: ${KIMI_API_KEY.substring(0, 20)}...${KIMI_API_KEY.substring(KIMI_API_KEY.length - 10)}\n`);

  await testKimiBasic();
  await testKimiCode();
  await testKimiConversation();

  console.log('\n\n✅ Tüm Testler Tamamlandı!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Testleri Çalıştır
runAllTests().catch(console.error);

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import base64
import os
import cv2
import numpy as np
from deepface import DeepFace
import uuid
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="HAN Vision AI Engine")

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Yüz veritabanı dizini
DB_PATH = "api/dataset"
if not os.path.exists(DB_PATH):
    os.makedirs(DB_PATH)

class AnalyzeRequest(BaseModel):
    image_base64: str

def get_psychological_insights(emotions):
    """
    Duygu verilerinden 'Medyum' tarzı derin psikolojik çıkarımlar yapar.
    """
    dominant = max(emotions, key=emotions.get)
    stress = (emotions.get('fear', 0) + emotions.get('sad', 0) + emotions.get('angry', 0)) / 3
    
    # Yalan tespiti heuristiği (Stres ve Şaşkınlık yüksekse, Mutluluk çok düşükse)
    truth_prob = 100 - (emotions.get('fear', 0) * 0.5 + emotions.get('surprise', 0) * 0.3)
    if emotions.get('happy', 0) > 80:
        truth_prob = min(truth_prob + 20, 100)
    
    # Kişilik analizi simülasyonu
    insights = ""
    if dominant == 'happy':
        insights = "Pozitif bir enerji yayıyorsun, ancak bu mutluluğun altında bir şeyleri gizliyor olabilir misin?"
    elif dominant == 'angry':
        insights = "Şu an içsel bir savunma halindesin. Birine veya bir duruma karşı ördüğün duvarları görüyorum."
    elif dominant == 'sad':
        insights = "Ruhunda bir yorgunluk var. Geçmişe takılı kalmış bir düşünce seni aşağı çekiyor."
    elif dominant == 'fear':
        insights = "Belirsizlik seni korkutuyor. Kontrolü kaybetme endişesi yaşıyorsun."
    else:
        insights = "Görünüşte sakinsin ama zihnin fırtınalı. Odaklanmakta zorluk çekiyor gibisin."

    return {
        "insight": insights,
        "stress_level_percentage": round(stress, 2),
        "truth_probability": round(max(min(truth_prob, 100), 0), 2),
        "dominant_emotion": dominant
    }

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    try:
        # Base64'ten görüntüye
        img_data = base64.b64decode(request.image_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Geçici dosya olarak kaydet (DeepFace dosya yolu bekler)
        temp_path = f"api/temp_{uuid.uuid4()}.jpg"
        cv2.imwrite(temp_path, img)
        
        try:
            # 1. Analiz (Duygu, Yaş, Cinsiyet)
            analysis = DeepFace.analyze(img_path=temp_path, actions=['emotion', 'age', 'gender'], enforce_detection=False)
            
            # 2. Tanıma (Yüzü ezberleme/hatırlama)
            # Eğer dataset boşsa find hata verebilir, kontrol edelim
            identity = "Unknown"
            if len(os.listdir(DB_PATH)) > 0:
                results = DeepFace.find(img_path=temp_path, db_path=DB_PATH, enforce_detection=False, silent=True)
                if len(results) > 0 and not results[0].empty:
                    identity = results[0].iloc[0]['identity']
                    identity = os.path.basename(identity).split('_')[0]
            
            # Eğer tanınmadıysa yeni bir kayıt oluştur (Ezberleme)
            if identity == "Unknown":
                new_id = f"user_{uuid.uuid4().hex[:8]}"
                save_path = os.path.join(DB_PATH, f"{new_id}_main.jpg")
                cv2.imwrite(save_path, img)
                identity = new_id

            # Duygu sonuçlarını al
            emotions = analysis[0]['emotion']
            psych = get_psychological_insights(emotions)

            response = {
                "status": "success",
                "identity": identity,
                "age": analysis[0]['age'],
                "gender": analysis[0]['dominant_gender'],
                "dominant_emotion": psych['dominant_emotion'],
                "stress_level_percentage": psych['stress_level_percentage'],
                "truth_probability": psych['truth_probability'],
                "psychological_insight": psych['insight'],
                "raw_emotions": emotions
            }
            
            return response

        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as e:
        print(f"Error in vision analysis: {str(e)}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

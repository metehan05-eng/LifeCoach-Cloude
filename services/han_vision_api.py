from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import base64
from deepface import DeepFace
import time

# HAN Vision Engine - Biyometrik Analiz Sunucusu
app = FastAPI(title="HAN Vision Engine", description="Real-time Biometric and Emotion Analysis")

# CORS (Next.js'in API ile konuşabilmesi için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImagePayload(BaseModel):
    image_base64: str

@app.post("/analyze")
async def analyze_state(payload: ImagePayload):
    try:
        start_time = time.time()
        
        # 1. Base64 Görüntüyü OpenCV formatına çevir
        img_data = base64.b64decode(payload.image_base64)
        np_arr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Görüntü okunamadı.")

        # 2. DeepFace ile duygu ve asabi/stres durumunu analiz et
        # enforce_detection=False yüz algılanmasa bile çökmemesi için
        analysis = DeepFace.analyze(img_path=img, actions=['emotion', 'age', 'gender'], enforce_detection=False)
        
        if isinstance(analysis, list):
            result = analysis[0]
        else:
            result = analysis
            
        dominant_emotion = result.get('dominant_emotion', 'neutral')
        emotion_probs = result.get('emotion', {})
        
        # Yalan / Stres Çıkarımı (Temsili Algoritma)
        # Fear, Sad veya Disgust yüksekse stres katsayısı artar.
        stress_level = emotion_probs.get('fear', 0) + emotion_probs.get('sad', 0) + emotion_probs.get('disgust', 0)
        
        is_stressed = bool(stress_level > 25)
        is_truthful = bool(stress_level < 40) # Stres azsa muhtemelen doğru söylüyor

        process_time = round(time.time() - start_time, 2)
        
        return {
            "status": "success",
            "dominant_emotion": dominant_emotion,
            "stress_level_percentage": round(stress_level, 2),
            "is_stressed": is_stressed,
            "truth_probability": round(100 - stress_level, 2), # Yalan tespiti için psikolojik tahmin
            "all_emotions": emotion_probs,
            "process_time_seconds": process_time,
            "han_diagnosis": f"Kullanıcı şu an {dominant_emotion} hissediyor. Stres seviyesi: %{round(stress_level, 2)}."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analiz Hatası: {str(e)}")

@app.get("/")
def health_check():
    return {"status": "HAN Vision Engine Online"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

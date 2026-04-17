import os
import requests
import json
import time
from datetime import datetime

# AI Endpoint Monitoring Script for LifeCoach AI
# Bu betik, API anahtarlarınızı kullanarak AI modellerinin durumunu kontrol eder.

def log_status(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def check_gemini_models():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        log_status("HATA: GEMINI_API_KEY bulunamadı.")
        return []

    log_status("Gemini modelleri listeleniyor (v1 ve v1beta denemesi)...")
    
    # Her iki versiyonu da dene
    versions = ["v1", "v1beta"]
    all_found_models = []
    
    for ver in versions:
        url = f"https://generativelanguage.googleapis.com/{ver}/models?key={api_key}"
        try:
            response = requests.get(url)
            if response.status_code == 200:
                models = response.json().get("models", [])
                for m in models:
                    m["api_version"] = ver # Versiyon bilgisini sakla
                    all_found_models.append(m)
            else:
                log_status(f"Bilgi: {ver} üzerinden liste alınamadı ({response.status_code})")
        except Exception as e:
            log_status(f"Hata ({ver} listeleme): {str(e)}")

    if not all_found_models:
        log_status("HATA: Hiçbir model bulunamadı.")
        return []

    log_status(f"Sistemde toplam {len(all_found_models)} model tanımı bulundu.")
    # Tekrarları temizle (model ID'sine göre)
    seen = set()
    unique_models = []
    for m in all_found_models:
        if m["name"] not in seen:
            unique_models.append(m)
            seen.add(m["name"])
    
    results = []
    for model in unique_models:
        name = model.get("name", "")
        display_name = model.get("displayName", "")
        methods = model.get("supportedGenerationMethods", [])
        version = model.get("api_version", "v1")
        
        if "generateContent" in methods:
            log_status(f"Test ediliyor: {display_name} ({name}) - API: {version}")
            status = probe_model(name, api_key, version)
            results.append({
                "model_id": name,
                "name": display_name,
                "status": status,
                "api_version": version,
                "last_check": datetime.now().isoformat()
            })
    
    return results

def probe_model(model_name, api_key, version="v1"):
    """Modele çok kısa bir istek göndererek aktifliğini test eder."""
    url = f"https://generativelanguage.googleapis.com/{version}/{model_name}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": "P"}]}],
        "generationConfig": {"maxOutputTokens": 1}
    }
    
    try:
        start_time = time.time()
        res = requests.post(url, json=payload, timeout=10)
        latency = round((time.time() - start_time) * 1000, 2)
        
        if res.status_code == 200:
            return f"ONLINE ({latency}ms)"
        else:
            return f"ERROR ({res.status_code}: {res.reason})"
    except requests.exceptions.Timeout:
        return "TIMEOUT"
    except Exception as e:
        return f"FAILED ({str(e)})"

def find_best_model(status_results):
    """
    Kullanılabilir modeller arasından en uygun (güncel ve hızlı) olanı seçer.
    Öncelikle 'flash' modellerini tercih eder.
    """
    online_models = [m for m in status_results if "ONLINE" in m["status"]]
    if not online_models:
        return None
    
    # 1. Flash modellerini filtrele
    flash_models = [m for m in online_models if "flash" in m["model_id"].lower()]
    
    # Eğer flash modeli varsa en yenisini (isime göre alfabetik sonuncu genellikle daha günceldir) seç
    if flash_models:
        # İsimlerdeki 'exp', 'beta', 'preview' gibi ibareleri olanları sona atıp stable olanı öne çıkarmak için sıralama
        stable_flash = sorted(flash_models, key=lambda x: x["model_id"], reverse=True)[0]
        return stable_flash
    
    # Yoksa herhangi bir online modeli seç
    return sorted(online_models, key=lambda x: x["model_id"], reverse=True)[0]

def update_node_config(best_model):
    if not best_model:
        return
    
    config_path = os.path.join(os.path.dirname(__file__), "data/ai_config.json")
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    
    config_data = {
        "active_model": best_model["model_id"].replace("models/", ""),
        "display_name": best_model["name"],
        "updated_at": datetime.now().isoformat(),
        "source": "auto_discovery"
    }
    
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=4, ensure_ascii=False)
    
    log_status(f"Konfigürasyon güncellendi: {config_data['active_model']}")

def save_report(results):
    report_path = os.path.join(os.path.dirname(__file__), "data/ai_status_report.json")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=4, ensure_ascii=False)
    log_status(f"Rapor kaydedildi: {report_path}")

if __name__ == "__main__":
    status_results = check_gemini_models()
    if status_results:
        save_report(status_results)
        
        # En iyi modeli bul ve Node.js'in okuyacağı dosyayı güncelle
        best = find_best_model(status_results)
        if best:
            update_node_config(best)
            print(f"\n✨ Önerilen ve Aktif Edilen Model: {best['name']} ({best['model_id']})")
        
        print("\n--- AI DURUM ÖZETİ ---")
        for res in status_results:
            color = "✅" if "ONLINE" in res["status"] else "❌"
            print(f"{color} {res['name']}: {res['status']}")

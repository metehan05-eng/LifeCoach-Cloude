import sys
import json
import requests
import yt_dlp
import os

# Hugging Face Whisper API yapılandırması
HF_API_URL = "https://api-inference.huggingface.co/models/openai/whisper-large-v3"
HF_HEADERS = {"Authorization": f"Bearer {os.getenv('HUGGING_FACE_API_KEY')}"}

def download_audio_safely(youtube_url):
    output_path = '/tmp/han_secure_audio.%(ext)s'

    ydl_opts = {
        'format': 'm4a/bestaudio/best',
        'outtmpl': output_path,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'm4a',
        }],
        'quiet': True,
        'no_warnings': True,
        'http_chunk_size': 1048576,
        'user_agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0',
        'referer': 'https://www.youtube.com/',
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web'],
                'skip': ['dash', 'hls']
            }
        },
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_url])
    return '/tmp/han_secure_audio.m4a'

def query_whisper(filename):
    with open(filename, "rb") as f:
        data = f.read()
    response = requests.post(HF_API_URL, headers=HF_HEADERS, data=data)
    if response.status_code != 200:
        raise Exception(f"Hugging Face API Hatası: {response.text}")
    return response.json()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "URL parametresi eksik."}))
        sys.exit(1)

    url = sys.argv[1]
    audio_path = None

    try:
        audio_path = download_audio_safely(url)
        whisper_response = query_whisper(audio_path)
        transcript = whisper_response.get("text", "")
        print(json.dumps({"success": True, "transcript": transcript}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
    finally:
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)

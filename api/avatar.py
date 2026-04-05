import sys
import json
import base64
import os
import urllib.parse

try:
    import google.generativeai as genai
except ImportError:
    print(json.dumps({"error": "google.generativeai modülü yüklü değil. Sunucuda 'pip install google-generativeai' çalıştırın."}))
    sys.exit(0)

def main():
    try:
        # Read JSON from stdin
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input provided"}))
            return
            
        payload = json.loads(input_data)
        base64_image = payload.get("imageBase64")
        user_prompt = payload.get("prompt", "")
        
        if not base64_image:
            print(json.dumps({"error": "Resim verisi eksik."}))
            return
            
        # Get API key from env
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print(json.dumps({"error": "GEMINI_API_KEY çevresel değişkeni bulunamadı."}))
            return
            
        genai.configure(api_key=api_key)
        
        # Determine mime type and clean base64 data
        mime_type = "image/jpeg"
        if ";" in base64_image and "base64," in base64_image:
            mime_type = base64_image.split(';')[0].split(':')[1]
            base64_data = base64_image.split(',')[1]
        else:
            base64_data = base64_image
            
        image_bytes = base64.b64decode(base64_data)
        
        prompt = """Analyze the uploaded selfie and extract the following:
- Face shape
- Skin tone
- Hair style and color
- Eye color
- Gender (if detectable)
- Age range (approximate)
- Style (casual, modern, sporty, etc.)

Based on these features and a general vibe, assign a Personality type (e.g., "Strategist", "Builder", "Explorer"), Strengths (e.g., "focus", "creativity"), and Weaknesses.
"""
        if user_prompt:
            prompt += f"\n\nUSER'S DESIRED CHARACTER TRAITS: {user_prompt}\n(IMPORTANT: Incorporate these traits into the final personality analysis, strengths, weaknesses, and vibe. Adapt the character specifically to these requested traits!)\n"

        prompt += """\nReturn ONLY structured JSON in the exact format below, with NO markdown formatting, NO backticks, and NO additional text:
{
  "face_shape": "oval",
  "skin_tone": "medium",
  "hair": "short black",
  "eyes": "brown",
  "style": "casual",
  "vibe": "focused, determined",
  "personality_type": "Strategist",
  "strengths": ["focus", "discipline"],
  "weaknesses": ["overthinking"]
}"""

        model = genai.GenerativeModel(model_name="gemini-1.5-pro")
        
        image_part = {
            "mime_type": mime_type,
            "data": image_bytes
        }
        
        response = model.generate_content([prompt, image_part], generation_config={"temperature": 0.7})
        response_text = response.text.strip()
        
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        data = json.loads(response_text.strip())
        
        # Avatar URL via DiceBear Adventure style
        seed = urllib.parse.quote_plus(data.get("vibe", "") + " " + data.get("hair", ""))
        avatar_url = f"https://api.dicebear.com/7.x/adventurer/svg?seed={seed}"
        
        print(json.dumps({
            "success": True,
            "analysis": data,
            "avatarUrl": avatar_url
        }))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()

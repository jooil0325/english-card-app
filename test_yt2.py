from youtube_transcript_api import YouTubeTranscriptApi
import re
import json
import urllib.parse
import urllib.request

def fetch_youtube_sentences(video_url):
    match = re.search(r'(?:v=|\/|be\/)([0-9A-Za-z_-]{11})', video_url)
    if not match:
        return []
    video_id = match.group(1)
    
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id, ['en'])
        
        sentences = []
        current = ""
        for item in transcript:
            text = item.text.replace('\n', ' ').strip()
            if not text:
                continue
            current += " " + text
            if text.endswith('.') or text.endswith('?') or text.endswith('!') or len(current) > 70:
                s = current.strip()
                if len(s) >= 10:
                    sentences.append(s)
                current = ""
        if current.strip() and len(current.strip()) >= 10:
            sentences.append(current.strip())
            
        return sentences
    except Exception as e:
        print("Transcript API error:", e)
        return []

def translate_korean(text):
    try:
        url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=" + urllib.parse.quote(text)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req).read().decode('utf-8')
        data = json.loads(res)
        translated = "".join([item[0] for item in data[0] if item[0]])
        return translated
    except Exception:
        return f"[번역] {text}"

if __name__ == '__main__':
    # Test Steve Jobs Stanford Speech or any video
    url = "https://www.youtube.com/watch?v=UF8uR6Z6KLc" 
    sents = fetch_youtube_sentences(url)
    print(f"Extracted {len(sents)} English sentences from YouTube!")
    for s in sents[:3]:
        print("ENG:", s)
        print("KOR:", translate_korean(s))

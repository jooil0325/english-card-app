import urllib.request
import urllib.parse
import re
import html
import json

def extract_youtube_subtitles(video_url):
    # Match Video ID
    match = re.search(r'(?:v=|\/|be\/)([0-9A-Za-z_-]{11})', video_url)
    if not match:
        print("Invalid YouTube URL")
        return []
    video_id = match.group(1)
    
    url = f"https://www.youtube.com/watch?v={video_id}"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
    })
    
    try:
        html_content = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
        
        # Search for playerCaptionsTracklistRenderer or captionTracks
        caption_tracks = []
        
        # Pattern 1: captionTracks json array
        cap_match = re.search(r'"captionTracks":\s*(\[.*?\])', html_content)
        if cap_match:
            try:
                caption_tracks = json.loads(cap_match.group(1))
            except Exception:
                pass

        # Pattern 2: ytInitialPlayerResponse
        if not caption_tracks:
            pr_match = re.search(r'ytInitialPlayerResponse\s*=\s*({.*?});', html_content)
            if pr_match:
                try:
                    data = json.loads(pr_match.group(1))
                    caption_tracks = data.get('captions', {}).get('playerCaptionsTracklistRenderer', {}).get('captionTracks', [])
                except Exception:
                    pass

        # Fallback Direct Subtitle URL
        if not caption_tracks:
            sub_url = f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en"
            try:
                sub_xml = urllib.request.urlopen(sub_url).read().decode('utf-8', errors='ignore')
                raw_texts = re.findall(r'<text[^>]*>(.*?)</text>', sub_xml)
                if raw_texts:
                    return parse_raw_texts(raw_texts)
            except Exception:
                pass
            return []

        # Find English track or first track
        en_track = next((t for t in caption_tracks if t.get('languageCode') == 'en' or 'en' in t.get('vssId', '')), caption_tracks[0])
        sub_url = en_track['baseUrl']
        
        sub_xml = urllib.request.urlopen(sub_url).read().decode('utf-8', errors='ignore')
        raw_texts = re.findall(r'<text[^>]*>(.*?)</text>', sub_xml)
        return parse_raw_texts(raw_texts)
        
    except Exception as e:
        print("Fetch error:", e)
        return []

def parse_raw_texts(raw_texts):
    sentences = []
    current = ""
    for t in raw_texts:
        clean = html.unescape(t).replace('\n', ' ').strip()
        clean = re.sub(r'<[^>]+>', '', clean)
        if not clean:
            continue
        current += " " + clean
        if clean.endswith('.') or clean.endswith('?') or clean.endswith('!') or len(current) > 70:
            sent = current.strip()
            if len(sent) >= 10:
                sentences.append(sent)
            current = ""
    if current.strip() and len(current.strip()) >= 10:
        sentences.append(current.strip())
    return sentences

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
    test_url = "https://www.youtube.com/watch?v=jNQXAC9IVRw" # Me at the zoo (first youtube video)
    sents = extract_youtube_subtitles(test_url)
    print(f"Extracted {len(sents)} sentences from YouTube URL!")
    for s in sents[:5]:
        print("ENG:", s)
        print("KOR:", translate_korean(s))

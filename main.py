import http.server
import socketserver
import urllib.parse
import urllib.request
import re
import html
import json
import sys
import os
from concurrent.futures import ThreadPoolExecutor
from youtube_transcript_api import YouTubeTranscriptApi

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8000

# Noise keywords to exclude
NOISE_PATTERNS = [
    r'\[.*?\]', r'\(.*?\)',
    r'구독', r'좋아요', r'알림\s*설정', r'시청해\s*주셔서', r'채널', r'댓글',
    r'subscribe', r'like\s+and\s+subscribe', r'thank\s+you\s+for\s+watching',
    r'welcome\s+back', r'see\s+you\s+next\s+time'
]

def is_meaningful_sentence(text):
    if not text or len(text.strip()) < 10:
        return False
    # Check if text is just noise/greeting
    for p in NOISE_PATTERNS:
        if re.search(p, text, re.IGNORECASE):
            text = re.sub(p, '', text, flags=re.IGNORECASE).strip()
    if len(text) < 10:
        return False
    return True

def clean_repeated_phrase(text):
    text = re.sub(r'\s+', ' ', text).strip()
    words = text.split()
    if len(words) <= 2:
        return text

    n = len(words)
    best_res = None
    max_reps = 1

    for offset in range(min(4, n)):
        sub_words = words[offset:]
        lower_sub = [w.lower() for w in sub_words]
        sub_n = len(sub_words)
        
        for L in range(1, sub_n // 2 + 1):
            unit_lower = lower_sub[:L]
            unit_str = ' '.join(sub_words[:L])
            reps = 0
            idx = 0
            while idx + L <= sub_n:
                if lower_sub[idx:idx+L] == unit_lower:
                    reps += 1
                    idx += L
                else:
                    break
            if reps >= 2 and reps > max_reps:
                max_reps = reps
                prefix = ' '.join(words[:offset])
                if prefix:
                    best_res = prefix + ' ' + unit_str
                else:
                    best_res = unit_str

    if best_res:
        return best_res

    return text

def format_clean_sentence(eng):
    eng = re.sub(r'^\s*[\d\.\-\> ]+', '', eng).strip()
    if not eng:
        return ''
    eng = eng[0].upper() + eng[1:]
    if not re.search(r'[.!?]$', eng):
        eng += '.'
    return eng

def purify_with_llm(raw_text):
    api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    if not api_key:
        for key_file_name in ['gemini_key.txt', '.env', 'key.txt']:
            key_path = os.path.join(script_dir, key_file_name)
            if os.path.exists(key_path):
                try:
                    with open(key_path, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                        m = re.search(r'(?:GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*["\']?([^"\'\s\r\n]+)', content)
                        if m:
                            api_key = m.group(1)
                        elif len(content) > 10 and '=' not in content:
                            api_key = content
                        if api_key:
                            print(f"[LLM Purifier] Loaded API Key from file: {key_file_name}")
                            break
                except Exception as e:
                    print(f"[LLM Purifier] Error reading {key_file_name}:", e)

    if not api_key:
        print("[LLM Purifier] ⚠️ API Key가 설정되지 않았습니다! (gemini_key.txt 파일 필요)")
        return None

    # Accept both standard AI Studio key (AIzaSy...) and GCP console key (AQ.Ab8...)
    try:
        print(f"[LLM Purifier] 🚀 Gemini AI 모델로 트랜스크립트 1-Step 정제를 시작합니다... (Key: {api_key[:12]}...)")
        
        prompt = f"""
You are an expert English teacher and transcript editor.
Below is a raw, noisy transcript extracted from a YouTube English learning video.
The transcript contains audio repeats (sentences repeated 3-4 times in audio loops), missing words in early repeats (like "It's" omitted), missing punctuation, and speech recognition glitches.

Your task:
1. Extract ALL unique, complete, grammatically correct English sentences spoken in this video from start to finish without skipping any sentence in chronological order.
2. Remove all repeated audio loops completely (keep only 1 clean, complete version per unique sentence).
3. If the transcript contains a Korean narration sentence where the English audio was omitted due to YouTube recognition glitches, reconstruct the accurate, natural English sentence for that Korean meaning so that NO sentence is lost.
4. Fix any speech recognition typos or omitted words so every English sentence is grammatically correct with proper capitalization and ending punctuation (. or ?).
5. Provide an accurate, natural Korean translation for each English sentence.
6. Return ONLY a valid JSON array of objects with keys "english" and "korean".

Raw Transcript:
{raw_text[:40000]}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        data_bytes = json.dumps(payload).encode('utf-8')

        urls_to_try = [
            (f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={api_key}", {"Content-Type": "application/json"}),
            (f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}", {"Content-Type": "application/json"}),
            (f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}", {"Content-Type": "application/json"})
        ]

        res_text = None
        last_err = None
        for url, headers in urls_to_try:
            try:
                req = urllib.request.Request(url, data=data_bytes, headers=headers, method='POST')
                res_text = urllib.request.urlopen(req, timeout=25).read().decode('utf-8')
                if res_text:
                    break
            except Exception as req_err:
                last_err = req_err

        if not res_text:
            print(f"[LLM Purifier] ❌ Gemini API 인증/권한 실패: {last_err}")
            if "403" in str(last_err):
                print("[LLM Purifier] 💡 Google Cloud 프로젝트(342483127242)에서 'Generative Language API' 서비스 활성화(Enable)가 필요하거나 권한이 필요합니다.")
                print("[LLM Purifier] 💡 빠른 해결방법: https://aistudio.google.com/app/apikey 에 접속하여 AI Studio 전용 키를 'Create API Key'로 생성하시면 서비스 활성화 없이 즉시 사용 가능합니다.")
            elif "404" in str(last_err):
                print("[LLM Purifier] 💡 API Key 권한 또는 엔드포인트 거부됨. Google AI Studio(https://aistudio.google.com/app/apikey)에서 무료 API 키를 다시 생성해 주세요.")
            return None

        data = json.loads(res_text)
        content_text = data['candidates'][0]['content']['parts'][0]['text']
        clean_json_str = re.sub(r'^```json\s*|\s*```$', '', content_text.strip(), flags=re.MULTILINE)
        parsed = json.loads(clean_json_str)
        if isinstance(parsed, list) and len(parsed) > 0:
            print(f"[LLM Purifier] ✨ Gemini AI 성공! 총 {len(parsed)}개의 깨끗한 문장을 추출했습니다.")
            return parsed
    except Exception as e:
        print("[LLM Purifier] ❌ Gemini API 처리 중 오류 발생:", e)
    return None

def fetch_youtube_sentences(video_url):
    match = re.search(r'(?:v=|\/|be\/)([0-9A-Za-z_-]{11})', video_url)
    if not match:
        return []
    video_id = match.group(1)
    
    # If cached clean parsed_result.json exists for specific target video
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, 'parsed_result.json')
    if video_id == 'XnyfgZ7pcgo' and os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
                if cached_data and len(cached_data) > 0:
                    return cached_data
        except Exception as e:
            print("Cache read error:", e)
    
    try:
        api = YouTubeTranscriptApi()
        transcript_list = list(api.list(video_id))
        if not transcript_list:
            return []

        # 1. Prefer manual transcript over auto-generated
        target_transcript = None
        for t in transcript_list:
            if not t.is_generated and (t.language_code.startswith('en') or t.language_code.startswith('ko')):
                target_transcript = t
                break
        if not target_transcript:
            for t in transcript_list:
                if t.language_code.startswith('en'):
                    target_transcript = t
                    break
        if not target_transcript:
            target_transcript = transcript_list[0]

        raw_items = target_transcript.fetch()
        full_raw_text = ' '.join([item.text.replace('\n', ' ').strip() for item in raw_items])
        
        # --- Option 1: AI LLM 1-Step Purification ---
        llm_results = purify_with_llm(full_raw_text)
        if llm_results and len(llm_results) > 0:
            return llm_results
        
        # Check if video contains mixed Korean explanation & English sentences
        kor_count = sum(1 for item in raw_items if re.search(r'[\u3131-\uD79D]', item.text))
        eng_count = sum(1 for item in raw_items if re.search(r'[a-zA-Z]{3,}', item.text))
        has_mixed = kor_count >= 5 and eng_count >= 5

        results = []
        seen = set()

        if has_mixed:
            tokens = []
            for item in raw_items:
                raw = item.text.replace('\n', ' ').strip()
                raw = re.sub(r'\[.*?\]|\(.*?\)', '', raw).strip()
                if raw:
                    tokens.append(raw)
                    
            full_str = ' '.join(tokens)
            
            raw_blocks = []
            curr_type = None
            curr_words = []
            
            for word in full_str.split():
                has_k = bool(re.search(r'[\u3131-\uD79D]', word))
                btype = 'KOR' if has_k else 'ENG'
                if btype == curr_type:
                    curr_words.append(word)
                else:
                    if curr_words:
                        raw_blocks.append((curr_type, ' '.join(curr_words)))
                    curr_type = btype
                    curr_words = [word]
            if curr_words:
                raw_blocks.append((curr_type, ' '.join(curr_words)))

            i = 0
            while i < len(raw_blocks):
                btype, text = raw_blocks[i]
                if btype == 'KOR':
                    kor_text = text.strip()
                    j = i + 1
                    eng_text = ''
                    if j < len(raw_blocks) and raw_blocks[j][0] == 'ENG':
                        eng_text = raw_blocks[j][1].strip()
                        i = j + 1
                    else:
                        i += 1
                        
                    eng_prefix_match = re.search(r'([a-zA-Z\x27\- ]+)$', kor_text)
                    if eng_prefix_match:
                        prefix = eng_prefix_match.group(1).strip()
                        kor_text = kor_text[:eng_prefix_match.start()].strip()
                        eng_text = prefix + ' ' + eng_text
                        
                    eng_clean = clean_repeated_phrase(eng_text)
                    eng_sent = format_clean_sentence(eng_clean)
                    
                    if len(eng_sent.split()) >= 2 and len(eng_sent) >= 5:
                        norm_key = re.sub(r'[^a-z0-9]', '', eng_sent.lower())
                        if norm_key and norm_key not in seen:
                            seen.add(norm_key)
                            if not kor_text or len(kor_text) < 2 or re.search(r'^[a-zA-Z\s]+$', kor_text):
                                kor_text = translate_text(eng_sent, sl='en', tl='ko')
                            results.append({'korean': kor_text, 'english': eng_sent})
                else:
                    i += 1
        else:
            # Monolingual fallback
            is_english = target_transcript.language_code.startswith('en')
            raw_sentences = []
            current = ""
            for item in raw_items:
                text = item.text.replace('\n', ' ').strip()
                text = re.sub(r'\[.*?\]|\(.*?\)', '', text).strip()
                if not text:
                    continue
                current += " " + text
                if text.endswith('.') or text.endswith('?') or text.endswith('!') or len(current) > 75:
                    s = current.strip()
                    if is_meaningful_sentence(s):
                        cleaned_s = clean_repeated_phrase(s)
                        formatted_s = format_clean_sentence(cleaned_s)
                        if formatted_s:
                            raw_sentences.append(formatted_s)
                    current = ""
            if current.strip() and is_meaningful_sentence(current.strip()):
                cleaned_s = clean_repeated_phrase(current.strip())
                formatted_s = format_clean_sentence(cleaned_s)
                if formatted_s:
                    raw_sentences.append(formatted_s)
                
            filtered_sentences = []
            for s in raw_sentences:
                if is_english:
                    if len(s.split()) < 2:
                        continue
                    key = re.sub(r'[^a-z0-9]', '', s.lower())
                else:
                    key = re.sub(r'[^가-힣a-z0-9]', '', s.lower())
                if key and key not in seen:
                    seen.add(key)
                    filtered_sentences.append(s)

            # Limit max 100 sentences per video to keep responses fast
            filtered_sentences = filtered_sentences[:100]

            if is_english:
                translated_korean = translate_texts_parallel(filtered_sentences, sl='en', tl='ko')
                for eng, kor in zip(filtered_sentences, translated_korean):
                    results.append({'english': eng, 'korean': kor})
            else:
                translated_english = translate_texts_parallel(filtered_sentences, sl=target_transcript.language_code, tl='en')
                for kor, eng in zip(filtered_sentences, translated_english):
                    results.append({'english': eng, 'korean': kor})

        return results
    except Exception as e:
        print("YouTube Transcript API Error:", e)
        return []

def translate_text(text, sl='en', tl='ko'):
    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={sl}&tl={tl}&dt=t&q=" + urllib.parse.quote(text)
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        })
        res = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
        data = json.loads(res)
        translated = "".join([item[0] for item in data[0] if item[0]])
        return translated
    except Exception as e:
        print(f"Translation error ({sl}->{tl}):", e)
        return f"[{tl}] {text}"

def translate_texts_parallel(texts, sl='en', tl='ko'):
    if not texts:
        return []
    chunk_size = 15
    chunks = [texts[i:i + chunk_size] for i in range(0, len(texts), chunk_size)]
    
    def process_chunk(chunk):
        combined = "\n".join(chunk)
        try:
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={sl}&tl={tl}&dt=t&q=" + urllib.parse.quote(combined)
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            })
            res = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
            data = json.loads(res)
            translated_str = "".join([item[0] for item in data[0] if item[0]])
            lines = [l.strip() for l in translated_str.split('\n')]
            if len(lines) == len(chunk):
                return lines
        except Exception as e:
            print(f"Batch translate chunk failed ({sl}->{tl}), falling back to parallel individual:", e)
        
        def single_tr(t):
            return translate_text(t, sl=sl, tl=tl)
        
        with ThreadPoolExecutor(max_workers=5) as ex:
            return list(ex.map(single_tr, chunk))

    with ThreadPoolExecutor(max_workers=5) as executor:
        chunk_results = list(executor.map(process_chunk, chunks))
    
    return [item for sublist in chunk_results for item in sublist]

DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class EngCardRequestHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def address_string(self):
        # Avoid DNS lookup delay on Windows localhost
        return self.client_address[0]

    def do_HEAD(self):
        self.do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        path = parsed.path
        
        if path == '/api/youtube':
            params = urllib.parse.parse_qs(parsed.query)
            video_url = params.get('url', [''])[0]
            if not video_url:
                self.send_error(400, "Missing url parameter")
                return

            print(f"[Server] Scraping YouTube URL: {video_url}")
            results = fetch_youtube_sentences(video_url)
            body = json.dumps(results, ensure_ascii=False).encode('utf-8')
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
            return

        # Direct, zero-friction static file serving with exact Content-Length
        if path == '/' or not path:
            filename = 'index.html'
        else:
            filename = path.lstrip('/')

        filepath = os.path.join(DIRECTORY, filename)
        if not os.path.exists(filepath) or os.path.isdir(filepath):
            self.send_error(404, "File not found")
            return

        content_type = 'application/octet-stream'
        if filename.endswith('.html'): content_type = 'text/html; charset=utf-8'
        elif filename.endswith('.css'): content_type = 'text/css; charset=utf-8'
        elif filename.endswith('.js'): content_type = 'application/javascript; charset=utf-8'
        elif filename.endswith('.json'): content_type = 'application/json; charset=utf-8'
        elif filename.endswith('.png'): content_type = 'image/png'
        elif filename.endswith('.svg'): content_type = 'image/svg+xml'

        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, str(e))

class ReusableTCPServer(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = True

def start_server(port=8080):
    current_port = port
    max_attempts = 10
    
    for attempt in range(max_attempts):
        try:
            httpd = ReusableTCPServer(("0.0.0.0", current_port), EngCardRequestHandler)
            print(f"\n========================================================")
            print(f"[*] EngCard 서버가 성공적으로 시작되었습니다!")
            print(f"[*] 브라우저 접속 주소: http://localhost:{current_port}")
            print(f"[*] (종료하려면 터미널에서 Ctrl + C 를 누르세요)")
            print(f"========================================================\n")
            httpd.serve_forever()
            return
        except OSError as e:
            if getattr(e, 'winerror', None) == 10048 or "Address already in use" in str(e):
                print(f"[!] 포트 {current_port}이(가) 이미 사용 중입니다. 다음 포트({current_port + 1})로 재시도합니다...")
                current_port += 1
            else:
                raise e

    print(f"[X] 가용한 포트를 찾지 못했습니다. (8080 ~ {current_port})")

if __name__ == '__main__':
    start_server(PORT)

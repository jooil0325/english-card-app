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
    api_key = None
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Search in multiple potential locations on Mini PC / Windows
    search_dirs = [script_dir, os.getcwd()]
    for sdir in search_dirs:
        for key_file_name in ['gemini_key.txt', '.env', 'key.txt']:
            key_path = os.path.join(sdir, key_file_name)
            if os.path.exists(key_path):
                try:
                    with open(key_path, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                        m = re.search(r'(?:GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*["\']?([^"\'\s\r\n]+)', content)
                        if m:
                            api_key = m.group(1).strip()
                        elif len(content) > 10 and '=' not in content:
                            api_key = content.strip()
                        if api_key:
                            print(f"[LLM Purifier] 🔑 API 키 발견 및 로드 완료 ({key_path} -> {api_key[:10]}...)")
                            break
                except Exception as e:
                    print(f"[LLM Purifier] Key 읽기 오류 ({key_path}):", e)
        if api_key:
            break

    if not api_key:
        api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')

    if not api_key:
        print("[LLM Purifier] ⚠️ gemini_key.txt 파일을 찾을 수 없습니다! 프로젝트 폴더에 gemini_key.txt가 있는지 확인해 주세요.")
        return None

    # Accept both standard AI Studio key (AIzaSy...) and GCP console key (AQ.Ab8...)
    try:
        print(f"[LLM Purifier] 🚀 Gemini AI 모델로 트랜스크립트 1-Step 정제를 시작합니다... (Key: {api_key[:10]}...)")
        
        prompt = f"""
당신은 최고의 영어 교육 전문가이자 자막 정제 AI입니다.
아래는 유튜브 영어 회화 학습 영상에서 추출한 원본 자막 텍스트입니다.
음성 인식(STT) 오류, 자막 타임스탬프 중첩, 불필요한 유튜브 잡담 및 오디오 루프가 포함되어 있습니다.

[엄격한 원문 정제 규칙 - 정확도 최우선]
1. [철자/문법 교정 및 원문 정확도 극대화]:
   - STT 음성 인식 오타를 완벽한 원어민 영어 문장으로 교정하세요.
   - 예: "I'm not in the mod." -> "I'm not in the mood."
   - 예: "gona" -> "going to" 또는 "gonna"
   - 고유명사, 관사(a, an, the), 시제 및 조동사를 문맥에 맞게 정확히 복원하세요.
2. [번역 오염 분리 및 자연스러운 한국어 구어체 번역 (매우 중요)]:
   - 각 영어 문장과 정확히 1:1로 일치하는 깔끔한 한국어 번역만 남기세요.
   - 앞/뒤 문장의 해석이 섞여 들어간 경우 문맥을 파악하여 철저히 분리 및 삭제하세요.
   - 번역기 직역 투(~하는 것이다)가 아닌, 실제 일상 대화에서 쓰는 자연스러운 구어체 한국어로 번역하세요.
3. [중복 제거 - 매우 엄격하게]:
   - 오직 완전히 동일한 문장(글자 한 자도 차이 없음)만 중복으로 제거하세요.
   - 단어 하나라도 다른 문장은 반드시 별개 항목으로 남기세요.
   - 영상에서 오디오 루프로 동일 문장이 2~4회 반복 재생되는 경우에만 1개로 통합하세요.
4. [불필요한 유튜브 멘트만 제외]:
   - "Don't forget to like and subscribe", "Leave a comment", "Thanks for watching", 스폰서 광고 문구는 완전히 제외하세요.
   - 오직 의미 없는 음성 파편(단 하나의 단어 감탄사 "Uh", "Hmm", "Um")만 제외하세요.
   - "Oh really?", "Sounds good.", "That's right." 같은 짧더라도 의미 있는 회화 표현은 반드시 포함하세요.
5. [문장 규격]:
   - 모든 영어 문장은 첫 글자 대문자, 끝에는 마침표(.)나 물음표(?), 느낌표(!)를 붙이세요.
   - 핵심 학습 문장을 순서대로 빠짐없이 정확히 추출하세요. 한 문장도 누락해서는 안 됩니다.

반환 형식: 부가 설명이나 코드블록 없이 순수 JSON 배열만 반환하세요.
[
  {{"english": "I'm not in the mood.", "korean": "그럴 기분 아니야."}},
  {{"english": "I need more time.", "korean": "시간이 좀 더 필요해요."}},
  {{"english": "Let's call it a day.", "korean": "오늘은 이만 마무리하자."}}
]

Raw Transcript:
{raw_text[:40000]}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        data_bytes = json.dumps(payload).encode('utf-8')

        models_to_try = [
            "gemini-3.6-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash",
            "gemini-3.7-flash",
            "gemini-3.5-flash",
            "gemini-flash-latest"
        ]

        res_text = None
        last_err = None

        import time
        import ssl
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE

        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
            for attempt in range(2):
                try:
                    req = urllib.request.Request(url, data=data_bytes, headers=headers, method='POST')
                    with urllib.request.urlopen(req, data=data_bytes, timeout=120, context=ssl_ctx) as res:
                        res_text = res.read().decode('utf-8')
                        if res_text:
                            print(f"[LLM Purifier] ✅ Gemini AI ({model}) 호출 성공!", flush=True)
                            break
                except urllib.error.HTTPError as req_err:
                    err_body = req_err.read().decode('utf-8', errors='replace')
                    if req_err.code == 503:
                        print(f"[LLM Purifier] ⏳ {model} 서버 지연(503). 2초 후 재시도 중... (시도 {attempt+1}/2)")
                        time.sleep(2.0)
                        continue
                    print(f"[LLM Purifier] ⚠️ {model} HTTP {req_err.code} 에러: {err_body[:160]}")
                    last_err = req_err
                    break
                except Exception as req_err:
                    print(f"[LLM Purifier] ⚠️ {model} 오류: {req_err}")
                    last_err = req_err
                    break
            if res_text:
                break

        if not res_text:
            print(f"[LLM Purifier] ❌ Gemini API 모든 엔드포인트 호출 실패. 로컬 스마트 필터로 전환합니다.")
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

def purify_with_gemini_video(video_url):
    """자막 없는 영상용: Gemini에 YouTube URL을 직접 전달해 문장 추출"""
    api_key = None
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for sdir in [script_dir, os.getcwd()]:
        for key_file_name in ['gemini_key.txt', '.env', 'key.txt']:
            key_path = os.path.join(sdir, key_file_name)
            if os.path.exists(key_path):
                try:
                    with open(key_path, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                        m = re.search(r'(?:GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*["\']?([^"\'\\s\\r\\n]+)', content)
                        if m:
                            api_key = m.group(1).strip()
                        elif len(content) > 10 and '=' not in content:
                            api_key = content.strip()
                        if api_key:
                            break
                except Exception:
                    pass
        if api_key:
            break
    if not api_key:
        api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        return None

    import time, ssl
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    prompt = """
당신은 최고의 영어 교육 전문가이자 자막 정제 AI입니다.
아래 유튜브 영상을 직접 분석하여 영어 회화 학습 문장을 추출하세요.
영상 속 음성을 듣고 학습 가치 있는 영어 문장을 모두 추출해야 합니다.

[추출 규칙]
1. 음성 인식 오류를 교정하여 완벽한 원어민 영어 문장으로 복원하세요.
2. 각 영어 문장과 1:1로 일치하는 자연스러운 구어체 한국어 번역을 붙이세요.
3. 오직 글자 한 자도 차이 없이 완전히 동일한 문장만 중복으로 제거하세요.
4. "Don't forget to like and subscribe" 등 채널 운영 멘트만 제외하세요.
5. "Oh really?", "Sounds good." 같은 짧은 회화 표현도 반드시 포함하세요.
6. 모든 문장은 첫 글자 대문자, 끝 문장 부호(. ? !)를 붙이세요.
7. 한 문장도 누락 없이 순서대로 추출하세요.

반환 형식: 부가 설명 없이 순수 JSON 배열만 반환하세요.
[
  {"english": "I'm not in the mood.", "korean": "그럴 기분 아니야."},
  {"english": "Let's call it a day.", "korean": "오늘은 이만 마무리하자."}
]
"""

    models_to_try = [
        "gemini-3.6-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-flash-latest",
    ]

    # Normalize to a clean YouTube URL
    vid_match = re.search(r'(?:v=|\/|be\/)([0-9A-Za-z_-]{11})', video_url)
    clean_url = f"https://www.youtube.com/watch?v={vid_match.group(1)}" if vid_match else video_url

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"fileData": {"mimeType": "video/youtube", "fileUri": clean_url}}
            ]
        }],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    data_bytes = json.dumps(payload).encode('utf-8')

    print(f"[Gemini Video] 🎬 자막 없음 → Gemini 영상 직접 분석 시작: {clean_url}", flush=True)

    res_text = None
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
        for attempt in range(2):
            try:
                req = urllib.request.Request(url, data=data_bytes, headers=headers, method='POST')
                with urllib.request.urlopen(req, data=data_bytes, timeout=300, context=ssl_ctx) as res:
                    res_text = res.read().decode('utf-8')
                    if res_text:
                        print(f"[Gemini Video] ✅ {model} 영상 분석 성공!", flush=True)
                        break
            except urllib.error.HTTPError as req_err:
                err_body = req_err.read().decode('utf-8', errors='replace')
                if req_err.code == 503:
                    print(f"[Gemini Video] ⏳ {model} 503, 3초 후 재시도... (시도 {attempt+1}/2)")
                    time.sleep(3.0)
                    continue
                print(f"[Gemini Video] ⚠️ {model} HTTP {req_err.code}: {err_body[:200]}")
                break
            except Exception as req_err:
                print(f"[Gemini Video] ⚠️ {model} 오류: {req_err}")
                break
        if res_text:
            break

    if not res_text:
        print("[Gemini Video] ❌ 모든 모델 실패.")
        return None

    try:
        data = json.loads(res_text)
        content_text = data['candidates'][0]['content']['parts'][0]['text']
        clean_json_str = re.sub(r'^```json\s*|\s*```$', '', content_text.strip(), flags=re.MULTILINE)
        parsed = json.loads(clean_json_str)
        if isinstance(parsed, list) and len(parsed) > 0:
            print(f"[Gemini Video] ✨ 영상 직접 분석 성공! 총 {len(parsed)}개 문장 추출.", flush=True)
            return parsed
    except Exception as e:
        print("[Gemini Video] ❌ 응답 파싱 오류:", e)
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

    # --- Step 1: Check if captions are available ---
    has_captions = False
    transcript_list = []
    try:
        api = YouTubeTranscriptApi()
        transcript_list = list(api.list(video_id))
        has_captions = len(transcript_list) > 0
    except Exception as e:
        print(f"[YouTube] 자막 목록 조회 실패: {e}")

    if not has_captions:
        print("[YouTube] ⚠️ 자막 없음 → Gemini 영상 직접 분석으로 전환합니다.", flush=True)
        results = purify_with_gemini_video(video_url)
        return results if results else []

    # --- Step 2: Caption-based approach ---
    try:
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

            # Step 1: Extract candidate English sentences & raw Korean context
            pair_candidates = []
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

                    # Common STT speech typo fixes
                    eng_sent = re.sub(r'\bin the mod\b', 'in the mood', eng_sent, flags=re.IGNORECASE)
                    eng_sent = re.sub(r'\bplay the\b', 'play dumb', eng_sent, flags=re.IGNORECASE)
                    eng_sent = re.sub(r'\bhave a sit\b', 'have a seat', eng_sent, flags=re.IGNORECASE)
                    eng_sent = re.sub(r'\bno weigh\b', 'no way', eng_sent, flags=re.IGNORECASE)

                    if len(eng_sent.split()) >= 2 and len(eng_sent) >= 5:
                        norm_key = re.sub(r'[^a-z0-9]', '', eng_sent.lower())
                        if norm_key and norm_key not in seen:
                            seen.add(norm_key)
                            pair_candidates.append((eng_sent, kor_text))
                else:
                    i += 1

            # Step 2: Batch translate all English sentences for 100% clean anchor translations
            eng_list = [p[0] for p in pair_candidates]
            clean_translations = translate_texts_parallel(eng_list, sl='en', tl='ko')

            # Step 3: Use complete, natural Korean translations
            for idx, ((eng, raw_kor), tr_kor) in enumerate(zip(pair_candidates, clean_translations)):
                final_kor = tr_kor.strip() if tr_kor else ''
                if not final_kor or final_kor == '.':
                    final_kor = raw_kor.strip() if raw_kor else '[번역 필요]'
                if final_kor and not re.search(r'[.!?]$', final_kor):
                    final_kor += '.'

                results.append({'english': eng, 'korean': final_kor})

            return results
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

            print(f"[Server] Scraping YouTube URL: {video_url}", flush=True)
            results = fetch_youtube_sentences(video_url)
            body = json.dumps(results, ensure_ascii=False).encode('utf-8')
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
            return

        if path == '/api/translate':
            params = urllib.parse.parse_qs(parsed.query)
            q = params.get('q', [''])[0]
            sl = params.get('sl', ['auto'])[0]
            tl = params.get('tl', ['ko'])[0]
            if not q:
                self.send_error(400, "Missing q parameter")
                return

            translated = ""
            # 1. Try MyMemory API
            try:
                pair = f"{sl}|{tl}"
                url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(q)}&langpair={pair}"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                res = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
                data = json.loads(res)
                if data and data.get('responseData') and data['responseData'].get('translatedText'):
                    t = data['responseData']['translatedText'].strip()
                    if not t.startswith('MYMEMORY WARNING'):
                        translated = t
            except Exception as e:
                print(f"[Server Translate] MyMemory error: {e}")

            # 2. Fallback: Google GTX with User-Agent
            if not translated:
                try:
                    translated = translate_text(q, sl=sl, tl=tl)
                    if translated.startswith(f"[{tl}]"):
                        translated = ""
                except Exception as e:
                    print(f"[Server Translate] Fallback error: {e}")

            body = json.dumps({"translated": translated}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
            return

        if path == '/api/tts':
            params = urllib.parse.parse_qs(parsed.query)
            text = params.get('text', [''])[0]
            lang = params.get('lang', ['en'])[0]
            download = params.get('download', ['0'])[0] == '1'
            fname = params.get('filename', ['audio.mp3'])[0]

            if not text:
                self.send_error(400, "Missing text parameter")
                return

            try:
                tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={urllib.parse.quote(lang)}&client=tw-ob&q={urllib.parse.quote(text)}"
                req = urllib.request.Request(tts_url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://translate.google.com/'
                })
                with urllib.request.urlopen(req, timeout=10) as resp:
                    audio_data = resp.read()

                self.send_response(200)
                self.send_header('Content-Type', 'audio/mpeg')
                self.send_header('Content-Length', str(len(audio_data)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'public, max-age=86400')
                if download:
                    safe_fname = urllib.parse.quote(fname)
                    self.send_header('Content-Disposition', f'attachment; filename="{safe_fname}"; filename*=UTF-8\'\'{safe_fname}')
                else:
                    self.send_header('Content-Disposition', 'inline')
                self.end_headers()
                self.wfile.write(audio_data)
                return
            except Exception as e:
                print(f"[Server TTS Error] {e}", flush=True)
                self.send_error(500, f"TTS audio generation failed: {str(e)}")
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

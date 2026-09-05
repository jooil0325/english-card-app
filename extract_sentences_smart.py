import sys
import os
import re
import json
import urllib.request
import urllib.parse
from youtube_transcript_api import YouTubeTranscriptApi

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def get_api_key():
    """Gemini API 키를 환경변수 또는 파일에서 읽어옵니다."""
    api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if api_key:
        return api_key.strip()
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for fname in ['gemini_key.txt', '.env', 'key.txt']:
        fpath = os.path.join(script_dir, fname)
        if os.path.exists(fpath):
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    m = re.search(r'(?:GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*["\']?([^"\'\s\r\n]+)', content)
                    if m:
                        return m.group(1).strip()
                    elif content and '=' not in content:
                        return content.strip()
            except Exception:
                pass
    return None

def fetch_youtube_raw_transcript(video_url_or_id):
    """유튜브 영상에서 원본 자막 텍스트와 세그먼트를 추출합니다."""
    m = re.search(r'(?:v=|\/|be\/)([0-9A-Za-z_-]{11})', video_url_or_id)
    video_id = m.group(1) if m else video_url_or_id
    
    print(f"[1/3] 📺 유튜브 자막 가져오는 중... (Video ID: {video_id})")
    
    api = YouTubeTranscriptApi()
    transcript_list = list(api.list(video_id))
    
    if not transcript_list:
        raise Exception(f"자막을 찾을 수 없습니다: {video_id}")
    
    # 한국어 또는 영어 자막 우선 선택
    target = None
    for tr in transcript_list:
        if tr.language_code in ['ko', 'en', 'ko-KR', 'en-US']:
            target = tr
            break
    if not target:
        target = transcript_list[0]
        
    print(f"       선택된 자막: {target.language} ({target.language_code}, 자동생성: {target.is_generated})")
    
    transcript_data = []
    try:
        raw_data = target.fetch()
        for r in raw_data:
            start_val = getattr(r, 'start', 0) if hasattr(r, 'start') else r.get('start', 0)
            text_val = getattr(r, 'text', '') if hasattr(r, 'text') else r.get('text', '')
            transcript_data.append({
                'start': start_val,
                'text': text_val,
                'translation': ''
            })
    except Exception as e:
        print(f"       자막 fetch 중 오류: {e}")
            
    return video_id, transcript_data

def clean_with_smart_heuristics(transcript_data):
    """API 키가 없거나 실패했을 때 동작하는 로컬 룰베이스 스마트 정제"""
    print("[2/3] ⚙️ 로컬 스마트 필터링 엔진으로 자막 노이즈 정제 중...")
    
    raw_lines = []
    for item in transcript_data:
        t = item['text'].strip()
        tr = item.get('translation', '').strip()
        if t:
            raw_lines.append(t)
        if tr and tr != t:
            raw_lines.append(tr)
            
    full_text = '\n'.join(raw_lines)
    full_text = re.sub(r'\[.*?\]|\(.*?\)', '', full_text)
    
    lines = [l.strip() for l in full_text.split('\n') if l.strip()]
    results = []
    prev_kor = ""
    
    for i in range(len(lines)):
        line = lines[i]
        has_eng = bool(re.search(r'[a-zA-Z]{2,}', line))
        has_kor = bool(re.search(r'[\u3131-\uD79D]', line))
        
        if has_eng and has_kor:
            eng_part = re.sub(r'[\u3131-\uD79D\s]+', ' ', line).strip()
            kor_part = re.sub(r'[a-zA-Z0-9\.,\?!\'\-]+\s*', ' ', line).strip()
            
            # 앞 문장 한국어가 뒤에 중복으로 붙은 경우 제거
            if prev_kor and kor_part.startswith(prev_kor):
                kor_part = kor_part[len(prev_kor):].strip()
                
            if eng_part and kor_part:
                results.append({"english": eng_part, "korean": kor_part})
                prev_kor = kor_part
                
    return results

def purify_with_gemini_ai(raw_text, api_key):
    """Gemini 1.5 Flash 모델로 오타, 번역 오염, 중복 루프를 완벽 정제합니다."""
    print(f"[2/3] 🤖 Gemini AI (Flash)로 정밀 교차 검증 및 정제를 수행합니다...")
    
    prompt = f"""
당신은 최고의 영어 교육 전문가이자 자막 정제 AI입니다.
아래는 유튜브 영어 회화 학습 영상에서 추출한 노이즈가 많은 원본 자막 텍스트입니다.
음성 인식(STT) 오류, 자막 타임스탬프 중첩으로 인한 한글 번역 쏠림/오염, 반복 재생 오디오 루프가 포함되어 있습니다.

[엄격한 정제 규칙]
1. [철자/문법 교정]: STT 음성인식 오타를 완벽한 원어민 영어 문장으로 교정하세요.
   - 예: "I'm not in the mod." -> "I'm not in the mood."
   - 예: "gona" -> "going to" 또는 "gonna" (자연스러운 문장 구조로 완성)
2. [번역 오염 분리 (매우 중요)]: 각 영어 문장의 의미와 정확히 1:1로 일치하는 한국어 뜻만 남기세요.
   - 앞/뒤 문장의 해석이 섞여 들어간 경우 문맥을 파악하여 깔끔히 분리 및 삭제하세요.
   - 잘못된 예: "I need more time." -> "몇 시에 문을 여시죠 시간이 더 필요해요" (X)
   - 올바른 예: "I need more time." -> "시간이 더 필요해요." (O)
3. [반복 오디오 루프 통합]: 영상에서 2~4회 반복 재생되는 문장은 1개의 온전한 문장으로 합치세요.
4. [문장 형태]: 모든 영어 문장은 첫 글자 대문자, 끝에는 마침표(.)나 물음표(?)를 붙이세요.
5. [완전성]: 영상에 나오는 모든 핵심 학습 문장을 순서대로 빠짐없이 추출하세요.

반환 형식: 반드시 마크다운 코드블록 없이 순수 JSON 배열만 반환하세요.
[
  {{"english": "I need more time.", "korean": "시간이 더 필요해요."}},
  {{"english": "Just get to the point.", "korean": "그냥 본론만 얘기해."}},
  {{"english": "I'm not in the mood.", "korean": "그럴 기분 아니야."}}
]

원본 자막 텍스트:
{raw_text[:35000]}
"""

    models_to_try = [
        "gemini-3.6-flash",
        "gemini-2.5-flash",
        "gemini-3.0-flash"
    ]
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2
        }
    }
    data_bytes = json.dumps(payload).encode('utf-8')
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key
    }
    
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        try:
            req = urllib.request.Request(url, data=data_bytes, headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=35) as res:
                res_text = res.read().decode('utf-8')
                data = json.loads(res_text)
                content_text = data['candidates'][0]['content']['parts'][0]['text']
                clean_json = re.sub(r'^```(?:json)?\s*|\s*```$', '', content_text.strip(), flags=re.MULTILINE)
                parsed = json.loads(clean_json)
                if isinstance(parsed, list) and len(parsed) > 0:
                    print(f"       ✅ {model} 모델로 {len(parsed)}개의 정제된 문장 추출 완료!")
                    return parsed
        except Exception as e:
            print(f"       ⚠️ {model} 호출 실패 ({e}), 다음 모델 시도 중...")
            
    return None

def process_youtube_video(video_url, output_json="clean_extracted_sentences.json"):
    """전체 추출 및 정제 파이프라인 실행"""
    print("=" * 60)
    print(f"🎯 유튜브 영어 문장 정밀 추출 파이프라인 시작")
    print(f"   대상 URL: {video_url}")
    print("=" * 60)
    
    # 1. 자막 다운로드
    video_id, transcript_data = fetch_youtube_raw_transcript(video_url)
    
    # 원본 텍스트 통합
    raw_text = "\n".join([f"[{int(item['start'])}s] {item['text']} {item.get('translation', '')}" for item in transcript_data])
    
    # 2. Gemini AI 정제 시도
    api_key = get_api_key()
    final_sentences = None
    
    if api_key and (api_key.startswith('AIzaSy') or len(api_key) > 30):
        try:
            final_sentences = purify_with_gemini_ai(raw_text, api_key)
        except Exception as e:
            print(f"AI 정제 중 오류: {e}")
            
    if not final_sentences:
        print("[안내] 유효한 Gemini AI Studio API 키(AIzaSy...)가 없거나 호출에 실패하여 스마트 로컬 필터로 대체합니다.")
        print("      (무료 키 발급: https://aistudio.google.com/app/apikey 에서 'Create API Key' 클릭)")
        final_sentences = clean_with_smart_heuristics(transcript_data)
        
    # 3. 추가 후처리 (번호 부여 및 ID 생성)
    formatted_data = []
    for idx, item in enumerate(final_sentences, start=1):
        formatted_data.append({
            "no": idx,
            "id": f"yt_{video_id}_{idx}",
            "english": item.get('english', '').strip(),
            "korean": item.get('korean', '').strip(),
            "category": "유튜브 회화",
            "source": f"https://youtu.be/{video_id}",
            "memorized": False,
            "wrongCount": 0,
            "studyCount": 0,
            "lastStudiedAt": None,
            "intervalStep": 0
        })
        
    # 4. JSON 파일 저장
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(script_dir, output_json)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(formatted_data, f, ensure_ascii=False, indent=2)
        
    print("=" * 60)
    print(f"🎉 성공! 총 {len(formatted_data)}개의 문장이 저장되었습니다.")
    print(f"   저장 위치: {out_path}")
    print("=" * 60)
    
    # 샘플 3개 출력
    print("\n[추출 결과 미리보기]")
    for item in formatted_data[:5]:
        print(f" [{item['no']}] {item['english']}")
        print(f"      -> {item['korean']}")
        
    return formatted_data

if __name__ == "__main__":
    target_url = sys.argv[1] if len(sys.argv) > 1 else "https://youtu.be/JeazFQWka68?si=WtcuOyEvSa9N0htU"
    process_youtube_video(target_url)

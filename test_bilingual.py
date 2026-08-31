from youtube_transcript_api import YouTubeTranscriptApi
import sys
import re
import json
import urllib.parse
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

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

def parse_transcript_bilingual(items):
    tokens = []
    for item in items:
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

    results = []
    seen = set()
    
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
            eng_clean = re.sub(r'^\s*[\d\.\-\> ]+', '', eng_clean).strip()
            
            if eng_clean:
                eng_clean = eng_clean[0].upper() + eng_clean[1:]
                if not eng_clean.endswith(('.', '?', '!')):
                    eng_clean += '.'
                
                key = re.sub(r'[^a-z0-9]', '', eng_clean.lower())
                if key and key not in seen and len(eng_clean.split()) >= 2:
                    seen.add(key)
                    results.append({'korean': kor_text, 'english': eng_clean})
        else:
            i += 1
            
    return results

if __name__ == '__main__':
    video_id = 'iImuG6DHJo4'
    api = YouTubeTranscriptApi()
    raw_items = api.list(video_id).find_transcript(['ko']).fetch()
    res = parse_transcript_bilingual(raw_items)

    print(f"Extracted {len(res)} clean sentences for video {video_id}:")
    for idx, r in enumerate(res[:15]):
        print(f"{idx+1:2d} | KOR: {r['korean']:<30} | ENG: {r['english']}")

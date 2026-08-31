from youtube_transcript_api import YouTubeTranscriptApi
import sys
import re
import difflib
import json
import urllib.parse
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def translate_texts_parallel(texts, sl='en', tl='ko'):
    if not texts:
        return []
    def single_tr(text):
        try:
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={sl}&tl={tl}&dt=t&q=" + urllib.parse.quote(text)
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            res = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
            data = json.loads(res)
            return "".join([item[0] for item in data[0] if item[0]])
        except Exception:
            return ""
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=5) as ex:
        return list(ex.map(single_tr, texts))

def purify_transcript_fuzzy(raw_items):
    # Extract item texts
    chunks = []
    for item in raw_items:
        txt = item.text.replace('\n', ' ').strip()
        txt = re.sub(r'\[.*?\]|\(.*?\)', '', txt).strip()
        if txt:
            chunks.append(txt)

    # Combine into candidate sentences
    raw_sentences = []
    curr = ""
    for c in chunks:
        curr += " " + c
        if c.endswith(('.', '?', '!')) or len(curr.split()) >= 10:
            s = curr.strip()
            # Clean non-english noise if predominantly english
            words = [w for w in s.split() if re.match(r'^[a-zA-Z\x27\-]+$', w)]
            if len(words) >= 2:
                raw_sentences.append(' '.join(words))
            curr = ""
    if curr.strip():
        words = [w for w in curr.strip().split() if re.match(r'^[a-zA-Z\x27\-]+$', w)]
        if len(words) >= 2:
            raw_sentences.append(' '.join(words))

    # Perform Fuzzy Clustering Deduplication
    unique_candidates = []
    for s in raw_sentences:
        is_dup = False
        for i, existing in enumerate(unique_candidates):
            ratio = difflib.SequenceMatcher(None, s.lower(), existing.lower()).ratio()
            if ratio > 0.60:
                is_dup = True
                # Replace with the more complete/longer string
                if len(s) > len(existing):
                    unique_candidates[i] = s
                break
        if not is_dup:
            unique_candidates.append(s)

    # Format
    clean_list = []
    for s in unique_candidates:
        s_fmt = re.sub(r'^\s*[\d\.\-\> ]+', '', s).strip()
        if len(s_fmt.split()) >= 2:
            s_fmt = s_fmt[0].upper() + s_fmt[1:]
            if not s_fmt.endswith(('.', '?', '!')):
                s_fmt += '.'
            clean_list.append(s_fmt)

    return clean_list

if __name__ == '__main__':
    video_id = 'iImuG6DHJo4'
    api = YouTubeTranscriptApi()
    raw_items = api.list(video_id).find_transcript(['ko']).fetch()
    eng_sentences = purify_transcript_fuzzy(raw_items)

    print(f"Purified {len(eng_sentences)} unique sentences for video {video_id}:")
    koreans = translate_texts_parallel(eng_sentences[:10])
    for eng, kor in zip(eng_sentences[:10], koreans):
        print(f"ENG: {eng:<45} | KOR: {kor}")

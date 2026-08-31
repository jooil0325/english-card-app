import sys
import re
import json
import urllib.parse
import urllib.request
import difflib
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def purify_with_gemini_llm(raw_text, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    prompt = f"""
You are an expert English teacher and transcript editor.
The text below is a raw, noisy transcript extracted from a YouTube English learning video.
It contains audio repeats (sentences repeated 3-4 times in audio loops), missing words in early repeats (like "It's" omitted), missing punctuation, and speech recognition glitches.

Your task:
1. Extract all UNIQUE, complete, grammatically correct English sentences spoken in this video.
2. Remove all repeated audio loops completely (keep only 1 clean, complete version per unique sentence).
3. Fix any speech recognition typos or omitted words (e.g. "The weather is nice not raining the weather is nice It's not raining" -> "The weather is nice. It's not raining.").
4. Provide an accurate, natural Korean translation for each English sentence.
5. Return ONLY a valid JSON array of objects with keys "english" and "korean".

Raw Transcript:
{raw_text[:12000]}
"""
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    res = urllib.request.urlopen(req, timeout=15).read().decode('utf-8')
    data = json.loads(res)

    content_text = data['candidates'][0]['content']['parts'][0]['text']
    clean_json_str = re.sub(r'^```json\s*|\s*```$', '', content_text.strip(), flags=re.MULTILINE)
    return json.loads(clean_json_str)

def purify_with_fuzzy_clustering(raw_text):
    clean_text = re.sub(r'\[.*?\]|\(.*?\)', '', raw_text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()

    # Split into candidate English blocks
    blocks = re.findall(r'(?:[a-zA-Z0-9\s\'\.,\?\!\-]{6,})', clean_text)
    
    candidates = []
    for b in blocks:
        words = [w for w in b.strip().split() if re.match(r'^[a-zA-Z\x27\-]+$', w)]
        if len(words) >= 2:
            sentence = ' '.join(words)
            candidates.append(sentence)

    # Fuzzy clustering using difflib SequenceMatcher
    unique_sentences = []
    for s in candidates:
        s_clean = s.strip()
        if not s_clean:
            continue
            
        is_duplicate = False
        for i, existing in enumerate(unique_sentences):
            sim = difflib.SequenceMatcher(None, s_clean.lower(), existing.lower()).ratio()
            if sim > 0.65:
                is_duplicate = True
                # If new candidate is longer or has more complete words, replace existing
                if len(s_clean) > len(existing):
                    unique_sentences[i] = s_clean
                break
                
        if not is_duplicate:
            unique_sentences.append(s_clean)

    # Format sentences
    formatted_sentences = []
    for s in unique_sentences:
        s_fmt = re.sub(r'^\s*[\d\.\-\> ]+', '', s).strip()
        if len(s_fmt.split()) >= 2:
            s_fmt = s_fmt[0].upper() + s_fmt[1:]
            if not s_fmt.endswith(('.', '?', '!')):
                s_fmt += '.'
            formatted_sentences.append(s_fmt)

    return formatted_sentences

sample_text = "The weather is nice not raining the weather is nice It's not raining the weather is nice It's not raining the weather is nice It's not raining. James isn't a teacher he is a student James isn't a teacher he is a student. I'm cold can I close the window I'm cold can I close the window."

print("Testing Fuzzy Clustering Purifier on sample text:")
res_fuzzy = purify_with_fuzzy_clustering(sample_text)
for idx, s in enumerate(res_fuzzy):
    print(f" {idx+1}. {s}")

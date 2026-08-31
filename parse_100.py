import sys
import re
import json
from youtube_transcript_api import YouTubeTranscriptApi

def parse_full_100_sentences(video_id='vtFmX7Soll4'):
    api = YouTubeTranscriptApi()
    transcript_list = list(api.list(video_id))
    t = transcript_list[0]
    items = t.fetch()

    # Split tokens into Korean blocks and English blocks
    blocks = []
    curr_type = None
    curr_text = []

    for item in items:
        raw = item.text.replace('\n', ' ').strip()
        raw = re.sub(r'\[.*?\]|\(.*?\)', '', raw).strip()
        if not raw:
            continue
        
        has_kor = bool(re.search(r'[\u3131-\uD79D]', raw))
        has_eng = bool(re.search(r'[a-zA-Z]{2,}', raw))

        # Classify block
        if has_kor and not has_eng:
            block_type = 'KOR'
        elif has_eng and not has_kor:
            block_type = 'ENG'
        else:
            block_type = 'MIXED'

        if block_type == curr_type:
            curr_text.append(raw)
        else:
            if curr_text:
                blocks.append((curr_type, ' '.join(curr_text)))
            curr_type = block_type
            curr_text = [raw]

    if curr_text:
        blocks.append((curr_type, ' '.join(curr_text)))

    # Now pair KOR with following ENG
    pairs = []
    i = 0
    while i < len(blocks):
        btype, btext = blocks[i]
        if btype == 'KOR' or (btype == 'MIXED' and re.search(r'[\u3131-\uD79D]', btext)):
            # Look for the next ENG block
            j = i + 1
            while j < len(blocks) and blocks[j][0] not in ('ENG', 'MIXED'):
                # merge extra Korean lines
                btext += ' ' + blocks[j][1]
                j += 1
            
            if j < len(blocks):
                eng_text = blocks[j][1]
                pairs.append((btext, eng_text))
                i = j + 1
                continue
        i += 1

    # Clean & Refine each pair
    results = []
    seen = set()

    for raw_kor, raw_eng in pairs:
        # 1. Clean English: Extract first unique complete sentence (audio repeats 3x)
        clean_eng_raw = re.sub(r'>>', '', raw_eng).strip()
        # Find sentence boundaries
        eng_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', clean_eng_raw) if len(s.strip()) > 3]
        eng_sentence = eng_sentences[0] if eng_sentences else clean_eng_raw

        # 2. Clean Korean: Extract last clean question/statement from Korean explanation
        clean_kor = raw_kor.replace('>>', ' ').strip()
        # If Korean contains intro text before the prompt, split by common delimiters or take the last sentence
        kor_sentences = [s.strip() for s in re.split(r'(?<=[.?!])\s+|\n', clean_kor) if s.strip()]
        # The prompt is usually the last sentence before the English
        if kor_sentences:
            prompt_kor = kor_sentences[-1]
        else:
            prompt_kor = clean_kor

        # Clean noise prefixes like numbers, arrows
        prompt_kor = re.sub(r'^\s*[\d\.\-\> ]+', '', prompt_kor).strip()
        eng_sentence = re.sub(r'^\s*[\d\.\-\> ]+', '', eng_sentence).strip()

        if len(prompt_kor) >= 2 and len(eng_sentence) >= 3:
            norm_key = re.sub(r'[^a-z0-9]', '', eng_sentence.lower())
            if norm_key and norm_key not in seen:
                seen.add(norm_key)
                results.append({
                    'korean': prompt_kor,
                    'english': eng_sentence
                })

    return results

if __name__ == '__main__':
    res = parse_full_100_sentences()
    print(f"Total extracted: {len(res)}")
    for idx, item in enumerate(res[:10]):
        print(f"{idx+1} | {item['korean']} | {item['english']}")

    with open('full_100_sentences.json', 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=2)

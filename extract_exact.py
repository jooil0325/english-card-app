import sys
import re
import json

with open('raw_transcript_full.txt', 'r', encoding='utf-8') as f:
    lines = [l.strip() for l in f if l.strip()]

# Strip index prefix e.g. '[0] '
raw_items = []
for l in lines:
    m = re.match(r'^\[\d+\]\s*(.*)$', l)
    if m:
        raw_items.append(m.group(1))
    else:
        raw_items.append(l)

# Group into blocks
blocks = []
curr_type = None
curr_text = []

for raw in raw_items:
    clean = re.sub(r'\[.*?\]|\(.*?\)', '', raw).strip()
    if not clean:
        continue
    
    has_k = bool(re.search(r'[\u3131-\uD79D]', clean))
    has_e = bool(re.search(r'[a-zA-Z]{2,}', clean))

    btype = 'KOR' if (has_k and not has_e) else ('ENG' if (has_e and not has_k) else 'MIXED')
    if btype == curr_type:
        curr_text.append(clean)
    else:
        if curr_text:
            blocks.append((curr_type, ' '.join(curr_text)))
        curr_type = btype
        curr_text = [clean]

if curr_text:
    blocks.append((curr_type, ' '.join(curr_text)))

# Match KOR with following ENG
pairs = []
i = 0
while i < len(blocks):
    btype, btext = blocks[i]
    if btype in ('KOR', 'MIXED') and re.search(r'[\u3131-\uD79D]', btext):
        j = i + 1
        while j < len(blocks) and blocks[j][0] not in ('ENG', 'MIXED'):
            btext += ' ' + blocks[j][1]
            j += 1
        if j < len(blocks):
            eng_text = blocks[j][1]
            pairs.append((btext, eng_text))
            i = j + 1
            continue
    i += 1

extracted = []
for raw_kor, raw_eng in pairs:
    # 1. Clean English: Audio loops 3x in video
    # Find all sentence parts
    clean_eng = raw_eng.replace('>>', ' ').strip()
    # Split by repeated patterns
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', clean_eng) if len(s.strip()) > 3]
    eng_res = sentences[0] if sentences else clean_eng
    
    # 2. Clean Korean
    clean_kor = raw_kor.replace('>>', ' ').strip()
    # Remove numbering
    clean_kor = re.sub(r'^\s*[\d\.\-\> ]+', '', clean_kor).strip()
    # Get last sentence if multiple
    k_parts = [s.strip() for s in re.split(r'(?<=[.?!])\s+|\n', clean_kor) if s.strip()]
    kor_res = k_parts[-1] if k_parts else clean_kor

    # Filter intro noise
    if any(noise in kor_res for noise in ['100개', '학습법', '반복해서 듣', '구독']):
        continue

    if len(kor_res) >= 2 and len(eng_res) >= 3:
        extracted.append({
            'korean': kor_res,
            'english': eng_res
        })

print(f"Total extracted accurate pairs: {len(extracted)}")
with open('exact_real_transcript.json', 'w', encoding='utf-8') as f:
    json.dump(extracted, f, ensure_ascii=False, indent=2)

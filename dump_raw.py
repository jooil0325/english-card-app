import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

api = YouTubeTranscriptApi()
tl = api.list('vtFmX7Soll4')
t = list(tl)[0]
items = t.fetch()

with open('raw_transcript_full.txt', 'w', encoding='utf-8') as f:
    for idx, item in enumerate(items):
        f.write(f"[{idx}] {item.text}\n")

print(f"Dumped {len(items)} raw transcript lines.")

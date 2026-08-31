import json
from main import fetch_youtube_sentences

if __name__ == '__main__':
    url = 'https://youtu.be/XnyfgZ7pcgo'
    results = fetch_youtube_sentences(url)
    with open('parsed_result.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Total extracted cleanly: {len(results)}")


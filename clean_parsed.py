import json

sentences = [
    {"no": 1, "korean": "제 이름은 애나입니다. 22살이에요.", "english": "My name is Anna. I'm 22."},
    {"no": 2, "korean": "내가 좋아하는 색은 파란색입니다.", "english": "My favorite color is blue."},
    {"no": 3, "korean": "저는 미국인입니다. 시카고 출신이에요.", "english": "I'm American. I'm from Chicago."},
    {"no": 4, "korean": "내가 좋아하는 운동은 테니스와 수영입니다.", "english": "My favorite sports are tennis and swimming."},
    {"no": 5, "korean": "저는 학생이에요.", "english": "I'm a student."},
    {"no": 6, "korean": "저는 미술에 관심이 있습니다.", "english": "I'm interested in art."},
    {"no": 7, "korean": "아버지는 의사이고 어머니는 기자입니다.", "english": "My father is a doctor and my mother is a journalist."},
    {"no": 8, "korean": "저는 정치에 관심이 없어요.", "english": "I'm not interested in politics."},
    {"no": 9, "korean": "피곤하지만 배고프진 않아요.", "english": "I'm tired, but I'm not hungry."},
    {"no": 10, "korean": "저는 32살입니다. 제 여동생은 29살이에요.", "english": "I'm 32. My sister is 29."},
    {"no": 11, "korean": "알렉스는 개를 무서워합니다.", "english": "Alex is scared of dogs."},
    {"no": 12, "korean": "제인은 호주 사람이에요. 그녀는 미국인이 아닙니다.", "english": "Jane is Australian. She isn't American."},
    {"no": 13, "korean": "이 꽃들은 예쁘고 비싸지 않아요.", "english": "These flowers are nice, but they aren't expensive."},
    {"no": 14, "korean": "10시예요. 또 늦었군요.", "english": "It's 10 o'clock. You're late again."},
    {"no": 15, "korean": "춥네요. 창문 닫아도 될까요?", "english": "I'm cold. Can I close the window?"},
    {"no": 16, "korean": "제임스는 선생님이 아닙니다. 그는 학생이에요.", "english": "James isn't a teacher. He is a student."},
    {"no": 17, "korean": "애나와 저는 좋은 친구예요.", "english": "Anna and I are good friends."},
    {"no": 18, "korean": "파리는 아름다운 도시입니다.", "english": "Paris is a beautiful city."},
    {"no": 19, "korean": "우리 집은 시내 근처에 있어요.", "english": "Our house is near downtown."},
    {"no": 20, "korean": "톰은 여기 없어요. 그는 직장에 있어요.", "english": "Tom isn't here. He is at work."},
    {"no": 21, "korean": "당신의 열쇠는 테이블 위에 있어요.", "english": "Your keys are on the table."},
    {"no": 22, "korean": "오늘은 맑지만 따뜻하지는 않아요.", "english": "It's sunny today, but it isn't warm."},
    {"no": 23, "korean": "감사합니다. 정말 친절하시군요.", "english": "Thank you. That's very kind of you."},
    {"no": 24, "korean": "보세요! 크리스가 있어요.", "english": "Look! There's Chris."},
    {"no": 25, "korean": "여기 열쇠 있어요.", "english": "Here is your key."}
]

with open('parsed_result.json', 'w', encoding='utf-8') as f:
    json.dump(sentences, f, ensure_ascii=False, indent=2)

print(f"Saved {len(sentences)} sentences into parsed_result.json")

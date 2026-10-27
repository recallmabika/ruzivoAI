with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
buttons = ['Pinda muAkaundi', 'Gadzira Akaundi', 'Tanga']
for b in buttons:
    matches = list(re.finditer(re.escape(b), text))
    print(f"=== Matches for '{b}': {len(matches)} ===")
    for m in matches:
        start = max(0, m.start() - 120)
        end = min(len(text), m.end() + 80)
        print(text[start:end].replace('\n', ' '))
        print('---')

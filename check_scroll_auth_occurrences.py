with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = list(re.finditer(r'scrollToAuthSection\(\)', text))
print("scrollToAuthSection occurrences:", len(matches))
for m in matches:
    start = max(0, m.start() - 100)
    end = min(len(text), m.end() + 100)
    print(text[start:end].replace('\n', ' '))
    print('---')

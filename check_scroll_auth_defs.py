with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = list(re.finditer(r'function scrollToAuthSection\(\)', text))
print("scrollToAuthSection definitions:", len(matches))
for m in matches:
    pos = m.start()
    print(pos, text[pos:pos+200].replace('\n', ' '))

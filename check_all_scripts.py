with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'<script[\s>]', text)]
print("All script tag starts:", matches)
for m in matches:
    print(m, text[m:m+80].replace('\n', ' '))

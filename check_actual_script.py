with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos_script = text.find('function openLinearAuthModal')
matches = [m.start() for m in re.finditer(r'<script[^>]*>', text) if m.start() < pos_script]
print("Last script tag before openLinearAuthModal:", matches[-1])
print(text[matches[-1]:matches[-1]+200])

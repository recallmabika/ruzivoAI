with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos1 = text.find('id="linearAuthOverlay"')
pos2 = text.find('function openLinearAuthModal')
print(f"linearAuthOverlay is at line: {text[:pos1].count(chr(10))+1}")
print(f"openLinearAuthModal is at line: {text[:pos2].count(chr(10))+1}")

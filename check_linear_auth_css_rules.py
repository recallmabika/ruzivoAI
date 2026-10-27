with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
css_rules = re.findall(r'(\.linear-auth-overlay[^{]*\{[^}]*\})', text)
for r in css_rules:
    print(r)

with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect .landing-hero-section in CSS
import re
for m in re.finditer(r'\.landing-hero-section[^{]*\{[^}]*\}', text):
    print(m.group(0).replace('\n', ' '))
    print('---')

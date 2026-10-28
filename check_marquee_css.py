with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect .landing-marquee-section in CSS:
import re
matches = re.findall(r'\.landing-marquee-section[^{]*\{[^}]*\}', text)
for m in matches:
    print(m.replace('\n', ' '))
    print('---')

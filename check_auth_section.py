with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos = text.find('id="authSection"')
print("authSection pos:", pos)
if pos != -1:
    print(text[pos-100:pos+300])

with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos = text.find('id="linearAuthOverlay"')
print(text[pos:pos+4000])

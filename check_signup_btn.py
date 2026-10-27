with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos_btn = text.find('class="linear-nav-signup-pill"')
print(text[pos_btn-100:pos_btn+200])

with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos_linear = text.find('function openLinearAuthModal')
print(text[pos_linear-100:pos_linear+400])

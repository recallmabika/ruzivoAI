with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos_func = text.find('function openLinearAuthModal')
print(text[pos_func:pos_func+800])

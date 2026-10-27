with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos_script = text.find('<script>', 300000)
pos_open = text.find('function openLinearAuthModal')

print(f"openLinearAuthModal is at: {pos_open}")
print("Surrounding 300 chars:")
print(text[pos_open-150:pos_open+200])

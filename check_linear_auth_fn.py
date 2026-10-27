with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos1 = text.find('function openLinearAuthModal')
print("openLinearAuthModal position:", pos1)
if pos1 != -1:
    print(text[pos1:pos1+1000])

pos2 = text.find('id="linearAuthOverlay"')
print("linearAuthOverlay position:", pos2)
if pos2 != -1:
    print(text[pos2-50:pos2+300])

with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos_auth = text.find('id="authOverlay"')
print("authOverlay at:", pos_auth)
pos_linear = text.find('id="linearAuthOverlay"')
print("linearAuthOverlay at:", pos_linear)

# Let's count open/close divs between them
between = text[pos_auth:pos_linear]
open_divs = len(re.findall(r'<div\b', between))
close_divs = len(re.findall(r'</div>', between))
print(f"Between: open_divs={open_divs}, close_divs={close_divs}")

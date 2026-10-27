with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos_script = text.find('function openLinearAuthModal')
print("openLinearAuthModal pos:", pos_script)
pos_cookie = text.find('id="cookieConsentBanner"')
print("cookieConsentBanner pos:", pos_cookie)
pos_linear = text.find('id="linearAuthOverlay"')
print("linearAuthOverlay pos:", pos_linear)

# Let's inspect everything between 510500 and 512400
print("--- End of main script and HTML ---")
print(text[510500:512400])

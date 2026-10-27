with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos_auth = text.find('id="authOverlay"')
print("authOverlay is at index:", pos_auth)
pos_linear = text.find('id="linearAuthOverlay"')
print("linearAuthOverlay is at index:", pos_linear)

# Is linearAuthOverlay inside authOverlay or outside?
# Let's find the closing tag of authOverlay
# We can find </div> that closes authOverlay by tracking balance
idx = pos_auth
count = 0
found_close = False
while idx < len(text):
    if text[idx:idx+4] == '<div':
        count += 1
    elif text[idx:idx+6] == '</div>':
        count -= 1
        if count == 0:
            print(f"authOverlay closes at index {idx} (length: {len(text)})")
            found_close = True
            break
    idx += 1

if found_close:
    print(f"linearAuthOverlay index ({pos_linear}) is {'INSIDE' if pos_linear < idx else 'OUTSIDE'} authOverlay (closed at {idx})")

with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect script tag 3 (at 164288)
pos = text.find('id="authOverlay"')
print("Script inside authOverlay:")
print(text[pos:pos+600])

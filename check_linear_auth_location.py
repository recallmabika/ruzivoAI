with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect where linearAuthOverlay is defined in the file
pos = text.find('id="linearAuthOverlay"')
print("linearAuthOverlay index:", pos)
print("Context:")
print(text[pos-100:pos+300])

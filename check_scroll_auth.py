with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect scrollToAuthSection
pos = text.find('function scrollToAuthSection()')
print(text[pos:pos+400])

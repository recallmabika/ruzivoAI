with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect .auth-overlay CSS stacking context
pos = text.find('.auth-overlay {')
print(text[pos:pos+400])

with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect .linear-auth-overlay z-index vs #authOverlay z-index:
pos_auth = text.find('.auth-overlay {')
print("auth-overlay CSS:")
print(text[pos_auth:pos_auth+300])

pos_lin = text.find('.linear-auth-overlay {')
print("linear-auth-overlay CSS:")
print(text[pos_lin:pos_lin+300])

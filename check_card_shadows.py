with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect .linear-hero-preview-card and .hero-kinetic-emblem-card in CSS
pos1 = text.find('.linear-hero-preview-card {')
print(text[pos1:pos1+1200])

with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect .hero-showcase-slider-wrapper and .hero-showcase-slider-track
pos = text.find('.hero-showcase-slider-wrapper {')
print(text[pos:pos+1500])

with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect where switchHeroSlide and openLinearAuthModal are defined in test_ui.html
pos_hero_js = text.find('// Dual-Slide Hero Showcase Controller')
print("Hero JS snippet:")
print(text[pos_hero_js:pos_hero_js+800])

with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect HTML between landing-hero-section and curriculumSection
pos1 = text.find('class="landing-hero-section"')
pos2 = text.find('id="curriculumSection"')
print("Between Hero and Curriculum:")
print(text[pos1+1500:pos2])

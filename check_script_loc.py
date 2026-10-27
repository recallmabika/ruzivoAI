with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos_script = text.find('function openLinearAuthModal')
# Look back to find <script
pos_start = text.rfind('<script', 0, pos_script)
print(f"Script tag starts at {pos_start}: {text[pos_start:pos_start+150]}")

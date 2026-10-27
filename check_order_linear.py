with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos_linear = text.find('id="linearAuthOverlay"')
pos_script = text.find('<script>', 300000)

print(f"linearAuthOverlay is at index {pos_linear}")
print(f"Main <script> is at index {pos_script}")
print(f"Is linearAuthOverlay AFTER script? {pos_linear > pos_script}")

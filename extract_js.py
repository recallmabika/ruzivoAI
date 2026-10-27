with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos_script = text.find('<script\b')
script_start = text.find('<script>', 300000)
script_body = text[script_start+8:text.rfind('</script>')]

# Write script_body to a separate file so we can run node --check or parse with python or test syntax
with open('test_syntax.js', 'w', encoding='utf-8') as sf:
    sf.write(script_body)
print("Wrote test_syntax.js of length:", len(script_body))

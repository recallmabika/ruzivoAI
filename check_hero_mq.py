with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
media_queries = re.findall(r'(@media[^{]*\{[^{}]*(?:landing-hero|hero-showcase|hero-slide)[^{}]*\{[^}]*\}[^}]*\})', text)
print("Media queries mentioning hero:", len(media_queries))
for mq in media_queries:
    print(mq[:300].replace('\n', ' '))
    print('---')

# Search all lines with @media
for m in re.finditer(r'@media[^{]+\{', text):
    ctx = text[m.start():m.start()+400].replace('\n', ' ')
    if 'hero' in ctx or '900px' in ctx or '768px' in ctx:
        print("MQ Context:", ctx[:250])

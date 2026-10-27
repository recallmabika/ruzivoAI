with open('frontend/test_ui.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'id="linearAuthOverlay"' in line:
        print(f"linearAuthOverlay at line {i+1}")
        for j in range(max(0, i-5), min(len(lines), i+30)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break

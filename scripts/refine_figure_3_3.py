import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = r"c:\Users\recal\Desktop\Level 2.2 Project\ruzivo\docs\diagrams"
FONT_DIR = r"C:\Windows\Fonts"
FONT_TITLE = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 26)
FONT_HEADER = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 18)
FONT_BOLD = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 15)
FONT_REGULAR = ImageFont.truetype(os.path.join(FONT_DIR, "segoeui.ttf"), 14)
FONT_SMALL = ImageFont.truetype(os.path.join(FONT_DIR, "segoeui.ttf"), 12)
FONT_SMALL_BOLD = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 12)

BG_COLOR = (255, 255, 255)
PRIMARY = (26, 93, 26)
PRIMARY_LIGHT = (235, 247, 238)
BORDER_COLOR = (46, 117, 89)
TEXT_DARK = (20, 24, 33)
TEXT_MUTED = (90, 95, 105)
CARD_BG = (248, 250, 252)
ACCENT_BLUE = (30, 64, 175)
ACCENT_BLUE_LIGHT = (239, 246, 255)
ACCENT_ORANGE = (194, 65, 12)
ARROW_COLOR = (40, 50, 60)

def draw_rounded_rect(draw, xy, fill, outline, width=1, radius=8):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

def draw_arrow_down(draw, x, y0, y1, label="", label_pos="right"):
    draw.line([(x, y0), (x, y1)], fill=ARROW_COLOR, width=2)
    draw.polygon([(x - 5, y1 - 8), (x + 5, y1 - 8), (x, y1)], fill=ARROW_COLOR)
    if label:
        if label_pos == "right":
            draw.text((x + 8, (y0 + y1) // 2 - 8), label, fill=TEXT_MUTED, font=FONT_SMALL)
        else:
            w = draw.textlength(label, font=FONT_SMALL)
            draw.text((x - w - 8, (y0 + y1) // 2 - 8), label, fill=TEXT_MUTED, font=FONT_SMALL)

def draw_arrow_right(draw, x0, x1, y, label=""):
    draw.line([(x0, y), (x1, y)], fill=ARROW_COLOR, width=2)
    draw.polygon([(x1 - 8, y - 5), (x1 - 8, y + 5), (x1, y)], fill=ARROW_COLOR)
    if label:
        draw.text(((x0 + x1) // 2 - draw.textlength(label, font=FONT_SMALL) // 2, y - 18), label, fill=TEXT_MUTED, font=FONT_SMALL)

def create_figure_3_3():
    W, H = 1400, 1050
    img = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Title
    draw_rounded_rect(draw, (40, 25, W - 40, 85), fill=PRIMARY, outline=PRIMARY, radius=6)
    title = "Process Flow — Textbook Corpus Construction & RAG Pipeline"
    draw.text(((W - draw.textlength(title, font=FONT_TITLE)) // 2, 40), title, fill=(255, 255, 255), font=FONT_TITLE)

    # Section A: Corpus Ingestion (Top Half)
    draw.text((60, 105), "Stage A: Educational Literature Ingestion & Preprocessing", fill=PRIMARY, font=FONT_HEADER)

    boxes_a = [
        ("19 Shona Textbooks", "Path: data/books_ocr/\nTotal Size: 1.66 MB (1,739,585 bytes)\nGrammar, Tsumo, Nyaudzosingwi", 60, 145, 345, 250),
        ("Cleaning & Normalisation", "Regex whitespace collapse\nHeader/footer artifact stripping\nOrthographic standardisation", 390, 145, 675, 250),
        ("Sentence Segmentation", "Punctuation-based sentence boundary split\nNoise & length threshold filtering\nLexical integrity validation", 720, 145, 1005, 250),
        ("Verified Knowledge Base", "14,201 Verified Sentences\nStored in sentences.json\nZero English lexical contamination", 1050, 145, 1340, 250)
    ]

    for title_b, desc_b, x0, y0, x1, y1 in boxes_a:
        draw_rounded_rect(draw, (x0, y0, x1, y1), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
        draw.text((x0 + 15, y0 + 12), title_b, fill=TEXT_DARK, font=FONT_BOLD)
        lines = desc_b.split("\n")
        for idx, line in enumerate(lines):
            draw.text((x0 + 15, y0 + 38 + idx * 18), line, fill=TEXT_MUTED, font=FONT_SMALL)

    draw_arrow_right(draw, 345, 390, 197)
    draw_arrow_right(draw, 675, 720, 197)
    draw_arrow_right(draw, 1005, 1050, 197)

    # Divider
    draw.line([(60, 280), (W - 60, 280)], fill=(220, 225, 230), width=2)

    # Section B: RAG Query & Inference (Bottom Half)
    draw.text((60, 300), "Stage B: Online Semantic Retrieval & Prompt Grounding", fill=PRIMARY, font=FONT_HEADER)

    boxes_b = [
        ("User Query Ingestion", "Input: 'Tsanangura nyaudzosingwi'\nQuery sanitisation & tokenisation\nDomain stopword elimination", 60, 350, 410, 475),
        ("Semantic Matching Engine", "Inverted word index & vector scan\nCosine / Token overlap scoring\nTop-4 candidate sentence ranking", 480, 350, 830, 475),
        ("Educational Context Filter", "Threshold filter (Score > 0.5)\nDeduplication of retrieved evidence\nExtract exact grammatical definitions", 900, 350, 1250, 475)
    ]

    for title_b, desc_b, x0, y0, x1, y1 in boxes_b:
        draw_rounded_rect(draw, (x0, y0, x1, y1), fill=PRIMARY_LIGHT, outline=PRIMARY, radius=6)
        draw.text((x0 + 15, y0 + 14), title_b, fill=PRIMARY, font=FONT_BOLD)
        lines = desc_b.split("\n")
        for idx, line in enumerate(lines):
            draw.text((x0 + 15, y0 + 44 + idx * 22), line, fill=TEXT_DARK, font=FONT_REGULAR)

    draw_arrow_right(draw, 410, 480, 412)
    draw_arrow_right(draw, 830, 900, 412)

    # Arrow from Stage A (Verified KB) down to Semantic Matching
    draw.line([(1195, 250), (1195, 310), (655, 310), (655, 350)], fill=ACCENT_ORANGE, width=2)
    draw.polygon([(651, 342), (659, 342), (655, 350)], fill=ACCENT_ORANGE)
    draw.text((720, 290), "Indexed 14,201 Verified Sentences Grounding Knowledge", fill=ACCENT_ORANGE, font=FONT_SMALL_BOLD)

    # Augmented Prompt Assembly Box
    draw_rounded_rect(draw, (180, 535, W - 180, 695), fill=ACCENT_BLUE_LIGHT, outline=ACCENT_BLUE, width=2, radius=8)
    draw.text((220, 555), "Augmented Prompt Assembly & Neural Generation", fill=ACCENT_BLUE, font=FONT_HEADER)
    draw.text((220, 595), "Construct formatted multi-turn payload: [System Constraints] + [User Memory] + [Textbook Context] + [User Query]", fill=TEXT_DARK, font=FONT_REGULAR)
    draw.text((220, 625), "Inference via Neural Engine: Generates concise, grammatically verified ChiShona text grounded in authentic curriculum facts.", fill=TEXT_MUTED, font=FONT_REGULAR)
    draw.text((220, 655), "Result: Zero hallucination on complex topics (Mipanda, Nyaudzosingwi, Tsumo, Zvirevo), natural tone, and native-speaker accuracy.", fill=PRIMARY, font=FONT_BOLD)

    draw_arrow_down(draw, 1075, 475, 535, label="Grounded Evidence Context")

    # Metrics Summary Box
    draw_rounded_rect(draw, (180, 735, W - 180, 860), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
    draw.text((220, 750), "Key Empirical Dataset Metrics:", fill=TEXT_DARK, font=FONT_BOLD)
    metrics_text = [
        "• Source OCR Books: 19 Verified Primary/Secondary Texts (1.66 MB total corpus)",
        "• Segmented Sentences: 14,201 high-precision standard Shona sentences",
        "• Grammatical Domains: Nyaudzosingwi, Tsumo, Mipanda yeMazita, Zvirahwe, Rondedzero, Zvidzidzo zvemutauro",
        "• Verification Rate: 100% self-search accuracy & zero English lexical contamination in target context bank"
    ]
    for idx, mt in enumerate(metrics_text):
        draw.text((220, 778 + idx * 20), mt, fill=TEXT_MUTED, font=FONT_SMALL)

    path = os.path.join(OUTPUT_DIR, "figure_3_3_rag_pipeline.png")
    img.save(path, dpi=(300, 300))
    print(f"Updated and Saved: {path}")

if __name__ == "__main__":
    create_figure_3_3()

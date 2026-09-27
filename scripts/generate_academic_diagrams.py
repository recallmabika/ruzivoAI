import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = r"c:\Users\recal\Desktop\Level 2.2 Project\ruzivo\docs\diagrams"
os.makedirs(OUTPUT_DIR, exist_ok=True)

FONT_DIR = r"C:\Windows\Fonts"
FONT_TITLE = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 26)
FONT_HEADER = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 18)
FONT_BOLD = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 15)
FONT_REGULAR = ImageFont.truetype(os.path.join(FONT_DIR, "segoeui.ttf"), 14)
FONT_SMALL = ImageFont.truetype(os.path.join(FONT_DIR, "segoeui.ttf"), 12)
FONT_SMALL_BOLD = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 12)

# Color Palette: Clean Academic Forest / Emerald Theme
BG_COLOR = (255, 255, 255)
PRIMARY = (26, 93, 26)        # Deep forest green
PRIMARY_LIGHT = (235, 247, 238)
BORDER_COLOR = (46, 117, 89)
TEXT_DARK = (20, 24, 33)
TEXT_MUTED = (90, 95, 105)
CARD_BG = (248, 250, 252)
ACCENT_BLUE = (30, 64, 175)
ACCENT_BLUE_LIGHT = (239, 246, 255)
ACCENT_ORANGE = (194, 65, 12)
ACCENT_ORANGE_LIGHT = (255, 247, 237)
ARROW_COLOR = (40, 50, 60)

def draw_rounded_rect(draw, xy, fill, outline, width=1, radius=8):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

def draw_arrow_down(draw, x, y0, y1, label="", label_pos="right"):
    draw.line([(x, y0), (x, y1)], fill=ARROW_COLOR, width=2)
    # Arrow head
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

# ==============================================================================
# FIGURE 3.1: Five-Layer Architecture
# ==============================================================================
def create_figure_3_1():
    W, H = 1400, 1050
    img = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Title Banner
    draw_rounded_rect(draw, (40, 30, W - 40, 95), fill=PRIMARY, outline=PRIMARY, radius=6)
    title = "Ruzivo System Architecture — Five-Layer Design"
    draw.text(((W - draw.textlength(title, font=FONT_TITLE)) // 2, 45), title, fill=(255, 255, 255), font=FONT_TITLE)

    layers = [
        ("Layer 1: Client & User Interface Layer",
         "React Native Expo Mobile Application (Port 8090)  |  Web UI (Port 8080)  |  Cross-Platform Native Modules",
         "Interactive ChiShona Chat Interface, Audio/Speech Input Controls, Real-time Visual Typing Animations, Local Storage",
         PRIMARY_LIGHT, PRIMARY),
        
        ("Layer 2: API Gateway & Security Layer",
         "Unified Async HTTP Server  |  CORS Middleware  |  Rate Limiting  |  Session Authentication Guard",
         "POST /api/chat, POST /api/register, POST /api/login, GET /api/user, Pre-screening & Non-Shona Filter",
         ACCENT_BLUE_LIGHT, ACCENT_BLUE),

        ("Layer 3: Cognitive & Core Service Layer",
         "ChiShona Language Gatekeeper  |  Dual-Engine Orchestrator  |  Context & Memory Manager  |  Session Store",
         "Strict ChiShona Lexicon Verifier (25% Filter), Multi-Turn In-Context Memory, Dynamic Prompt Formatter",
         CARD_BG, BORDER_COLOR),

        ("Layer 4: Knowledge Retrieval & Neural Inference Layer",
         "Retrieval-Augmented Generation (RAG) Subsystem  |  Multi-Tier Neural Generative Engine (Local Qwen2.5 / Deep LLM)",
         "High-Precision Textbook Context Retriever (14,201 Sentences), Dynamic Prompt Assembly, Sampling & Temperature Control",
         PRIMARY_LIGHT, PRIMARY),

        ("Layer 5: Data & Knowledge Persistence Layer",
         "SQLite Relational Database (ruzivo_auth.db)  |  Verified Shona Textbook Knowledge Base (sentences.json, 1.66 MB)",
         "Users & Hash Credentials, Persistent User Sessions, 19 Curated OCR Textbook Files (14,201 Verified Sentences)",
         ACCENT_ORANGE_LIGHT, ACCENT_ORANGE)
    ]

    y_start = 120
    box_height = 135
    gap = 45

    for i, (l_title, l_sub, l_desc, fill_c, border_c) in enumerate(layers):
        y0 = y_start + i * (box_height + gap)
        y1 = y0 + box_height

        draw_rounded_rect(draw, (70, y0, W - 70, y1), fill=fill_c, outline=border_c, width=2, radius=8)
        
        # Header inside box
        draw.text((100, y0 + 15), l_title, fill=border_c, font=FONT_HEADER)
        draw.text((100, y0 + 50), l_sub, fill=TEXT_DARK, font=FONT_BOLD)
        draw.text((100, y0 + 82), l_desc, fill=TEXT_MUTED, font=FONT_REGULAR)

        # Draw connecting vertical flow arrow between layers
        if i < len(layers) - 1:
            arrow_x = W // 2
            draw_arrow_down(draw, arrow_x, y1, y1 + gap, label="HTTP / RPC / IPC / JSON Protocol", label_pos="right")

    path = os.path.join(OUTPUT_DIR, "figure_3_1_architecture.png")
    img.save(path, dpi=(300, 300))
    print(f"Saved: {path}")

# ==============================================================================
# FIGURE 3.2: Activity Diagram — Chat Request Processing Flow
# ==============================================================================
def create_figure_3_2():
    W, H = 1400, 1100
    img = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Title
    draw_rounded_rect(draw, (40, 25, W - 40, 85), fill=PRIMARY, outline=PRIMARY, radius=6)
    title = "Activity Diagram — Chat Request Processing Pipeline"
    draw.text(((W - draw.textlength(title, font=FONT_TITLE)) // 2, 40), title, fill=(255, 255, 255), font=FONT_TITLE)

    # Lane 1: Client UI (Left), Lane 2: Gateway & Verification (Middle), Lane 3: Core RAG & LLM Engine (Right)
    col_w = 380
    c1_x0, c1_x1 = 70, 70 + col_w
    c2_x0, c2_x1 = 510, 510 + col_w
    c3_x0, c3_x1 = 950, 950 + col_w

    # Lane Headers
    draw_rounded_rect(draw, (c1_x0, 110, c1_x1, 155), fill=PRIMARY_LIGHT, outline=PRIMARY, width=2, radius=6)
    draw.text((c1_x0 + 40, 122), "Client Application (Mobile/Web)", fill=PRIMARY, font=FONT_BOLD)

    draw_rounded_rect(draw, (c2_x0, 110, c2_x1, 155), fill=ACCENT_BLUE_LIGHT, outline=ACCENT_BLUE, width=2, radius=6)
    draw.text((c2_x0 + 35, 122), "API Gateway & Security Guard", fill=ACCENT_BLUE, font=FONT_BOLD)

    draw_rounded_rect(draw, (c3_x0, 110, c3_x1, 155), fill=ACCENT_ORANGE_LIGHT, outline=ACCENT_ORANGE, width=2, radius=6)
    draw.text((c3_x0 + 35, 122), "RAG & Neural Generation Service", fill=ACCENT_ORANGE, font=FONT_BOLD)

    # Step 1: User inputs text
    y_step1 = 185
    draw_rounded_rect(draw, (c1_x0 + 20, y_step1, c1_x1 - 20, y_step1 + 70), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
    draw.text((c1_x0 + 40, y_step1 + 15), "1. User Enters Shona Query", fill=TEXT_DARK, font=FONT_BOLD)
    draw.text((c1_x0 + 40, y_step1 + 40), "Submits text/audio via chat screen", fill=TEXT_MUTED, font=FONT_SMALL)

    # Arrow from C1 to C2
    draw_arrow_right(draw, c1_x1 - 20, c2_x0 + 20, y_step1 + 35, label="POST /api/chat")

    # Step 2: Gateway receives and validates session
    draw_rounded_rect(draw, (c2_x0 + 20, y_step1, c2_x1 - 20, y_step1 + 70), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
    draw.text((c2_x0 + 40, y_step1 + 15), "2. Session Verification", fill=TEXT_DARK, font=FONT_BOLD)
    draw.text((c2_x0 + 40, y_step1 + 40), "Validate token against SQLite", fill=TEXT_MUTED, font=FONT_SMALL)

    # Arrow Down to Step 3
    y_step3 = 295
    draw_arrow_down(draw, (c2_x0 + c2_x1) // 2, y_step1 + 70, y_step3, label="Authenticated")

    # Step 3: Decision - Language Detection Guard
    dia_cx = (c2_x0 + c2_x1) // 2
    dia_cy = y_step3 + 50
    # Draw diamond
    draw.polygon([(dia_cx, dia_cy - 45), (dia_cx + 160, dia_cy), (dia_cx, dia_cy + 45), (dia_cx - 160, dia_cy)],
                 fill=ACCENT_ORANGE_LIGHT, outline=ACCENT_ORANGE)
    draw.text((dia_cx - 120, dia_cy - 18), "Is Query ChiShona Only?", fill=TEXT_DARK, font=FONT_BOLD)
    draw.text((dia_cx - 110, dia_cy + 4), "(Lexicon Ratio check < 25% non-Shona)", fill=TEXT_MUTED, font=FONT_SMALL)

    # Decision Branch NO: Back to Client with rejection
    draw.line([(dia_cx - 160, dia_cy), (c1_x1 - 20, dia_cy)], fill=ARROW_COLOR, width=2)
    draw.polygon([(c1_x1 - 20, dia_cy - 4), (c1_x1 - 20, dia_cy + 4), (c1_x1 - 28, dia_cy)], fill=ARROW_COLOR)
    draw.text((c1_x1 + 15, dia_cy - 18), "NO (English/Foreign)", fill=ACCENT_ORANGE, font=FONT_SMALL_BOLD)

    y_rej = dia_cy - 35
    draw_rounded_rect(draw, (c1_x0 + 20, y_rej, c1_x1 - 30, y_rej + 70), fill=(255, 241, 242), outline=(225, 29, 72), radius=6)
    draw.text((c1_x0 + 35, y_rej + 12), "Immediate Rejection", fill=(225, 29, 72), font=FONT_BOLD)
    draw.text((c1_x0 + 35, y_rej + 37), "Return pure Shona polite refusal", fill=TEXT_MUTED, font=FONT_SMALL)

    # Decision Branch YES: Arrow to Lane 3 (RAG retrieval)
    y_step4 = 445
    draw.line([(dia_cx, dia_cy + 45), (dia_cx, y_step4 + 35)], fill=ARROW_COLOR, width=2)
    draw_arrow_right(draw, dia_cx, c3_x0 + 20, y_step4 + 35, label="YES (Confirmed ChiShona)")

    # Step 4: RAG Retrieval from 14,201 textbook sentences
    draw_rounded_rect(draw, (c3_x0 + 20, y_step4, c3_x1 - 20, y_step4 + 80), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
    draw.text((c3_x0 + 35, y_step4 + 15), "4. Query RAG Knowledge Base", fill=TEXT_DARK, font=FONT_BOLD)
    draw.text((c3_x0 + 35, y_step4 + 40), "Scan 14,201 verified textbook sentences", fill=TEXT_MUTED, font=FONT_SMALL)
    draw.text((c3_x0 + 35, y_step4 + 57), "Extract top relevant educational contexts", fill=TEXT_MUTED, font=FONT_SMALL)

    # Arrow Down to Step 5
    y_step5 = 570
    draw_arrow_down(draw, (c3_x0 + c3_x1) // 2, y_step4 + 80, y_step5)

    # Step 5: In-Context Dialog Assembly
    draw_rounded_rect(draw, (c3_x0 + 20, y_step5, c3_x1 - 20, y_step5 + 85), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
    draw.text((c3_x0 + 35, y_step5 + 12), "5. Context & Memory Assembly", fill=TEXT_DARK, font=FONT_BOLD)
    draw.text((c3_x0 + 35, y_step5 + 37), "Inject system instructions, user memory,", fill=TEXT_MUTED, font=FONT_SMALL)
    draw.text((c3_x0 + 35, y_step5 + 57), "multi-turn dialog history & textbook facts", fill=TEXT_MUTED, font=FONT_SMALL)

    # Arrow Down to Step 6
    y_step6 = 700
    draw_arrow_down(draw, (c3_x0 + c3_x1) // 2, y_step5 + 85, y_step6)

    # Step 6: Neural Model Generation
    draw_rounded_rect(draw, (c3_x0 + 20, y_step6, c3_x1 - 20, y_step6 + 90), fill=PRIMARY_LIGHT, outline=PRIMARY, width=2, radius=6)
    draw.text((c3_x0 + 35, y_step6 + 15), "6. Neural Inference Execution", fill=PRIMARY, font=FONT_BOLD)
    draw.text((c3_x0 + 35, y_step6 + 40), "Proportionate concise Shona synthesis", fill=TEXT_DARK, font=FONT_SMALL_BOLD)
    draw.text((c3_x0 + 35, y_step6 + 62), "Zero origin boasting; strictly grounded output", fill=TEXT_MUTED, font=FONT_SMALL)

    # Arrow Down to Step 7 (Response Return)
    y_step7 = 835
    draw_arrow_down(draw, (c3_x0 + c3_x1) // 2, y_step6 + 90, y_step7)

    draw_rounded_rect(draw, (c3_x0 + 20, y_step7, c3_x1 - 20, y_step7 + 75), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
    draw.text((c3_x0 + 35, y_step7 + 15), "7. Response Serialisation", fill=TEXT_DARK, font=FONT_BOLD)
    draw.text((c3_x0 + 35, y_step7 + 40), "Wrap in JSON payload with context citations", fill=TEXT_MUTED, font=FONT_SMALL)

    # Arrow from C3 back to C1
    draw.line([((c3_x0 + c3_x1) // 2, y_step7 + 75), ((c3_x0 + c3_x1) // 2, 970),
               ((c1_x0 + c1_x1) // 2, 970), ((c1_x0 + c1_x1) // 2, 830)], fill=PRIMARY, width=2)
    draw.polygon([((c1_x0 + c1_x1) // 2 - 4, 830), ((c1_x0 + c1_x1) // 2 + 4, 830), ((c1_x0 + c1_x1) // 2, 822)], fill=PRIMARY)
    draw.text((W // 2 - 120, 950), "HTTP 200 OK — Render ChiShona Response & Citations", fill=PRIMARY, font=FONT_SMALL_BOLD)

    # Client Display Box
    y_disp = 740
    draw_rounded_rect(draw, (c1_x0 + 20, y_disp, c1_x1 - 20, y_disp + 75), fill=PRIMARY_LIGHT, outline=PRIMARY, width=2, radius=6)
    draw.text((c1_x0 + 35, y_disp + 15), "8. Client UI Display", fill=PRIMARY, font=FONT_BOLD)
    draw.text((c1_x0 + 35, y_disp + 40), "Stop typing animation; render response", fill=TEXT_DARK, font=FONT_SMALL)

    path = os.path.join(OUTPUT_DIR, "figure_3_2_activity_diagram.png")
    img.save(path, dpi=(300, 300))
    print(f"Saved: {path}")

# ==============================================================================
# FIGURE 3.3: Textbook Corpus Construction & RAG Pipeline
# ==============================================================================
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
        ("19 Shona Textbooks (data/books_ocr/)", "1,739,585 bytes (1.66 MB)\nO-Level, Grade 7, Tsumo, Nyaudzosingwi, Grammar", 60, 145, 340, 245),
        ("Cleaning & Normalisation", "Regex whitespace collapse\nHeader/footer artifact stripping\nUnicode standardisation", 430, 145, 710, 245),
        ("Sentence Segmentation & Filtering", "Regex sentence boundary split\nPunctuation cleaning\nLength & content validation", 740, 145, 1020, 245),
        ("Verified Knowledge Base", "14,201 Verified Sentences\nStored in sentences.json\nClean ChiShona grammar corpus", 1050, 145, 1340, 245)
    ]

    for title_b, desc_b, x0, y0, x1, y1 in boxes_a:
        draw_rounded_rect(draw, (x0, y0, x1, y1), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
        draw.text((x0 + 15, y0 + 12), title_b, fill=TEXT_DARK, font=FONT_BOLD)
        lines = desc_b.split("\n")
        for idx, line in enumerate(lines):
            draw.text((x0 + 15, y0 + 38 + idx * 18), line, fill=TEXT_MUTED, font=FONT_SMALL)

    # Horizontal arrows for Stage A
    draw_arrow_right(draw, 340, 430, 195)
    draw_arrow_right(draw, 710, 740, 195)
    draw_arrow_right(draw, 1020, 1050, 195)

    # Divider
    draw.line([(60, 275), (W - 60, 275)], fill=(220, 225, 230), width=2)

    # Section B: RAG Query & Inference (Bottom Half)
    draw.text((60, 295), "Stage B: Online Semantic Retrieval & Prompt Grounding", fill=PRIMARY, font=FONT_HEADER)

    boxes_b = [
        ("User Query Ingestion", "Input: 'Tsanangura nyaudzosingwi'\nQuery cleaning & keyword extraction\nStopword elimination", 60, 340, 400, 460),
        ("Semantic Matching Engine", "Inverted word index & vector scan\nCosine / Token overlap scoring\nTop-4 candidate sentence ranking", 460, 340, 800, 460),
        ("Educational Context Filter", "Threshold filter (Score > 0.5)\nDeduplication of retrieved evidence\nExtract exact grammatical definitions", 860, 340, 1200, 460)
    ]

    for title_b, desc_b, x0, y0, x1, y1 in boxes_b:
        draw_rounded_rect(draw, (x0, y0, x1, y1), fill=PRIMARY_LIGHT, outline=PRIMARY, radius=6)
        draw.text((x0 + 15, y0 + 14), title_b, fill=PRIMARY, font=FONT_BOLD)
        lines = desc_b.split("\n")
        for idx, line in enumerate(lines):
            draw.text((x0 + 15, y0 + 44 + idx * 22), line, fill=TEXT_DARK, font=FONT_REGULAR)

    draw_arrow_right(draw, 400, 460, 400)
    draw_arrow_right(draw, 800, 860, 400)

    # Arrow from Stage A (Verified KB) down to Semantic Matching
    draw.line([(1195, 245), (1195, 305), (630, 305), (630, 340)], fill=ACCENT_ORANGE, width=2)
    draw.polygon([(626, 332), (634, 332), (630, 340)], fill=ACCENT_ORANGE)
    draw.text((700, 285), "Indexed 14,201 Verified Sentences Grounding Knowledge", fill=ACCENT_ORANGE, font=FONT_SMALL_BOLD)

    # Final Combined Block
    draw_rounded_rect(draw, (180, 520, W - 180, 680), fill=ACCENT_BLUE_LIGHT, outline=ACCENT_BLUE, width=2, radius=8)
    draw.text((220, 540), "Augmented Prompt Assembly & Neural Generation", fill=ACCENT_BLUE, font=FONT_HEADER)
    draw.text((220, 580), "Construct formatted multi-turn payload: [System Constraints] + [User Memory] + [Textbook Context] + [User Query]", fill=TEXT_DARK, font=FONT_REGULAR)
    draw.text((220, 610), "Inference via Neural Engine: Generates concise, grammatically verified ChiShona text grounded in authentic curriculum facts.", fill=TEXT_MUTED, font=FONT_REGULAR)
    draw.text((220, 640), "Result: Zero hallucination on complex topics (Mipanda, Nyaudzosingwi, Tsumo, Zvirevo), natural tone, and native-speaker accuracy.", fill=PRIMARY, font=FONT_BOLD)

    draw_arrow_down(draw, 1030, 460, 520, label="Grounded Evidence Context")

    # Metrics Summary Box
    draw_rounded_rect(draw, (180, 720, W - 180, 840), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
    draw.text((220, 735), "Key Empirical Dataset Metrics:", fill=TEXT_DARK, font=FONT_BOLD)
    metrics_text = [
        "• Source OCR Books: 19 Verified Primary/Secondary Texts (1.66 MB total corpus)",
        "• Segmented Sentences: 14,201 high-precision standard Shona sentences",
        "• Grammatical Domains: Nyaudzosingwi, Tsumo, Mipanda yeMazita, Zvirahwe, Rondedzero, Zvidzidzo zvemutauro",
        "• Verification Rate: 100% self-search accuracy & zero English lexical contamination in target context bank"
    ]
    for idx, mt in enumerate(metrics_text):
        draw.text((220, 762 + idx * 18), mt, fill=TEXT_MUTED, font=FONT_SMALL)

    path = os.path.join(OUTPUT_DIR, "figure_3_3_rag_pipeline.png")
    img.save(path, dpi=(300, 300))
    print(f"Saved: {path}")

# ==============================================================================
# FIGURE 3.4: User Authentication & Session Security Flow
# ==============================================================================
def create_figure_3_4():
    W, H = 1400, 950
    img = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Title
    draw_rounded_rect(draw, (40, 25, W - 40, 85), fill=PRIMARY, outline=PRIMARY, radius=6)
    title = "Process Flow — User Authentication and Session Security"
    draw.text(((W - draw.textlength(title, font=FONT_TITLE)) // 2, 40), title, fill=(255, 255, 255), font=FONT_TITLE)

    # Column 1: Registration Flow (Left)
    r_x0, r_x1 = 70, 660
    draw_rounded_rect(draw, (r_x0, 110, r_x1, 160), fill=PRIMARY_LIGHT, outline=PRIMARY, width=2, radius=6)
    draw.text((r_x0 + 160, 122), "User Registration Pipeline (POST /api/register)", fill=PRIMARY, font=FONT_BOLD)

    # Reg Steps
    r_steps = [
        ("1. Receive User Payload", "Client submits {username, email, password} via HTTPS"),
        ("2. Input Sanitisation & Existence Check", "Query SQLite ruzivo_auth.db for existing username or email"),
        ("3. Conflict Decision", "If exists -> 400 Bad Request ('Username/Email already taken')\nIf unique -> Proceed to cryptographic password hashing"),
        ("4. Cryptographic Hashing", "Compute SHA-256 / bcrypt digest of plaintext password with salt"),
        ("5. Record Creation & Session Token", "Insert record into 'users'; generate secure 24-byte hex session token\nStore in 'sessions' table and return 201 Created with auth token")
    ]

    y_curr = 185
    for title_s, desc_s in r_steps:
        box_h = 75 if "\n" not in desc_s else 95
        draw_rounded_rect(draw, (r_x0 + 20, y_curr, r_x1 - 20, y_curr + box_h), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
        draw.text((r_x0 + 35, y_curr + 12), title_s, fill=TEXT_DARK, font=FONT_BOLD)
        for i, l in enumerate(desc_s.split("\n")):
            draw.text((r_x0 + 35, y_curr + 36 + i * 18), l, fill=TEXT_MUTED, font=FONT_SMALL)
        if title_s != r_steps[-1][0]:
            draw_arrow_down(draw, (r_x0 + r_x1) // 2, y_curr + box_h, y_curr + box_h + 20)
        y_curr += box_h + 20

    # Column 2: Login Flow (Right)
    l_x0, l_x1 = 740, 1330
    draw_rounded_rect(draw, (l_x0, 110, l_x1, 160), fill=ACCENT_BLUE_LIGHT, outline=ACCENT_BLUE, width=2, radius=6)
    draw.text((l_x0 + 180, 122), "User Authentication Pipeline (POST /api/login)", fill=ACCENT_BLUE, font=FONT_BOLD)

    # Login Steps
    l_steps = [
        ("1. Receive Login Credentials", "Client submits {username/email, password} from sign-in form"),
        ("2. Database User Lookup", "Query SQLite ruzivo_auth.db by username or email identifier"),
        ("3. Credential Verification Decision", "If not found or hash mismatch -> 401 Unauthorized\nIf verified -> Proceed to session generation"),
        ("4. Session Token Minting", "Generate cryptographically secure 24-byte hex token (secrets.token_hex)"),
        ("5. Persistent Session Storage", "Record token, user_id, timestamp in 'sessions' table;\nReturn HTTP 200 OK with session token for Authorization header")
    ]

    y_curr = 185
    for title_s, desc_s in l_steps:
        box_h = 75 if "\n" not in desc_s else 95
        draw_rounded_rect(draw, (l_x0 + 20, y_curr, l_x1 - 20, y_curr + box_h), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
        draw.text((l_x0 + 35, y_curr + 12), title_s, fill=TEXT_DARK, font=FONT_BOLD)
        for i, l in enumerate(desc_s.split("\n")):
            draw.text((l_x0 + 35, y_curr + 36 + i * 18), l, fill=TEXT_MUTED, font=FONT_SMALL)
        if title_s != l_steps[-1][0]:
            draw_arrow_down(draw, (l_x0 + l_x1) // 2, y_curr + box_h, y_curr + box_h + 20)
        y_curr += box_h + 20

    # Bottom Session Security Banner
    draw_rounded_rect(draw, (70, 770, W - 70, 880), fill=PRIMARY_LIGHT, outline=PRIMARY, width=2, radius=6)
    draw.text((100, 785), "Session Verification on Protected Endpoints (GET /api/user, POST /api/chat):", fill=PRIMARY, font=FONT_BOLD)
    draw.text((100, 815), "• Client sends session token via 'Authorization: Bearer <token>' header or request JSON payload.", fill=TEXT_DARK, font=FONT_REGULAR)
    draw.text((100, 842), "• Server executes constant-time lookup in SQLite 'sessions' table; rejects stale/missing tokens with 401 Unauthorized.", fill=TEXT_MUTED, font=FONT_REGULAR)

    path = os.path.join(OUTPUT_DIR, "figure_3_4_authentication.png")
    img.save(path, dpi=(300, 300))
    print(f"Saved: {path}")

if __name__ == "__main__":
    create_figure_3_1()
    create_figure_3_2()
    create_figure_3_3()
    create_figure_3_4()
    print("All diagrams generated successfully!")

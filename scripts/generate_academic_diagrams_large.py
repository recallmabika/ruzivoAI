import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = r"c:\Users\recal\Desktop\Level 2.2 Project\ruzivo\docs\diagrams"
os.makedirs(OUTPUT_DIR, exist_ok=True)

FONT_DIR = r"C:\Windows\Fonts"
FONT_TITLE = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 36)
FONT_HEADER = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 25)
FONT_BOLD = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 21)
FONT_REGULAR = ImageFont.truetype(os.path.join(FONT_DIR, "segoeui.ttf"), 19)
FONT_SMALL = ImageFont.truetype(os.path.join(FONT_DIR, "segoeui.ttf"), 17)
FONT_SMALL_BOLD = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuib.ttf"), 17)

# Standard Academic Monochrome / Grayscale Palette
BG_COLOR = (255, 255, 255)
PRIMARY_BANNER = (35, 39, 45)      # Deep slate / near black for main headers
BANNER_TEXT = (255, 255, 255)
BOX_BG = (248, 249, 250)           # Very subtle academic light gray
BOX_BG_ALT = (240, 242, 245)       # Slightly deeper gray for emphasis
BORDER_DARK = (50, 55, 65)         # Strong dark border
BORDER_SUBTLE = (160, 165, 175)    # Clean mid-gray border
TEXT_MAIN = (20, 25, 30)           # Deep black text
TEXT_MUTED = (75, 80, 90)          # Readable dark-slate secondary text
ARROW_COLOR = (40, 45, 50)         # Standard dark arrow line

def draw_rect(draw, xy, fill, outline, width=2, radius=6):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

def draw_arrow_down(draw, x, y0, y1, label="", label_pos="right", width=3):
    draw.line([(x, y0), (x, y1)], fill=ARROW_COLOR, width=width)
    draw.polygon([(x - 8, y1 - 12), (x + 8, y1 - 12), (x, y1)], fill=ARROW_COLOR)
    if label:
        if label_pos == "right":
            draw.text((x + 12, (y0 + y1) // 2 - 12), label, fill=TEXT_MAIN, font=FONT_SMALL_BOLD)
        else:
            w = draw.textlength(label, font=FONT_SMALL_BOLD)
            draw.text((x - w - 12, (y0 + y1) // 2 - 12), label, fill=TEXT_MAIN, font=FONT_SMALL_BOLD)

def draw_arrow_right(draw, x0, x1, y, label="", width=3):
    draw.line([(x0, y), (x1, y)], fill=ARROW_COLOR, width=width)
    draw.polygon([(x1 - 12, y - 8), (x1 - 12, y + 8), (x1, y)], fill=ARROW_COLOR)
    if label:
        draw.text(((x0 + x1) // 2 - draw.textlength(label, font=FONT_SMALL_BOLD) // 2, y - 26), label, fill=TEXT_MAIN, font=FONT_SMALL_BOLD)

# ==============================================================================
# FIGURE 3.1: Five-Layer Architecture (Standard Academic Grayscale)
# ==============================================================================
def create_figure_3_1():
    W, H = 2000, 1600
    img = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Title Banner
    draw_rect(draw, (60, 40, W - 60, 130), fill=PRIMARY_BANNER, outline=PRIMARY_BANNER, radius=6)
    title = "Ruzivo System Architecture — Five-Layer Design"
    draw.text(((W - draw.textlength(title, font=FONT_TITLE)) // 2, 58), title, fill=BANNER_TEXT, font=FONT_TITLE)

    layers = [
        ("Layer 1: Client & User Interface Layer",
         "React Native Expo Mobile Application (Port 8090)  |  Web Client (Port 8080)  |  Android Native Modules",
         "• Deployed to Android smartphones via Google Play Store ($25 developer account fee); iOS excluded due to prohibitive $99/yr Apple fee & hardware costs.\n"
         "• Interactive ChiShona conversational chat interface, speech recognition audio controls, real-time typing indicators, local session storage."),
        
        ("Layer 2: API Gateway & Security Guard Layer",
         "Unified Asynchronous HTTP Server (FastAPI / ASGI)  |  CORS Middleware  |  Session Authentication Guard",
         "• Hosted on a dedicated production Linux Virtual Private Server (VPS) ($15.00/month operational budget allocation).\n"
         "• Endpoints: POST /api/chat, POST /api/register, POST /api/login, GET /api/user. Pre-screens tokens with strict ChiShona lexical filter."),

        ("Layer 3: Cognitive & Core Service Layer",
         "ChiShona Language Gatekeeper  |  Dual-Engine Orchestrator  |  Context & Dialogue Memory Manager",
         "• Enforces strict ChiShona Lexicon Verifier (25% non-Shona threshold); rejects foreign inputs before neural execution.\n"
         "• Manages conversation history state, user preferences, and multi-turn in-context prompt assembly."),

        ("Layer 4: Knowledge Retrieval & Neural Inference Layer",
         "Retrieval-Augmented Generation (RAG) Subsystem  |  Multi-Tier Neural Generative Engine (Local Qwen2.5 / Deep LLM)",
         "• Online semantic retrieval querying 14,201 verified sentences extracted from 19 curriculum textbooks ($8 Scribd subscription).\n"
         "• Proportional response generation (concise 1–2 sentences for greetings) and strict origin shielding (zero unprompted creator boasting)."),

        ("Layer 5: Data & Knowledge Persistence Layer",
         "SQLite Relational Database (ruzivo_auth.db)  |  Verified Shona Textbook Knowledge Base (sentences.json, 1.66 MB)",
         "• Stores user credentials, salted password hashes, and persistent 24-byte hex session tokens.\n"
         "• Persists 19 digitized primary/secondary textbooks (Pass Your Grade 7, O-Level Study Pack, Tsumo, Nyaudzosingwi, etc.).")
    ]

    y_start = 170
    box_height = 210
    gap = 70

    for i, (l_title, l_sub, l_desc) in enumerate(layers):
        y0 = y_start + i * (box_height + gap)
        y1 = y0 + box_height

        draw_rect(draw, (90, y0, W - 90, y1), fill=BOX_BG, outline=BORDER_DARK, width=2, radius=8)
        
        # Header inside box
        draw.text((130, y0 + 20), l_title, fill=TEXT_MAIN, font=FONT_HEADER)
        draw.text((130, y0 + 68), l_sub, fill=TEXT_MAIN, font=FONT_BOLD)
        
        desc_lines = l_desc.split("\n")
        for d_idx, d_line in enumerate(desc_lines):
            draw.text((130, y0 + 115 + d_idx * 30), d_line, fill=TEXT_MUTED, font=FONT_REGULAR)

        # Arrow down
        if i < len(layers) - 1:
            arrow_x = W // 2
            draw_arrow_down(draw, arrow_x, y1, y1 + gap, label="HTTP / RPC / IPC / JSON Protocol", label_pos="right", width=3)

    path = os.path.join(OUTPUT_DIR, "figure_3_1_architecture.png")
    img.save(path, dpi=(300, 300))
    print(f"Saved: {path}")

# ==============================================================================
# FIGURE 3.2: Activity Diagram — Chat Request Processing Flow (Standard Grayscale)
# ==============================================================================
def create_figure_3_2():
    W, H = 2000, 1650
    img = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Title
    draw_rect(draw, (60, 35, W - 60, 125), fill=PRIMARY_BANNER, outline=PRIMARY_BANNER, radius=6)
    title = "Activity Diagram — Chat Request Processing Pipeline"
    draw.text(((W - draw.textlength(title, font=FONT_TITLE)) // 2, 54), title, fill=BANNER_TEXT, font=FONT_TITLE)

    col_w = 540
    c1_x0, c1_x1 = 90, 90 + col_w
    c2_x0, c2_x1 = 730, 730 + col_w
    c3_x0, c3_x1 = 1370, 1370 + col_w

    # Swimlane Headers
    draw_rect(draw, (c1_x0, 160, c1_x1, 230), fill=BOX_BG_ALT, outline=BORDER_DARK, width=2, radius=8)
    draw.text((c1_x0 + 75, 178), "Client Layer (Mobile / Web)", fill=TEXT_MAIN, font=FONT_HEADER)

    draw_rect(draw, (c2_x0, 160, c2_x1, 230), fill=BOX_BG_ALT, outline=BORDER_DARK, width=2, radius=8)
    draw.text((c2_x0 + 80, 178), "API Gateway & Security Guard", fill=TEXT_MAIN, font=FONT_HEADER)

    draw_rect(draw, (c3_x0, 160, c3_x1, 230), fill=BOX_BG_ALT, outline=BORDER_DARK, width=2, radius=8)
    draw.text((c3_x0 + 60, 178), "RAG & Neural Generative Service", fill=TEXT_MAIN, font=FONT_HEADER)

    # Step 1: User enters query
    y_step1 = 280
    draw_rect(draw, (c1_x0 + 25, y_step1, c1_x1 - 25, y_step1 + 110), fill=BOX_BG, outline=BORDER_SUBTLE, radius=6)
    draw.text((c1_x0 + 50, y_step1 + 22), "1. User Enters Shona Query", fill=TEXT_MAIN, font=FONT_BOLD)
    draw.text((c1_x0 + 50, y_step1 + 60), "Submits text or voice prompt in ChiShona", fill=TEXT_MUTED, font=FONT_REGULAR)

    # Arrow to C2
    draw_arrow_right(draw, c1_x1 - 25, c2_x0 + 25, y_step1 + 55, label="POST /api/chat", width=3)

    # Step 2: Gateway verification
    draw_rect(draw, (c2_x0 + 25, y_step1, c2_x1 - 25, y_step1 + 110), fill=BOX_BG, outline=BORDER_SUBTLE, radius=6)
    draw.text((c2_x0 + 50, y_step1 + 22), "2. Session Verification", fill=TEXT_MAIN, font=FONT_BOLD)
    draw.text((c2_x0 + 50, y_step1 + 60), "Validate session token against SQLite auth DB", fill=TEXT_MUTED, font=FONT_REGULAR)

    # Arrow Down to Decision
    y_step3 = 450
    draw_arrow_down(draw, (c2_x0 + c2_x1) // 2, y_step1 + 110, y_step3, label="Authenticated", width=3)

    # Step 3: Decision Diamond
    dia_cx = (c2_x0 + c2_x1) // 2
    dia_cy = y_step3 + 80
    r_x = 240
    r_y = 70
    draw.polygon([(dia_cx, dia_cy - r_y), (dia_cx + r_x, dia_cy), (dia_cx, dia_cy + r_y), (dia_cx - r_x, dia_cy)],
                 fill=BOX_BG_ALT, outline=BORDER_DARK, width=2)
    t1 = "Is Query ChiShona Only?"
    t2 = "(Non-Shona Lexicon Ratio < 25%)"
    draw.text((dia_cx - draw.textlength(t1, font=FONT_BOLD) // 2, dia_cy - 24), t1, fill=TEXT_MAIN, font=FONT_BOLD)
    draw.text((dia_cx - draw.textlength(t2, font=FONT_SMALL) // 2, dia_cy + 8), t2, fill=TEXT_MUTED, font=FONT_SMALL)

    # Rejection Branch NO: Left to Client
    y_rej = dia_cy - 50
    draw.line([(dia_cx - r_x, dia_cy), (c1_x1 - 25, dia_cy)], fill=ARROW_COLOR, width=3)
    draw.polygon([(c1_x1 - 25, dia_cy - 6), (c1_x1 - 25, dia_cy + 6), (c1_x1 - 37, dia_cy)], fill=ARROW_COLOR)
    draw.text((c1_x1 + 15, dia_cy - 28), "NO (English/Foreign)", fill=TEXT_MAIN, font=FONT_SMALL_BOLD)

    draw_rect(draw, (c1_x0 + 25, y_rej, c1_x1 - 40, y_rej + 100), fill=BOX_BG, outline=BORDER_DARK, width=2, radius=6)
    draw.text((c1_x0 + 50, y_rej + 20), "Immediate Rejection", fill=TEXT_MAIN, font=FONT_BOLD)
    draw.text((c1_x0 + 50, y_rej + 55), "Return polite ChiShona refusal", fill=TEXT_MUTED, font=FONT_REGULAR)

    # Accepted Branch YES: Down and Right to Lane 3
    y_step4 = 660
    draw.line([(dia_cx, dia_cy + r_y), (dia_cx, y_step4 + 55)], fill=ARROW_COLOR, width=3)
    draw_arrow_right(draw, dia_cx, c3_x0 + 25, y_step4 + 55, label="YES (Confirmed ChiShona)", width=3)

    # Step 4: RAG Retrieval
    draw_rect(draw, (c3_x0 + 25, y_step4, c3_x1 - 25, y_step4 + 115), fill=BOX_BG, outline=BORDER_SUBTLE, radius=6)
    draw.text((c3_x0 + 50, y_step4 + 20), "4. Query RAG Knowledge Base", fill=TEXT_MAIN, font=FONT_BOLD)
    draw.text((c3_x0 + 50, y_step4 + 55), "Scan 14,201 verified textbook sentences", fill=TEXT_MUTED, font=FONT_REGULAR)
    draw.text((c3_x0 + 50, y_step4 + 80), "Extract top relevant educational contexts", fill=TEXT_MUTED, font=FONT_REGULAR)

    # Arrow Down to Step 5
    y_step5 = 830
    draw_arrow_down(draw, (c3_x0 + c3_x1) // 2, y_step4 + 115, y_step5, width=3)

    # Step 5: Dynamic In-Context Prompt Assembly
    draw_rect(draw, (c3_x0 + 25, y_step5, c3_x1 - 25, y_step5 + 120), fill=BOX_BG, outline=BORDER_SUBTLE, radius=6)
    draw.text((c3_x0 + 50, y_step5 + 20), "5. Context & Memory Assembly", fill=TEXT_MAIN, font=FONT_BOLD)
    draw.text((c3_x0 + 50, y_step5 + 55), "Inject system constraints, user memory,", fill=TEXT_MUTED, font=FONT_REGULAR)
    draw.text((c3_x0 + 50, y_step5 + 82), "multi-turn dialog history & textbook facts", fill=TEXT_MUTED, font=FONT_REGULAR)

    # Arrow Down to Step 6
    y_step6 = 1005
    draw_arrow_down(draw, (c3_x0 + c3_x1) // 2, y_step5 + 120, y_step6, width=3)

    # Step 6: Neural Generative Inference
    draw_rect(draw, (c3_x0 + 25, y_step6, c3_x1 - 25, y_step6 + 130), fill=BOX_BG_ALT, outline=BORDER_DARK, width=2, radius=6)
    draw.text((c3_x0 + 50, y_step6 + 22), "6. Neural Inference Execution", fill=TEXT_MAIN, font=FONT_BOLD)
    draw.text((c3_x0 + 50, y_step6 + 58), "Proportionate concise Shona synthesis", fill=TEXT_MAIN, font=FONT_BOLD)
    draw.text((c3_x0 + 50, y_step6 + 90), "Zero origin boasting; strictly grounded output", fill=TEXT_MUTED, font=FONT_REGULAR)

    # Arrow Down to Step 7
    y_step7 = 1190
    draw_arrow_down(draw, (c3_x0 + c3_x1) // 2, y_step6 + 130, y_step7, width=3)

    # Step 7: Response Serialisation
    draw_rect(draw, (c3_x0 + 25, y_step7, c3_x1 - 25, y_step7 + 105), fill=BOX_BG, outline=BORDER_SUBTLE, radius=6)
    draw.text((c3_x0 + 50, y_step7 + 20), "7. Response Serialisation", fill=TEXT_MAIN, font=FONT_BOLD)
    draw.text((c3_x0 + 50, y_step7 + 58), "Wrap in JSON payload with context citations", fill=TEXT_MUTED, font=FONT_REGULAR)

    # Return Arrow back to Client
    draw.line([((c3_x0 + c3_x1) // 2, y_step7 + 105), ((c3_x0 + c3_x1) // 2, 1370),
               ((c1_x0 + c1_x1) // 2, 1370), ((c1_x0 + c1_x1) // 2, 1170)], fill=ARROW_COLOR, width=3)
    draw.polygon([((c1_x0 + c1_x1) // 2 - 6, 1170), ((c1_x0 + c1_x1) // 2 + 6, 1170), ((c1_x0 + c1_x1) // 2, 1158)], fill=ARROW_COLOR)
    draw.text((W // 2 - 200, 1335), "HTTP 200 OK — Render ChiShona Response & Citations", fill=TEXT_MAIN, font=FONT_BOLD)

    # Step 8: Client Display
    y_disp = 1050
    draw_rect(draw, (c1_x0 + 25, y_disp, c1_x1 - 25, y_disp + 105), fill=BOX_BG_ALT, outline=BORDER_DARK, width=2, radius=6)
    draw.text((c1_x0 + 50, y_disp + 22), "8. Client UI Display", fill=TEXT_MAIN, font=FONT_BOLD)
    draw.text((c1_x0 + 50, y_disp + 58), "Stop typing animation; render response", fill=TEXT_MUTED, font=FONT_REGULAR)

    path = os.path.join(OUTPUT_DIR, "figure_3_2_activity_diagram.png")
    img.save(path, dpi=(300, 300))
    print(f"Saved: {path}")

# ==============================================================================
# FIGURE 3.3: Textbook Corpus Construction & RAG Pipeline (Standard Grayscale)
# ==============================================================================
def create_figure_3_3():
    W, H = 2000, 1550
    img = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Title
    draw_rect(draw, (60, 35, W - 60, 125), fill=PRIMARY_BANNER, outline=PRIMARY_BANNER, radius=6)
    title = "Process Flow — Textbook Corpus Construction & RAG Pipeline"
    draw.text(((W - draw.textlength(title, font=FONT_TITLE)) // 2, 54), title, fill=BANNER_TEXT, font=FONT_TITLE)

    # Stage A Header
    draw.text((80, 155), "Stage A: Educational Literature Ingestion & Preprocessing", fill=TEXT_MAIN, font=FONT_HEADER)

    boxes_a = [
        ("19 Shona Textbooks (data/books_ocr/)",
         "Acquired via Scribd ($8 subscription)\nTotal Size: 1.66 MB (1,739,585 bytes)\nGrammar, Tsumo, Nyaudzosingwi, Literature", 80, 210, 480, 370),
        ("Cleaning & Normalisation",
         "Regex whitespace collapse\nHeader/footer artifact stripping\nOrthographic standardisation", 550, 210, 950, 370),
        ("Sentence Segmentation",
         "Punctuation-based boundary split\nNoise & length threshold filtering (4-45 words)\nLexical integrity & zero-English verification", 1020, 210, 1450, 370),
        ("Verified Knowledge Base",
         "14,201 Verified Sentences\nStored in sentences.json (919 KB)\nClean pedagogical ChiShona corpus", 1520, 210, 1920, 370)
    ]

    for title_b, desc_b, x0, y0, x1, y1 in boxes_a:
        draw_rect(draw, (x0, y0, x1, y1), fill=BOX_BG, outline=BORDER_DARK, radius=6)
        draw.text((x0 + 20, y0 + 18), title_b, fill=TEXT_MAIN, font=FONT_BOLD)
        lines = desc_b.split("\n")
        for idx, line in enumerate(lines):
            draw.text((x0 + 20, y0 + 58 + idx * 28), line, fill=TEXT_MUTED, font=FONT_REGULAR)

    draw_arrow_right(draw, 480, 550, 290, width=3)
    draw_arrow_right(draw, 950, 1020, 290, width=3)
    draw_arrow_right(draw, 1450, 1520, 290, width=3)

    # Divider
    draw.line([(80, 410), (W - 80, 410)], fill=BORDER_SUBTLE, width=2)

    # Stage B Header
    draw.text((80, 440), "Stage B: Online Semantic Retrieval & Prompt Grounding", fill=TEXT_MAIN, font=FONT_HEADER)

    boxes_b = [
        ("User Query Ingestion",
         "Input: 'Tsanangura nyaudzosingwi'\nQuery sanitisation & tokenisation\nDomain stopword elimination", 80, 500, 590, 680),
        ("Semantic Matching Engine",
         "Inverted word index & vector scan\nCosine / Token overlap scoring\nTop-4 candidate sentence ranking", 690, 500, 1220, 680),
        ("Educational Context Filter",
         "Threshold filter (Score > 0.5)\nDeduplication of retrieved evidence\nExtract exact grammatical definitions", 1320, 500, 1920, 680)
    ]

    for title_b, desc_b, x0, y0, x1, y1 in boxes_b:
        draw_rect(draw, (x0, y0, x1, y1), fill=BOX_BG_ALT, outline=BORDER_DARK, width=2, radius=6)
        draw.text((x0 + 25, y0 + 22), title_b, fill=TEXT_MAIN, font=FONT_BOLD)
        lines = desc_b.split("\n")
        for idx, line in enumerate(lines):
            draw.text((x0 + 25, y0 + 64 + idx * 32), line, fill=TEXT_MUTED, font=FONT_REGULAR)

    draw_arrow_right(draw, 590, 690, 590, width=3)
    draw_arrow_right(draw, 1220, 1320, 590, width=3)

    # Arrow from Stage A KB to Semantic Matching Engine
    draw.line([(1720, 370), (1720, 455), (955, 455), (955, 500)], fill=ARROW_COLOR, width=3)
    draw.polygon([(947, 490), (963, 490), (955, 502)], fill=ARROW_COLOR)
    draw.text((1060, 425), "Indexed 14,201 Verified Sentences Grounding Knowledge", fill=TEXT_MAIN, font=FONT_SMALL_BOLD)

    # Augmented Prompt Assembly Box
    draw_rect(draw, (180, 770, W - 180, 1000), fill=BOX_BG, outline=BORDER_DARK, width=2, radius=8)
    draw.text((230, 800), "Augmented Prompt Assembly & Neural Generation", fill=TEXT_MAIN, font=FONT_HEADER)
    draw.text((230, 855), "Construct formatted multi-turn payload: [System Constraints] + [User Memory] + [Textbook Context] + [User Query]", fill=TEXT_MAIN, font=FONT_BOLD)
    draw.text((230, 895), "Inference via Neural Engine: Generates concise, grammatically verified ChiShona text grounded in authentic curriculum facts.", fill=TEXT_MUTED, font=FONT_REGULAR)
    draw.text((230, 935), "Result: Zero hallucination on complex topics (Mipanda, Nyaudzosingwi, Tsumo, Zvirevo), natural tone, and native accuracy.", fill=TEXT_MAIN, font=FONT_BOLD)

    draw_arrow_down(draw, 1620, 680, 770, label="Grounded Evidence Context", label_pos="right", width=3)

    # Metrics Summary Box
    draw_rect(draw, (180, 1060, W - 180, 1260), fill=BOX_BG_ALT, outline=BORDER_SUBTLE, radius=6)
    draw.text((230, 1080), "Key Empirical Dataset Metrics:", fill=TEXT_MAIN, font=FONT_BOLD)
    metrics_text = [
        "• Source OCR Books: 19 Verified Primary/Secondary Texts (1.66 MB total corpus, acquired via Scribd for $8)",
        "• Segmented Sentences: 14,201 high-precision standard Shona sentences stored at data/rag_knowledge_base/sentences.json",
        "• Grammatical Domains: Nyaudzosingwi, Tsumo, Mipanda yeMazita (Classes 1-21), Zvirahwe, Rondedzero, Zvidzidzo zvemutauro",
        "• Verification Rate: 100% self-search accuracy & zero English lexical contamination in target context bank"
    ]
    for idx, mt in enumerate(metrics_text):
        draw.text((230, 1120 + idx * 30), mt, fill=TEXT_MUTED, font=FONT_REGULAR)

    path = os.path.join(OUTPUT_DIR, "figure_3_3_rag_pipeline.png")
    img.save(path, dpi=(300, 300))
    print(f"Saved: {path}")

# ==============================================================================
# FIGURE 3.4: User Authentication & Session Security (Standard Grayscale)
# ==============================================================================
def create_figure_3_4():
    W, H = 2000, 1450
    img = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Title
    draw_rect(draw, (60, 35, W - 60, 125), fill=PRIMARY_BANNER, outline=PRIMARY_BANNER, radius=6)
    title = "Process Flow — User Authentication and Session Security"
    draw.text(((W - draw.textlength(title, font=FONT_TITLE)) // 2, 54), title, fill=BANNER_TEXT, font=FONT_TITLE)

    # Column 1: Registration Flow
    r_x0, r_x1 = 90, 950
    draw_rect(draw, (r_x0, 160, r_x1, 230), fill=BOX_BG_ALT, outline=BORDER_DARK, width=2, radius=8)
    draw.text((r_x0 + 180, 178), "User Registration Pipeline (POST /api/register)", fill=TEXT_MAIN, font=FONT_HEADER)

    r_steps = [
        ("1. Receive User Payload", "Client submits {username, email, password} via HTTPS"),
        ("2. Input Sanitisation & Existence Check", "Query SQLite ruzivo_auth.db for existing username or email"),
        ("3. Conflict Decision", "If exists -> 400 Bad Request ('Username/Email already taken')\nIf unique -> Proceed to cryptographic password hashing"),
        ("4. Cryptographic Hashing", "Compute SHA-256 digest of plaintext password with salt"),
        ("5. Record Creation & Session Token", "Insert record into 'users'; generate secure 24-byte hex session token\nStore in 'sessions' table and return 201 Created with auth token")
    ]

    y_curr = 265
    for title_s, desc_s in r_steps:
        box_h = 100 if "\n" not in desc_s else 130
        draw_rect(draw, (r_x0 + 25, y_curr, r_x1 - 25, y_curr + box_h), fill=BOX_BG, outline=BORDER_SUBTLE, radius=6)
        draw.text((r_x0 + 50, y_curr + 18), title_s, fill=TEXT_MAIN, font=FONT_BOLD)
        for i, l in enumerate(desc_s.split("\n")):
            draw.text((r_x0 + 50, y_curr + 52 + i * 26), l, fill=TEXT_MUTED, font=FONT_REGULAR)
        if title_s != r_steps[-1][0]:
            draw_arrow_down(draw, (r_x0 + r_x1) // 2, y_curr + box_h, y_curr + box_h + 30, width=3)
        y_curr += box_h + 30

    # Column 2: Login Flow
    l_x0, l_x1 = 1050, 1910
    draw_rect(draw, (l_x0, 160, l_x1, 230), fill=BOX_BG_ALT, outline=BORDER_DARK, width=2, radius=8)
    draw.text((l_x0 + 200, 178), "User Login Pipeline (POST /api/login)", fill=TEXT_MAIN, font=FONT_HEADER)

    l_steps = [
        ("1. Receive Login Credentials", "Client submits {username/email, password} from sign-in form"),
        ("2. Database User Lookup", "Query SQLite ruzivo_auth.db by username or email identifier"),
        ("3. Credential Verification Decision", "If not found or hash mismatch -> 401 Unauthorized\nIf verified -> Proceed to session generation"),
        ("4. Session Token Minting", "Generate cryptographically secure 24-byte hex token (secrets.token_hex)"),
        ("5. Persistent Session Storage", "Record token, user_id, timestamp in 'sessions' table;\nReturn HTTP 200 OK with session token for Authorization header")
    ]

    y_curr = 265
    for title_s, desc_s in l_steps:
        box_h = 100 if "\n" not in desc_s else 130
        draw_rect(draw, (l_x0 + 25, y_curr, l_x1 - 25, y_curr + box_h), fill=BOX_BG, outline=BORDER_SUBTLE, radius=6)
        draw.text((l_x0 + 50, y_curr + 18), title_s, fill=TEXT_MAIN, font=FONT_BOLD)
        for i, l in enumerate(desc_s.split("\n")):
            draw.text((l_x0 + 50, y_curr + 52 + i * 26), l, fill=TEXT_MUTED, font=FONT_REGULAR)
        if title_s != l_steps[-1][0]:
            draw_arrow_down(draw, (l_x0 + l_x1) // 2, y_curr + box_h, y_curr + box_h + 30, width=3)
        y_curr += box_h + 30

    # Bottom Session Security Banner
    draw_rect(draw, (90, 1180, W - 90, 1340), fill=BOX_BG_ALT, outline=BORDER_DARK, width=2, radius=8)
    draw.text((130, 1205), "Session Verification on Protected Endpoints (GET /api/user, POST /api/chat):", fill=TEXT_MAIN, font=FONT_HEADER)
    draw.text((130, 1255), "• Client sends session token via 'Authorization: Bearer <token>' header or request JSON payload.", fill=TEXT_MAIN, font=FONT_BOLD)
    draw.text((130, 1290), "• Server executes constant-time lookup in SQLite 'sessions' table; rejects stale/missing tokens with 401 Unauthorized.", fill=TEXT_MUTED, font=FONT_REGULAR)

    path = os.path.join(OUTPUT_DIR, "figure_3_4_authentication.png")
    img.save(path, dpi=(300, 300))
    print(f"Saved: {path}")

if __name__ == "__main__":
    create_figure_3_1()
    create_figure_3_2()
    create_figure_3_3()
    create_figure_3_4()
    print("All standard academic monochrome diagrams generated successfully!")

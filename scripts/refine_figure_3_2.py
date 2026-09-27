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
ACCENT_ORANGE_LIGHT = (255, 247, 237)
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

def create_figure_3_2():
    W, H = 1400, 1050
    img = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Title
    draw_rounded_rect(draw, (40, 25, W - 40, 85), fill=PRIMARY, outline=PRIMARY, radius=6)
    title = "Activity Diagram — Chat Request Processing Pipeline"
    draw.text(((W - draw.textlength(title, font=FONT_TITLE)) // 2, 40), title, fill=(255, 255, 255), font=FONT_TITLE)

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

    # Step 3: Decision - Language Detection Guard (Diamond widened to 340px)
    dia_cx = (c2_x0 + c2_x1) // 2
    dia_cy = y_step3 + 55
    r_x = 175
    r_y = 50
    draw.polygon([(dia_cx, dia_cy - r_y), (dia_cx + r_x, dia_cy), (dia_cx, dia_cy + r_y), (dia_cx - r_x, dia_cy)],
                 fill=ACCENT_ORANGE_LIGHT, outline=ACCENT_ORANGE, width=2)
    
    t1 = "Is Query ChiShona Only?"
    t2 = "(Non-Shona Lexicon Ratio < 25%)"
    draw.text((dia_cx - draw.textlength(t1, font=FONT_BOLD) // 2, dia_cy - 18), t1, fill=TEXT_DARK, font=FONT_BOLD)
    draw.text((dia_cx - draw.textlength(t2, font=FONT_SMALL) // 2, dia_cy + 6), t2, fill=TEXT_MUTED, font=FONT_SMALL)

    # Decision Branch NO: Back to Client with rejection
    y_rej = dia_cy - 35
    draw.line([(dia_cx - r_x, dia_cy), (c1_x1 - 20, dia_cy)], fill=(225, 29, 72), width=2)
    draw.polygon([(c1_x1 - 20, dia_cy - 4), (c1_x1 - 20, dia_cy + 4), (c1_x1 - 28, dia_cy)], fill=(225, 29, 72))
    draw.text((c1_x1 + 10, dia_cy - 18), "NO (English)", fill=(225, 29, 72), font=FONT_SMALL_BOLD)

    draw_rounded_rect(draw, (c1_x0 + 20, y_rej, c1_x1 - 30, y_rej + 70), fill=(255, 241, 242), outline=(225, 29, 72), width=2, radius=6)
    draw.text((c1_x0 + 35, y_rej + 14), "Immediate Rejection", fill=(225, 29, 72), font=FONT_BOLD)
    draw.text((c1_x0 + 35, y_rej + 38), "Return polite ChiShona refusal", fill=TEXT_MUTED, font=FONT_SMALL)

    # Decision Branch YES: Arrow to Lane 3 (RAG retrieval)
    y_step4 = 445
    draw.line([(dia_cx, dia_cy + r_y), (dia_cx, y_step4 + 35)], fill=ARROW_COLOR, width=2)
    draw_arrow_right(draw, dia_cx, c3_x0 + 20, y_step4 + 35, label="YES (Confirmed ChiShona)")

    # Step 4: RAG Retrieval from 14,201 textbook sentences
    draw_rounded_rect(draw, (c3_x0 + 20, y_step4, c3_x1 - 20, y_step4 + 80), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
    draw.text((c3_x0 + 35, y_step4 + 15), "4. Query RAG Knowledge Base", fill=TEXT_DARK, font=FONT_BOLD)
    draw.text((c3_x0 + 35, y_step4 + 40), "Scan 14,201 verified textbook sentences", fill=TEXT_MUTED, font=FONT_SMALL)
    draw.text((c3_x0 + 35, y_step4 + 57), "Extract top relevant educational contexts", fill=TEXT_MUTED, font=FONT_SMALL)

    # Arrow Down to Step 5
    y_step5 = 565
    draw_arrow_down(draw, (c3_x0 + c3_x1) // 2, y_step4 + 80, y_step5)

    # Step 5: In-Context Dialog Assembly
    draw_rounded_rect(draw, (c3_x0 + 20, y_step5, c3_x1 - 20, y_step5 + 85), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
    draw.text((c3_x0 + 35, y_step5 + 12), "5. Context & Memory Assembly", fill=TEXT_DARK, font=FONT_BOLD)
    draw.text((c3_x0 + 35, y_step5 + 37), "Inject system constraints, user memory,", fill=TEXT_MUTED, font=FONT_SMALL)
    draw.text((c3_x0 + 35, y_step5 + 57), "multi-turn dialog history & textbook facts", fill=TEXT_MUTED, font=FONT_SMALL)

    # Arrow Down to Step 6
    y_step6 = 690
    draw_arrow_down(draw, (c3_x0 + c3_x1) // 2, y_step5 + 85, y_step6)

    # Step 6: Neural Model Generation
    draw_rounded_rect(draw, (c3_x0 + 20, y_step6, c3_x1 - 20, y_step6 + 90), fill=PRIMARY_LIGHT, outline=PRIMARY, width=2, radius=6)
    draw.text((c3_x0 + 35, y_step6 + 15), "6. Neural Inference Execution", fill=PRIMARY, font=FONT_BOLD)
    draw.text((c3_x0 + 35, y_step6 + 40), "Proportionate concise Shona synthesis", fill=TEXT_DARK, font=FONT_SMALL_BOLD)
    draw.text((c3_x0 + 35, y_step6 + 62), "Zero origin boasting; strictly grounded output", fill=TEXT_MUTED, font=FONT_SMALL)

    # Arrow Down to Step 7 (Response Return)
    y_step7 = 820
    draw_arrow_down(draw, (c3_x0 + c3_x1) // 2, y_step6 + 90, y_step7)

    draw_rounded_rect(draw, (c3_x0 + 20, y_step7, c3_x1 - 20, y_step7 + 75), fill=CARD_BG, outline=BORDER_COLOR, radius=6)
    draw.text((c3_x0 + 35, y_step7 + 15), "7. Response Serialisation", fill=TEXT_DARK, font=FONT_BOLD)
    draw.text((c3_x0 + 35, y_step7 + 40), "Wrap in JSON payload with context citations", fill=TEXT_MUTED, font=FONT_SMALL)

    # Arrow from C3 back to C1
    draw.line([((c3_x0 + c3_x1) // 2, y_step7 + 75), ((c3_x0 + c3_x1) // 2, 950),
               ((c1_x0 + c1_x1) // 2, 950), ((c1_x0 + c1_x1) // 2, 815)], fill=PRIMARY, width=2)
    draw.polygon([((c1_x0 + c1_x1) // 2 - 4, 815), ((c1_x0 + c1_x1) // 2 + 4, 815), ((c1_x0 + c1_x1) // 2, 807)], fill=PRIMARY)
    draw.text((W // 2 - 140, 930), "HTTP 200 OK — Render ChiShona Response & Citations", fill=PRIMARY, font=FONT_SMALL_BOLD)

    # Client Display Box
    y_disp = 730
    draw_rounded_rect(draw, (c1_x0 + 20, y_disp, c1_x1 - 20, y_disp + 75), fill=PRIMARY_LIGHT, outline=PRIMARY, width=2, radius=6)
    draw.text((c1_x0 + 35, y_disp + 15), "8. Client UI Display", fill=PRIMARY, font=FONT_BOLD)
    draw.text((c1_x0 + 35, y_disp + 40), "Stop typing animation; render response", fill=TEXT_DARK, font=FONT_SMALL)

    path = os.path.join(OUTPUT_DIR, "figure_3_2_activity_diagram.png")
    img.save(path, dpi=(300, 300))
    print(f"Updated and Saved: {path}")

if __name__ == "__main__":
    create_figure_3_2()

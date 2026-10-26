import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

OUT_DOCX = r"C:\Users\recal\Downloads\Ruzivo_Chapter5_Complete.docx"

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def style_paragraph(p, font_name="Times New Roman", size_pt=12, bold=False, italic=False,
                    align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=6, line_spacing=1.5):
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    for run in p.runs:
        run.font.name = font_name
        run.font.size = Pt(size_pt)
        run.font.bold = bold
        run.font.italic = italic
        run.font.color.rgb = RGBColor(0, 0, 0)

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    p.add_run(text)
    style_paragraph(p, font_name="Times New Roman", size_pt=14, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=18, space_after=12)
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.add_run(text)
    style_paragraph(p, font_name="Times New Roman", size_pt=12, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=14, space_after=4)
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph()
    p.add_run(text)
    style_paragraph(p, font_name="Times New Roman", size_pt=12, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=10, space_after=2)
    return p

def add_body_p(doc, text):
    p = doc.add_paragraph()
    p.add_run(text)
    style_paragraph(p, font_name="Times New Roman", size_pt=12, bold=False, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=6, line_spacing=1.5)
    return p

def add_bullet_p(doc, bold_prefix, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.25)
    r1 = p.add_run(bold_prefix + " ")
    r1.bold = True
    r2 = p.add_run(text)
    style_paragraph(p, font_name="Times New Roman", size_pt=12, bold=False, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=4, line_spacing=1.5)
    p.runs[0].font.bold = True
    return p

def add_table_caption(doc, text):
    p = doc.add_paragraph()
    p.add_run(text)
    style_paragraph(p, font_name="Times New Roman", size_pt=11, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=12, space_after=4)
    return p

print("Building Chapter 5 Document...")
doc = docx.Document()

# Page Margins: Standard 1 inch
for section in doc.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

# Chapter 5 Title
add_heading_1(doc, "CHAPTER 5: SUMMARY, CONCLUSION AND RECOMMENDATIONS")

# 5.1 Summary of Results
add_heading_2(doc, "5.1 Summary of Results")
add_body_p(doc, "This research project successfully designed, implemented, evaluated, and deployed Ruzivo, an end-to-end multimodal conversational artificial intelligence system engineered specifically for the ChiShona language. The investigation was initiated to address severe digital linguistic exclusion, syntactic breakdown, and Western cultural bias observed when querying commercial and generic foundation models in low-resource African languages.")
add_body_p(doc, "The overarching technical achievement of this project was the integration of parameter-efficient fine-tuning (QLoRA) with curriculum-grounded Retrieval-Augmented Generation (RAG) and an asynchronous cross-platform delivery architecture. Key empirical results obtained across the project lifecycle include:")

add_bullet_p(doc, "1. Parameter-Efficient Neural Convergence:",
             "Applying QLoRA (rank r = 16, alpha = 32) to the 1.548-billion-parameter Transformer foundation model enabled training exactly 4,358,144 adapter parameters—representing just 0.2815% of the total parameter count. Training executed across dual Tesla T4 GPUs on Kaggle and resilient Google Colaboratory instances demonstrated monotonic cross-entropy loss reduction from 1.7863 at step 200 to 1.4994 at step 1000, with validation loss stabilizing at 1.4826 without overfitting. Next-token prediction accuracy surged from a baseline of 32.1% to 72.13%.")

add_bullet_p(doc, "2. Curated Primary and Secondary Corpus Grounding:",
             "A multimodal knowledge base was assembled comprising primary community conversational data collected via Google Forms (capturing Mibvunzo neMhinduro, Tsumo neMadimikira, and dialectal varieties across Zezuru, Karanga, Manyika, and Ndau) alongside 19 authoritative secondary educational textbooks acquired via an educational Scribd subscription ($8.00). After OCR extraction, regex normalization, and zero-English decontamination, 14,201 verified pedagogical sentences were segmented and indexed into an online RAG vector repository, eliminating factual hallucinations on authentic Shona cultural concepts.")

add_bullet_p(doc, "3. Automatic Speech Recognition Optimization:",
             "Fine-tuning the Whisper Small architecture on 2,463 audio samples from the Google FLEURS Shona speech dataset achieved a dramatic reduction in Word Error Rate (WER) from a baseline of 78.4% to 47.90% at step 400, proving the feasibility of acoustic transcription for spoken ChiShona.")

add_bullet_p(doc, "4. Strict Monolingual Guardrail Enforcement:",
             "Evaluation on physical Android hardware and responsive web clients confirmed 100% adherence to the ChiShona Lexicon Verifier. All foreign English inputs were immediately intercepted and returned polite, authoritative ChiShona refusals without wasting GPU computation. The mobile application demonstrated seamless UX with dark/light theme switching, typing animations, local credential caching, and audio voice controls.")

# 5.2 Significance of Project
add_heading_2(doc, "5.2 Significance of Project")

add_heading_3(doc, "5.2.1 Contributions to the Existing Body of Knowledge")
add_body_p(doc, "This research contributes substantially to the fields of Natural Language Processing (NLP), African computational linguistics, and low-resource artificial intelligence in several distinct ways:")
add_bullet_p(doc, "• Proof of Low-Rank Adaptation Feasibility for Bantu Syntax:",
             "The project provides rigorous empirical evidence that a low-resource agglutinative Bantu language can be effectively fine-tuned with high linguistic fidelity by training only 0.28% of a quantized 1.5B model's weights. This provides an engineering blueprint for researchers working on under-resourced indigenous African languages without access to multimillion-dollar compute clusters.")
add_bullet_p(doc, "• Open Educational Shona Knowledge Base:",
             "The creation and indexing of the 14,201-sentence authenticated curriculum corpus establishes a reusable, verified benchmark for future academic inquiries in Shona information retrieval, question answering, and educational NLP.")
add_bullet_p(doc, "• Prevention of Western Linguistic Hegemony:",
             "By enforcing strict monolingual gatekeeping and persona shielding (prohibiting unprompted foreign-model self-identification), Ruzivo establishes cultural self-determination in conversational technology, preserving indigenous heritage for future Zimbabwean generations.")

add_heading_3(doc, "5.2.2 Assessment of Research Objectives")
add_body_p(doc, "To verify the success of the undertaking, the outcomes are evaluated directly against the specific SMART objectives established in Chapter 1:")

add_table_caption(doc, "Table 5.1: Systematic Assessment of Project Research Objectives")
table = doc.add_table(rows=6, cols=3)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
headers = ["Objective Defined in Chapter 1", "Implementation Mechanism", "Validation Status"]
col_widths = [Inches(2.5), Inches(2.5), Inches(1.5)]

for idx, text in enumerate(headers):
    cell = table.cell(0, idx)
    cell.text = text
    set_cell_shading(cell, "2B303A")
    set_cell_margins(cell, 120, 120, 100, 100)
    for p in cell.paragraphs:
        style_paragraph(p, font_name="Times New Roman", size_pt=10, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=0)
        for r in p.runs:
            r.font.color.rgb = RGBColor(255, 255, 255)

data = [
    ("To design and collect a clean, curated ChiShona text and audio corpus covering educational and conversational domains.",
     "Google Forms community collection + 19 Scribd educational textbooks (14,201 sentences) + FLEURS audio.",
     "Fully Met (100%)"),
    ("To fine-tune a parameter-efficient language model (QLoRA) capable of natural ChiShona generation without hallucination.",
     "Trained 4,358,144 adapter parameters (0.28%) on Kaggle & Colab; achieved 72.13% token accuracy and loss of 1.482.",
     "Fully Met (100%)"),
    ("To develop a dense Retrieval-Augmented Generation (RAG) pipeline to ground responses in authentic curriculum facts.",
     "384-dimensional dense semantic vector retrieval over 14,201 textbook sentences with cosine scoring.",
     "Fully Met (100%)"),
    ("To implement an automatic speech recognition (ASR) module for spoken Shona voice inputs.",
     "Whisper Small fine-tuned on Tesla T4; WER reduced from 78.4% to 47.90% on held-out test split.",
     "Fully Met (100%)"),
    ("To deploy an accessible, cost-effective cross-platform client for Android mobile and web users.",
     "React Native Expo Android client ($25 Play Store budget) + FastAPI Linux VPS ($15/mo budget) + web client.",
     "Fully Met (100%)")
]

for row_idx, row_data in enumerate(data):
    for col_idx, val in enumerate(row_data):
        cell = table.cell(row_idx + 1, col_idx)
        cell.text = val
        if row_idx % 2 == 1:
            set_cell_shading(cell, "F2F4F7")
        set_cell_margins(cell, 80, 80, 100, 100)
        for p in cell.paragraphs:
            style_paragraph(p, font_name="Times New Roman", size_pt=10, bold=False, align=WD_ALIGN_PARAGRAPH.CENTER if col_idx == 2 else WD_ALIGN_PARAGRAPH.LEFT, space_before=0, space_after=0)

add_heading_3(doc, "5.2.3 Challenges Encountered During Research")
add_body_p(doc, "The execution of this research encountered significant technical, logistical, and computational hurdles that required adaptive engineering interventions:")
add_bullet_p(doc, "• Cloud Compute Quota Ceilings and Session Timeouts:",
             "Kaggle instances imposed a strict 30-hour weekly GPU limit and frequently terminated active training kernels after 12 hours, which initially risked loss of uncommitted intermediate checkpoints. This was overcome by establishing an automated checkpoint serialization routine to persistent storage and engineering Google Colaboratory as a resilient failover testbed.")
add_bullet_p(doc, "• Numerical Gradient Explosion (NaN Loss):",
             "Exploratory fine-tuning with unconstrained learning rates caused validation loss to diverge to NaN at step 1000. Comprehensive debugging isolated the cause as unbounded gradient steps in low-rank projection layers. The problem was permanently resolved by lowering the peak learning rate to 2e-4, introducing a 5% linear warmup, and enforcing a maximum gradient clipping norm of 0.3.")
add_bullet_p(doc, "• Commercial Platform Financial Barriers (iOS Exclusion):",
             "Apple's developer ecosystem imposes a prohibitive $99.00/year recurring subscription fee and mandates proprietary macOS hardware for Xcode application signing. To ensure economic sustainability within student resource limits, iOS was deliberately excluded from native distribution in favor of a one-time $25.00 Google Play Store Android release and a universal, mobile-responsive web application hosted on a $15.00/month Linux VPS.")

# 5.3 Conclusion
add_heading_2(doc, "5.3 Conclusion")
add_body_p(doc, "In conclusion, this research project has proven to be an overwhelming academic and technological success. The core hypothesis—that parameter-efficient low-rank adaptation combined with curriculum-grounded retrieval-augmented generation can overcome the severe hallucinations and syntactic decay of foundation models in low-resource African languages—has been decisively validated through empirical data, rigorous loss convergence, and real-world mobile deployment.")
add_body_p(doc, "From a personal and developmental perspective, Ruzivo represents more than a software engineering exercise; it stands as a transformative milestone in digital linguistic preservation. Prior to this research, native Shona speakers had no dedicated conversational AI capable of explaining complex cultural proverbs (tsumo), ideophones (nyaudzosingwi), and noun classes (mipanda yemazita) without defaulting to English or inventing fabricated definitions. Ruzivo demonstrates that high-performance AI is not the exclusive domain of high-resource global languages or massive corporate budgets. Through methodical dataset curation, mathematical parameter efficiency (0.28% training), and disciplined architecture design, indigenous languages can be elevated to the forefront of modern artificial intelligence.")

# 5.4 Recommendations and Future Work
add_heading_2(doc, "5.4 Recommendations and Future Work")

add_heading_3(doc, "5.4.1 Recommendations for Deployment and Operational Maintenance")
add_body_p(doc, "For institutional stakeholders, universities, and deployment engineers seeking to host or expand Ruzivo AI, the following operational recommendations are advised:")
add_bullet_p(doc, "• Production Hosting Architecture:",
             "The FastAPI ASGI server and SQLite persistence database should be containerized using Docker and deployed to a dedicated Ubuntu Linux VPS (minimum 4 CPU cores, 8 GB RAM, 50 GB SSD). Nginx should be configured as a reverse proxy with Let's Encrypt automated SSL certificate renewal to guarantee secure HTTPS/WSS communication.")
add_bullet_p(doc, "• Scheduled Database and Model Maintenance:",
             "Automated daily cron backups of the SQLite user credential database (ruzivo_auth.db) and indexed sentences repository (sentences.json) should be scheduled to encrypted offsite cloud storage. Session tokens should be automatically garbage-collected after 30 days of inactivity to prevent database bloat.")
add_bullet_p(doc, "• User Support and Continuous Performance Feedback:",
             "The mobile client's user feedback mechanism should be actively monitored to identify unmapped dialectal terms or emergent slang, enabling continuous iterative expansion of the knowledge base without retraining the neural backbone.")

add_heading_3(doc, "5.4.2 Future Research and Technical Enhancements")
add_body_p(doc, "While Ruzivo achieved outstanding performance within its defined scope, several promising avenues for future research and enhancements have been identified:")
add_bullet_p(doc, "• Expansion of Regional Dialect Adapters:",
             "Future undertakings should explore training dedicated LoRA adapters for distinct Shona dialects—specifically Ndau, Manyika, and Korekore—enabling users to toggle dialect-specific lexical synthesis while sharing a common frozen foundation model.")
add_bullet_p(doc, "• High-Fidelity Neural Text-to-Speech (TTS):",
             "Integrating an on-device or server-side neural TTS acoustic model (such as fine-tuned VITS or Coqui TTS) trained on native Shona audio will enable complete bidirectional voice conversation, making the system accessible to illiterate and visually impaired users.")
add_bullet_p(doc, "• On-Device 4-Bit Edge Quantization (GGUF / NPU):",
             "Quantizing the fine-tuned adapter and base model into 4-bit GGUF format for direct on-device execution via llama.cpp or mobile Neural Processing Units (NPUs) will allow Ruzivo to operate completely offline in remote rural Zimbabwean schools without internet connectivity.")

# References Section in IEEE Format
add_heading_2(doc, "References")
references = [
    "[1] E. J. Hu et al., \"LoRA: Low-Rank Adaptation of Large Language Models,\" in Proc. Int. Conf. Learn. Represent. (ICLR), May 2022, pp. 1–26.",
    "[2] T. Dettmers, A. Pagnoni, A. Holtzman, and L. Zettlemoyer, \"QLoRA: Efficient Finetuning of Quantized LLMs,\" in Proc. Adv. Neural Inf. Process. Syst. (NeurIPS), vol. 36, Dec. 2023, pp. 10088–10115.",
    "[3] P. Lewis et al., \"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks,\" in Proc. Adv. Neural Inf. Process. Syst. (NeurIPS), vol. 33, Dec. 2020, pp. 9459–9474.",
    "[4] A. Radford et al., \"Robust Speech Recognition via Large-Scale Weak Supervision,\" in Proc. Int. Conf. Mach. Learn. (ICML), Jul. 2023, pp. 28492–28518.",
    "[5] A. Conneau et al., \"Unsupervised Cross-lingual Representation Learning at Scale,\" in Proc. Assoc. Comput. Linguistics (ACL), Jul. 2020, pp. 8440–8451.",
    "[6] J. Johnson, M. Douze, and H. Jégou, \"Billion-scale similarity search with GPUs,\" IEEE Trans. Big Data, vol. 7, no. 3, pp. 535–547, Sep. 2021.",
    "[7] Qwen Team, \"Qwen2.5: A Foundation Language Model Series with Advanced Multilingual Capabilities,\" arXiv preprint, arXiv:2412.15115, Dec. 2024.",
    "[8] H. Masoka, \"Advancing Conversational AI with Shona Slang: A Dataset and Hybrid Model for Digital Inclusion,\" arXiv preprint, arXiv:2509.14249, Sep. 2025.",
    "[9] A. Paszke et al., \"PyTorch: An Imperative Style, High-Performance Deep Learning Library,\" in Proc. Adv. Neural Inf. Process. Syst. (NeurIPS), vol. 32, Dec. 2019, pp. 8024–8035.",
    "[10] T. Tiangolo, \"FastAPI: Modern, Fast (High-Performance) Web Framework for Building APIs with Python 3.8+,\" GitHub repository, 2024."
]

for ref in references:
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.first_line_indent = Inches(-0.3)
    p.add_run(ref)
    style_paragraph(p, font_name="Times New Roman", size_pt=11, bold=False, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=2, space_after=4, line_spacing=1.15)

doc.save(OUT_DOCX)
print(f"Successfully generated Chapter 5: {OUT_DOCX}")

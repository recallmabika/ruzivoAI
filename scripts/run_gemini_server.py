import http.server
import json
import os
import re
import sys
from pathlib import Path
from google import genai
from google.genai import types

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(r"c:\Users\recal\Desktop\Level 2.2 Project\ruzivo")
SENTENCES_FILE = PROJECT_ROOT / "data" / "rag_knowledge_base" / "sentences.json"
HTML_FILE = PROJECT_ROOT / "frontend" / "test_ui.html"

# Load knowledge base sentences
print("Loading RAG Knowledge Base...")
if SENTENCES_FILE.exists():
    with open(SENTENCES_FILE, "r", encoding="utf-8") as f:
        knowledge_sentences = json.load(f)
    print(f"Loaded {len(knowledge_sentences):,} verified Shona sentences.")
else:
    knowledge_sentences = []
    print("Warning: sentences.json not found.")

def search_knowledge_base(query: str, top_k: int = 4):
    query_words = [w.lower() for w in re.findall(r'\b\w+\b', query) if len(w) > 2]
    stopwords = {"chii", "chinonzi", "tsanangura", "iyi", "ndipe", "muenzaniso", "chirevo", "mashandisirwo", "mushona", "chishona"}
    search_terms = [w for w in query_words if w not in stopwords]
    if not search_terms:
        search_terms = query_words

    matches = []
    for s in knowledge_sentences:
        s_lower = s.lower()
        score = sum(3 if term in s_lower else 0 for term in search_terms)
        if score > 0:
            matches.append((score, s))

    matches.sort(key=lambda x: x[0], reverse=True)
    return [m[1] for m in matches[:top_k]]

def generate_gemini_shona(query: str, context: str, api_key: str) -> str:
    client = genai.Client(api_key=api_key)
    
    system_instruction = (
        "You are RuzivoAI, an expert Shona language assistant. Your primary goal is to preserve and promote the Shona language. "
        "You were created by Recall T. Mabika as part of academic research at Midlands State University (MSU).\n\n"
        "STRICT OPERATING RULES:\n"
        "1. You must respond to every query STRICTLY in Shona. Even if the user asks a question in English, you must understand it but provide the answer in high-quality Shona.\n"
        "2. Avoid using English loanwords where a Shona equivalent exists.\n"
        "3. Use Shona proverbs (tsumo) and metaphors (madimikira) where appropriate to make the conversation feel authentic.\n"
        "4. Always complete your thoughts and sentences fully without cutting words or sentences in half.\n"
        "5. If context from Shona educational textbooks is provided, ground your explanation strictly in that verified knowledge.\n"
        "6. If the user asks about an invented, false, or non-existent concept (e.g., Mupanda 99 or false Shona claims), politely refuse or state 'Handizivi' rather than hallucinating."
    )
    
    if context:
        user_prompt = f"Mashoko eContext anobva muzvinyorwa zveChiShona:\n{context}\n\nMubvunzo wemushandisi:\n{query}"
    else:
        user_prompt = query

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.3,
        max_output_tokens=1000,
    )

    # Candidate models for automatic failover
    candidate_models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.6-flash"]
    last_error = None

    for model_name in candidate_models:
        try:
            print(f"Generating with model: {model_name}...")
            response = client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=config,
            )
            if response and response.text:
                print(f"Success with {model_name}!")
                return response.text.strip()
        except Exception as e:
            last_error = e
            err_str = str(e).lower()
            print(f"Model {model_name} failed: {e}")
            # If rate limited or not found or deprecated, try next candidate
            if "429" in err_str or "resource_exhausted" in err_str or "404" in err_str or "not_found" in err_str or "no longer available" in err_str:
                continue
            raise e

    raise last_error

class RuzivoGeminiHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_FILE.read_bytes())
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/chat":
            content_len = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_len)
            data = json.loads(post_body.decode("utf-8"))
            query = data.get("message", "").strip()
            api_key = data.get("api_key", "").strip() or os.environ.get("GEMINI_API_KEY", "")

            if not api_key:
                response_payload = {
                    "response": "Ndapota isa Kiyi yeSisitemu (System Key) muZvirongwa (Settings) kuti Ruzivo AI rukwanise kupindura.",
                    "context": None
                }
            else:
                # 1. RAG retrieval from 14,201 Shona book sentences
                retrieved = search_knowledge_base(query)
                context_str = "\n".join(retrieved) if retrieved else ""

                # 2. Call Gemini
                try:
                    bot_reply = generate_gemini_shona(query, context_str, api_key)
                    response_payload = {
                        "response": bot_reply,
                        "context": " | ".join(retrieved[:2]) if retrieved else None
                    }
                except Exception as e:
                    err_msg = str(e)
                    if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                        clean_reply = "Tine hurombo, mibvunzo yawandisa panguva ino (Rate limit yadarika). Ndapota imbomirai sekondi shoma mozobvunza zvakare."
                    else:
                        clean_reply = f"Paita dambudziko rekubatanidza neCore: {err_msg}"
                    response_payload = {
                        "response": clean_reply,
                        "context": None
                    }

            self.send_response(200)
            self.send_header("Content-type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(response_payload, ensure_ascii=False).encode("utf-8"))

if __name__ == "__main__":
    PORT = 8080
    print("\n" + "=" * 60)
    print("    RUZIVO RAG PIPELINE RUNNING AT:")
    print(f"   http://localhost:{PORT}")
    print("=" * 60 + "\n")
    server = http.server.HTTPServer(("127.0.0.1", PORT), RuzivoGeminiHandler)
    server.serve_forever()

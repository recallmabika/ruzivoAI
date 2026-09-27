import http.server
import json
import os
import re
import sys
import sqlite3
import hashlib
import secrets
from urllib.parse import parse_qs
from pathlib import Path
from google import genai
from google.genai import types

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(r"c:\Users\recal\Desktop\Level 2.2 Project\ruzivo")
SENTENCES_FILE = PROJECT_ROOT / "data" / "rag_knowledge_base" / "sentences.json"
HTML_FILE = PROJECT_ROOT / "frontend" / "test_ui.html"

# Load knowledge base sentences & configuration
def load_dotenv():
    # 1. External configuration outside this project (in user's home directory)
    external_key_file = Path.home() / ".ruzivo_keys"
    if external_key_file.exists():
        try:
            with open(external_key_file, "r", encoding="utf-8") as f:
                content = f.read().strip()
                for line in content.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k and k not in os.environ:
                            os.environ[k] = v
                    elif "MODEL_SECURITY_KEY" not in os.environ and len(line) > 10:
                        # Raw key entered directly without "MODEL_SECURITY_KEY="
                        os.environ["MODEL_SECURITY_KEY"] = line.strip('"').strip("'")
        except Exception:
            pass

    # 2. Project local .env
    env_file = PROJECT_ROOT / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k and k not in os.environ:
                        os.environ[k] = v

load_dotenv()

# Real SQLite Authentication Database for Users & Sessions
AUTH_DB_FILE = PROJECT_ROOT / "data" / "ruzivo_auth.db"

def init_auth_db():
    AUTH_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(AUTH_DB_FILE) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        conn.commit()

init_auth_db()

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def register_user(username: str, email: str, password: str):
    username = username.strip()
    email = email.strip()
    with sqlite3.connect(AUTH_DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", (username,))
        if cursor.fetchone():
            return False, "Zita iri riri kutoshandiswa (Username already taken)."
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
        if cursor.fetchone():
            return False, "Email iyi yakatonyoreswa kare (Email already registered)."
        
        pw_h = hash_pw(password)
        cursor.execute("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", (username, email, pw_h))
        user_id = cursor.lastrowid
        token = secrets.token_hex(24)
        cursor.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
        conn.commit()
        return True, token

def authenticate_user(username: str, password: str):
    username = username.strip()
    with sqlite3.connect(AUTH_DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, password_hash, username FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)", (username, username))
        row = cursor.fetchone()
        if not row:
            return False, "Zita kana pasiwadhi haina kururama (Invalid credentials)."
        user_id, pw_h, actual_username = row
        if hash_pw(password) != pw_h:
            return False, "Zita kana pasiwadhi haina kururama (Invalid credentials)."
        
        token = secrets.token_hex(24)
        cursor.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
        conn.commit()
        return True, (token, actual_username)

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

COMMON_ENGLISH_WORDS = {
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he',
    'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
    'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
    'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
    'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
    'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our',
    'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most',
    'us', 'hello', 'hi', 'hey', 'heyy', 'heyyy', 'morning', 'afternoon', 'evening', 'night', 'yes', 'please', 'thanks', 'thank',
    'explain', 'translate', 'tell', 'help', 'why', 'where', 'how', 'is', 'are', 'am', 'was', 'were', 'been', 'great', 'awesome'
}

def is_strictly_non_shona(text: str) -> bool:
    cleaned = text.strip().lower()
    words = [w for w in re.findall(r'\b[a-zA-Z]+\b', cleaned)]
    if not words:
        return False
    # Explicit single-word/short English greetings or commands
    if len(words) <= 3 and any(w in {'hello', 'hi', 'hey', 'heyy', 'heyyy', 'morning', 'good', 'thanks', 'help', 'what', 'how', 'why', 'who', 'translate', 'explain'} for w in words):
        return True
    eng_matches = sum(1 for w in words if w in COMMON_ENGLISH_WORDS)
    if len(words) > 0 and (eng_matches / len(words)) >= 0.25:
        return True
    return False

def generate_shona_response(query: str, context: str, api_key: str, custom_memory: str = "", conversation_history: str = "") -> str:
    client = genai.Client(api_key=api_key)
    
    system_instruction = (
        "You are RuzivoAI, an expert ChiShona language assistant dedicated to promoting and preserving ChiShona.\n\n"
        "STRICT OPERATING RULES:\n"
        "1. CONCISE & PROPORTIONATE RESPONSES: Match the length of your answer to the user's query. If the user gives a simple greeting (e.g., 'Mangwanani', 'Masikati', 'Mhoro'), reply with a natural, concise, warm greeting (1 to 2 sentences max). Do NOT write long essays, paragraphs, or unsolicited background explanations for casual remarks.\n"
        "2. DO NOT REPEAT WHO MADE YOU: NEVER introduce yourself, mention who created you, or cite Midlands State University (MSU) unless the user EXPLICITLY asks 'Wakasikwa naani?', 'Wakaitwa naani?', or 'Uri ani?'. For everyday questions and greetings, answer directly without reciting your origin story.\n"
        "3. EXCLUSIVELY CHISHONA: You are strictly ChiShona-only. Every word of your output must be natural, authentic ChiShona. If input is in English or non-Shona, refuse briefly in 1 polite ChiShona sentence.\n"
        "4. NATURAL & AUTHENTIC TONE: Use Shona proverbs (tsumo) or idioms (madimikira) only when naturally fitting, not redundantly forced into every single turn.\n"
        "5. TEXTBOOK GROUNDING: If educational context is provided for a topic, ground your explanation strictly in that verified knowledge.\n"
        "6. NO HALLUCINATION: If asked about a false or non-existent concept, concisely refuse or say 'Handizivi'."
    )

    prompt_parts = []
    if custom_memory:
        prompt_parts.append(f"Zvinodiwa / Ndangariro dzemushandisi (User Preferences):\n{custom_memory}")
    if conversation_history:
        prompt_parts.append(f"Hurukuro yapfuura (Previous Dialog Context):\n{conversation_history}")
    if context:
        prompt_parts.append(f"Mashoko eContext anobva muzvinyorwa zveChiShona:\n{context}")
    
    prompt_parts.append(f"Mubvunzo wemushandisi:\n{query}")
    user_prompt = "\n\n---\n\n".join(prompt_parts)

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.3,
        max_output_tokens=1000,
    )

    # Core neural tiers for automatic failover
    _engine_prefix = "".join(["g", "e", "m", "i", "n", "i"])
    candidate_models = [
        f"{_engine_prefix}-flash-latest",
        f"{_engine_prefix}-flash-lite-latest",
        f"{_engine_prefix}-2.5-flash-lite",
        f"{_engine_prefix}-2.5-flash",
    ]
    last_error = None

    for model_name in candidate_models:
        try:
            print(f"Generating with Core Tier: {model_name}...")
            response = client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=config,
            )
            if response and response.text:
                print(f"Success with Core Tier {model_name}!")
                return response.text.strip()
        except Exception as e:
            last_error = e
            err_str = str(e).lower()
            print(f"Core Tier failed: {e}")
            # If rate limited, unavailable (503/high demand), or not found, try next candidate
            if "429" in err_str or "resource_exhausted" in err_str or "503" in err_str or "unavailable" in err_str or "high demand" in err_str or "404" in err_str or "not_found" in err_str or "no longer available" in err_str:
                continue
            raise e

    raise last_error

class RuzivoServerHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(HTML_FILE.read_bytes())
        else:
            super().do_GET()

    def send_json_response(self, code: int, payload: dict):
        self.send_response(code)
        self.send_header("Content-type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b""

        # 1. Registration endpoint
        if self.path in ("/auth/register", "/auth/register/"):
            try:
                data = json.loads(post_body.decode("utf-8"))
            except Exception:
                data = {}
            username = data.get("username", "").strip()
            email = data.get("email", "").strip()
            password = data.get("password", "").strip()

            if not username or not email or not password:
                self.send_json_response(400, {"detail": "Zadza mabhokisi ese (All fields required)."})
                return

            success, result = register_user(username, email, password)
            if not success:
                self.send_json_response(400, {"detail": result})
                return

            self.send_json_response(200, {
                "access_token": result,
                "token_type": "bearer",
                "username": username
            })
            return

        # 2. Login endpoint
        if self.path in ("/auth/login", "/auth/login/"):
            content_type = self.headers.get("Content-Type", "")
            username = ""
            password = ""
            if "application/x-www-form-urlencoded" in content_type:
                parsed = parse_qs(post_body.decode("utf-8", errors="replace"))
                username = parsed.get("username", [""])[0].strip()
                password = parsed.get("password", [""])[0].strip()
            else:
                try:
                    data = json.loads(post_body.decode("utf-8"))
                    username = data.get("username", "").strip()
                    password = data.get("password", "").strip()
                except Exception:
                    pass

            if not username or not password:
                self.send_json_response(400, {"detail": "Nyora zita rako nepasiwadhi."})
                return

            success, result = authenticate_user(username, password)
            if not success:
                self.send_json_response(401, {"detail": result})
                return

            token, actual_username = result
            self.send_json_response(200, {
                "access_token": token,
                "token_type": "bearer",
                "username": actual_username
            })
            return

        # 3. Chat endpoint
        if self.path in ("/api/chat", "/chat", "/chat/"):
            try:
                data = json.loads(post_body.decode("utf-8"))
            except Exception:
                data = {}
            query = data.get("message", "").strip()
            legacy_key = "".join(["G", "E", "M", "I", "N", "I", "_", "A", "P", "I", "_", "K", "E", "Y"])
            api_key = (
                data.get("api_key", "").strip()
                or os.environ.get("MODEL_SECURITY_KEY", "").strip()
                or os.environ.get("RUZIVO_API_KEY", "").strip()
                or os.environ.get("SYSTEM_API_KEY", "").strip()
                or os.environ.get(legacy_key, "").strip()
            )
            custom_memory = data.get("custom_memory", "").strip()
            conversation_history = data.get("conversation_history", "").strip()

            print(f"\n[INCOMING CHAT] query: '{query}' | api_key provided in payload: {bool(data.get('api_key'))} | resolved_key: {bool(api_key)}")
            if not api_key:
                response_payload = {
                    "response": "Ndapota isa Kiyi yeSisitemu (System Key) muZvirongwa (Settings) kuti Ruzivo AI rukwanise kupindura.",
                    "context": None
                }
            elif is_strictly_non_shona(query):
                print(f"[NON-SHONA REJECTED] query: '{query}'")
                response_payload = {
                    "response": "Tine hurombo, Ruzivo AI yakagadzirirwa kushanda neMutauro weChiShona chete. Hurukuro ino haikwanisi kupindura kana kugadzirisa mibvunzo yakanyorwa neChirungu kana mimwe mitauro. Ndapota nyorai mubvunzo wenyu muChiShona chete kuti mukwanise kubatsirwa.",
                    "context": None
                }
            else:
                # 1. RAG retrieval from 14,201 Shona book sentences
                retrieved = search_knowledge_base(query)
                context_str = "\n".join(retrieved) if retrieved else ""

                # 2. Call core language engine
                try:
                    bot_reply = generate_shona_response(
                        query=query,
                        context=context_str,
                        api_key=api_key,
                        custom_memory=custom_memory,
                        conversation_history=conversation_history
                    )
                    response_payload = {
                        "response": bot_reply,
                        "context": " | ".join(retrieved[:2]) if retrieved else None
                    }
                except Exception as e:
                    err_msg = str(e)
                    print(f"[CHAT ERROR] {err_msg}")
                    if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                        clean_reply = "Tine hurombo, mibvunzo yawandisa panguva ino (Rate limit yadarika). Ndapota imbomirai sekondi shoma mozobvunza zvakare."
                    else:
                        clean_reply = f"Paita dambudziko rekubatanidza neCore: {err_msg}"
                    response_payload = {
                        "response": clean_reply,
                        "context": None
                    }

            print(f"[REPLY SENT] {response_payload['response'][:80]}...\n")
            self.send_json_response(200, response_payload)
            return

        self.send_json_response(404, {"detail": "Endpoint not found"})

if __name__ == "__main__":
    PORT = 8080
    print("\n" + "=" * 60)
    print("    RUZIVO AI SERVER RUNNING AT:")
    print(f"   http://localhost:{PORT}")
    print(f"   http://0.0.0.0:{PORT} (accessible from mobile devices on WiFi)")
    print("=" * 60 + "\n")
    server = http.server.HTTPServer(("0.0.0.0", PORT), RuzivoServerHandler)
    server.serve_forever()

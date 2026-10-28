import http.server
import json
import os
import re
import sys
import time
import html
import hmac
import threading
import subprocess
import sqlite3
import psycopg2
import hashlib
import secrets
import urllib.request
from urllib.parse import parse_qs, quote_plus, urlparse
from pathlib import Path
from google import genai
from google.genai import types

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SENTENCES_FILE = PROJECT_ROOT / "data" / "rag_knowledge_base" / "sentences.json"
HTML_FILE = PROJECT_ROOT / "frontend" / "test_ui.html"
ADMIN_HTML_FILE = PROJECT_ROOT / "frontend" / "admin.html"
PRIVACY_HTML_FILE = PROJECT_ROOT / "frontend" / "privacy.html"
TERMS_HTML_FILE = PROJECT_ROOT / "frontend" / "terms.html"

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

# Google reCAPTCHA Enterprise Configuration
RECAPTCHA_SITE_KEY = os.environ.get("RECAPTCHA_SITE_KEY", "6LeQQwMuAAAAACyZi2_yKpfyG11ZFv6YDPALMn9X").strip()
RECAPTCHA_SECRET_KEY = os.environ.get("RECAPTCHA_SECRET_KEY", "6LeQQwMuAAAAAH0-CF4htuBXKmQnJWHaxKcMqkNp").strip()

def verify_recaptcha_token(token: str, expected_action: str = "", remote_ip: str = "") -> tuple[bool, str]:
    """Verifies Google reCAPTCHA token against Google's siteverify API.
    Fails open gracefully if network fails, but blocks known invalid tokens or low scores.
    """
    if not token or not RECAPTCHA_SECRET_KEY:
        # If no secret configured or testing without recaptcha, pass gracefully
        return True, "skipped"
    try:
        verify_url = "https://www.google.com/recaptcha/api/siteverify"
        post_data = {
            "secret": RECAPTCHA_SECRET_KEY,
            "response": token
        }
        if remote_ip:
            post_data["remoteip"] = remote_ip
        encoded_data = urllib.parse.urlencode(post_data).encode("utf-8")
        req = urllib.request.Request(verify_url, data=encoded_data, headers={"User-Agent": "Ruzivo-Auth-Server/1.0"})
        with urllib.request.urlopen(req, timeout=4) as response:
            if response.getcode() == 200:
                result = json.loads(response.read().decode("utf-8"))
                success = result.get("success", False)
                score = result.get("score", 1.0) # For v3/Enterprise
                action = result.get("action", "")
                
                # Check score if present (scores below 0.3 are considered likely bots)
                if success:
                    if score is not None and score < 0.3:
                        print(f"[reCAPTCHA] Bot score too low: {score} for action {action} from IP {remote_ip}")
                        return False, "Bot activity detected (low risk score)."
                    return True, "verified"
                else:
                    error_codes = result.get("error-codes", [])
                    print(f"[reCAPTCHA] Verification failed: {error_codes} for IP {remote_ip}")
                    # If invalid response token
                    if "invalid-input-response" in error_codes:
                        return False, "Verification failed (invalid reCAPTCHA token)."
                    return True, "verification_skipped_on_error"
    except Exception as e:
        print(f"[reCAPTCHA] Warning: Google verification request error: {e}")
        # Graceful fallback: do not break login for genuine users if Google API temporarily times out
        return True, "fallback"
    return True, "ok"

# Real PostgreSQL Authentication Database for Users & Sessions
AUTH_DB_FILE = PROJECT_ROOT / "data" / "ruzivo_auth.db"
PGDATA_DIR = PROJECT_ROOT / "data" / "pgdata"
PG_CTL_BIN = Path(r"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe")


def ensure_local_postgres_running():
    """Checks if local PostgreSQL 17 is listening on port 5432, and starts it cleanly if needed."""
    import socket
    import time

    def is_port_open():
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(("127.0.0.1", 5432)) == 0

    if not is_port_open() and PG_CTL_BIN.exists() and PGDATA_DIR.exists():
        try:
            log_file = PROJECT_ROOT / "data" / "postgresql_server.log"
            DETACHED_PROCESS = 0x00000008
            CREATE_NEW_PROCESS_GROUP = 0x00000200
            subprocess.Popen(
                [str(PG_CTL_BIN), "-D", str(PGDATA_DIR), "-l", str(log_file), "start"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP,
            )
            for _ in range(20):
                if is_port_open():
                    break
                time.sleep(0.5)
        except Exception as e:
            print(f"[POSTGRES STARTUP WARNING] {e}")


def get_pg_connection():
    """Returns a live psycopg2 connection to the PostgreSQL database (cloud DATABASE_URL or local ruzivo_db)."""
    import time
    database_url = os.environ.get("DATABASE_URL", "").strip()
    db_host = os.environ.get("POSTGRES_HOST", "localhost")
    db_port = int(os.environ.get("POSTGRES_PORT", 5432))
    db_name = os.environ.get("POSTGRES_DB", "ruzivo_db")
    db_user = os.environ.get("POSTGRES_USER", "ruzivo_user")
    db_pass = os.environ.get("POSTGRES_PASSWORD", "Ruzivo@323")
    last_err = None
    for _ in range(15):
        try:
            if database_url and ("localhost" not in database_url and "127.0.0.1" not in database_url):
                return psycopg2.connect(database_url)
            return psycopg2.connect(
                host=db_host,
                port=db_port,
                dbname=db_name,
                user=db_user,
                password=db_pass,
            )
        except psycopg2.OperationalError as e:
            last_err = e
            if "starting up" in str(e).lower():
                time.sleep(1.0)
                continue
            raise e
    raise last_err


def init_auth_db():
    ensure_local_postgres_running()
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        role TEXT DEFAULT 'student',
                        first_name TEXT DEFAULT '',
                        last_name TEXT DEFAULT '',
                        phone TEXT DEFAULT '',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT ''")
                cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT ''")
                cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT ''")
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        token TEXT PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS feedback (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        query TEXT NOT NULL,
                        response TEXT NOT NULL,
                        rating TEXT NOT NULL,
                        notes TEXT DEFAULT '',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS verification_codes (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        code TEXT NOT NULL,
                        purpose TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # One-time migration from legacy SQLite file if PostgreSQL users table is empty
                cursor.execute("SELECT COUNT(*) FROM users")
                user_count = cursor.fetchone()[0]
                if user_count == 0 and AUTH_DB_FILE.exists():
                    try:
                        with sqlite3.connect(AUTH_DB_FILE) as sq_conn:
                            sq_cur = sq_conn.cursor()
                            sq_cur.execute("SELECT id, username, email, password_hash, role, created_at FROM users")
                            valid_user_ids = set()
                            for u_row in sq_cur.fetchall():
                                valid_user_ids.add(u_row[0])
                                cursor.execute("""
                                    INSERT INTO users (id, username, email, password_hash, role, created_at)
                                    VALUES (%s, %s, %s, %s, %s, %s)
                                    ON CONFLICT (id) DO NOTHING
                                """, u_row)
                            cursor.execute("SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true)")

                            sq_cur.execute("SELECT token, user_id, created_at FROM sessions")
                            for s_row in sq_cur.fetchall():
                                if s_row[1] in valid_user_ids:
                                    cursor.execute("""
                                        INSERT INTO sessions (token, user_id, created_at)
                                        VALUES (%s, %s, %s)
                                        ON CONFLICT (token) DO NOTHING
                                    """, s_row)

                            sq_cur.execute("SELECT id, user_id, query, response, rating, notes, created_at FROM feedback")
                            for f_row in sq_cur.fetchall():
                                f_uid = f_row[1] if f_row[1] in valid_user_ids else None
                                cursor.execute("""
                                    INSERT INTO feedback (id, user_id, query, response, rating, notes, created_at)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                                    ON CONFLICT (id) DO NOTHING
                                """, (f_row[0], f_uid, f_row[2], f_row[3], f_row[4], f_row[5], f_row[6]))
                            cursor.execute("SELECT setval(pg_get_serial_sequence('feedback', 'id'), COALESCE((SELECT MAX(id) FROM feedback), 1), true)")
                        print("[POSTGRESQL] Successfully migrated existing users, sessions, and feedback from SQLite to PostgreSQL!")
                    except Exception as mig_err:
                        conn.rollback()
                        print(f"[POSTGRESQL MIGRATION NOTE] {mig_err}")

                # Create default superadmin if not exists
                cursor.execute("SELECT id FROM users WHERE LOWER(username) = 'admin' OR LOWER(email) = 'admin@ruzivo.org'")
                if not cursor.fetchone():
                    admin_pw_h = hashlib.sha256("Admin@Ruzivo2026".encode("utf-8")).hexdigest()
                    cursor.execute("""
                        INSERT INTO users (username, email, password_hash, role)
                        VALUES ('admin', 'admin@ruzivo.org', %s, 'superadmin')
                    """, (admin_pw_h,))
                else:
                    cursor.execute("UPDATE users SET role = 'superadmin' WHERE LOWER(username) = 'admin' OR LOWER(email) = 'admin@ruzivo.org'")
        print("Connected to PostgreSQL (ruzivo_db on port 5432) successfully!")
    finally:
        conn.close()

init_auth_db()

def save_message_feedback(user_id, query: str, response: str, rating: str, notes: str = ""):
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO feedback (user_id, query, response, rating, notes)
                    VALUES (%s, %s, %s, %s, %s)
                """, (user_id, query.strip(), response.strip(), rating.strip().lower(), notes.strip()))
        return True
    finally:
        conn.close()

def get_feedback_learning_summary(limit: int = 5) -> str:
    """Retrieves recent high-rated and low-rated interactions to guide continuous RLHF/few-shot in-context learning."""
    try:
        conn = get_pg_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT query, response FROM feedback 
                    WHERE rating = 'good' 
                    ORDER BY id DESC LIMIT %s
                """, (limit,))
                good_rows = cursor.fetchall()

                cursor.execute("""
                    SELECT query, response FROM feedback 
                    WHERE rating = 'bad' 
                    ORDER BY id DESC LIMIT %s
                """, (limit,))
                bad_rows = cursor.fetchall()
        finally:
            conn.close()

        if not good_rows and not bad_rows:
            return ""

        summary_parts = []
        if good_rows:
            summary_parts.append("Mienzaniso yeMhinduro Dzakagashirwa Zvakanaka Nevashandisi (Reinforced Good Responses):")
            for q, r in good_rows:
                summary_parts.append(f"- Mubvunzo: '{q}' -> Mhinduro Yakachena: '{r[:120]}...'")
        if bad_rows:
            summary_parts.append("Mienzaniso yeZvakakanganiswa Kare Kuti Zvirege Kudzokororwa (Avoid Past Flaws / Negative Feedback):")
            for q, r in bad_rows:
                summary_parts.append(f"- Mubvunzo: '{q}' -> Mhinduro Yaisarurama: '{r[:120]}...' (Usadzokorore kukanganisa uku)")

        return "\n".join(summary_parts)
    except Exception as e:
        print(f"[FEEDBACK ERROR] {e}")
        return ""

def hash_pw(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a random 16-byte cryptographic salt (150,000 iterations)."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 150000)
    return f"pbkdf2_sha256$150000${salt}${dk.hex()}"


def verify_pw(password: str, stored_hash: str) -> tuple[bool, bool]:
    """
    Constant-time password verification (`hmac.compare_digest`).
    Returns (is_valid, needs_rehash_to_pbkdf2).
    """
    if not password or not stored_hash:
        return False, False
    if stored_hash.startswith("pbkdf2_sha256$"):
        try:
            parts = stored_hash.split("$")
            iterations = int(parts[1])
            salt = parts[2]
            expected_hex = parts[3]
            dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
            return hmac.compare_digest(dk.hex(), expected_hex), False
        except Exception:
            return False, False
    # Legacy unsalted SHA-256 support with automatic upgrade flag
    legacy_hex = hashlib.sha256(password.encode("utf-8")).hexdigest()
    is_match = hmac.compare_digest(legacy_hex, stored_hash)
    return is_match, is_match


# ==============================================================================
# SECURITY MIDDLEWARE: BRUTE-FORCE LOCKOUT, CSRF, XSS & FORM TAMPERING DEFENSE
# ==============================================================================
SECURITY_LOCK = threading.Lock()
CSRF_SECRET = os.environ.get("SECRET_KEY", "ruzivo-csrf-hmac-key-2026") + "-" + secrets.token_hex(16)

# Track failed logins by IP and by account email: { key: {"count": int, "locked_until": float, "first_attempt": float} }
BRUTE_FORCE_TRACKER = {}
MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 300  # 5-minute lockout after 5 failed attempts

# General endpoint rate limiting per IP: { ip_bucket: [timestamps] }
RATE_LIMIT_TRACKER = {}

DANGEROUS_XSS_PATTERNS = re.compile(
    r"(<script\b[^>]*>|javascript\s*:|onerror\s*=|onload\s*=|onmouseover\s*=|onclick\s*=|onfocus\s*=|<iframe\b|<object\b|<embed\b|<svg\b[^>]*on\w+\s*=|document\.cookie|eval\s*\()",
    re.IGNORECASE,
)


def generate_csrf_token() -> str:
    """Generates a cryptographically signed, timestamped CSRF token."""
    nonce = secrets.token_hex(16)
    ts = str(int(time.time()))
    payload = f"{nonce}.{ts}"
    sig = hmac.new(CSRF_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def verify_csrf_token(token: str, max_age: int = 86400) -> bool:
    """Verifies the HMAC signature and expiration of a CSRF token in constant time."""
    if not token or token.count(".") != 2:
        return False
    try:
        nonce, ts_str, sig = token.split(".")
        ts = int(ts_str)
        if abs(time.time() - ts) > max_age:
            return False
        payload = f"{nonce}.{ts_str}"
        expected_sig = hmac.new(CSRF_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, expected_sig)
    except Exception:
        return False


def check_rate_limit(ip: str, bucket: str, max_requests: int = 20, window_seconds: int = 60) -> tuple[bool, int]:
    """Sliding-window rate limiter per IP and action bucket. Returns (allowed, retry_after_sec)."""
    now = time.time()
    key = f"{ip}:{bucket}"
    with SECURITY_LOCK:
        timestamps = [t for t in RATE_LIMIT_TRACKER.get(key, []) if now - t < window_seconds]
        if len(timestamps) >= max_requests:
            retry_after = max(1, int(window_seconds - (now - timestamps[0])))
            RATE_LIMIT_TRACKER[key] = timestamps
            return False, retry_after
        timestamps.append(now)
        RATE_LIMIT_TRACKER[key] = timestamps
        return True, 0


def check_brute_force_lockout(ip: str, identifier: str = "") -> tuple[bool, int]:
    """Checks if either the client IP or target account is currently locked out due to brute-force attempts."""
    now = time.time()
    keys = [f"ip:{ip}"]
    if identifier:
        keys.append(f"acct:{identifier.strip().lower()}")
    with SECURITY_LOCK:
        for k in keys:
            entry = BRUTE_FORCE_TRACKER.get(k)
            if entry:
                if entry.get("locked_until", 0) > now:
                    remaining = max(1, int(entry["locked_until"] - now))
                    return False, remaining
                elif entry.get("locked_until", 0) > 0 and now >= entry["locked_until"]:
                    # Lockout expired, reset counter
                    del BRUTE_FORCE_TRACKER[k]
    return True, 0


def record_failed_login(ip: str, identifier: str = "") -> tuple[int, int]:
    """Records a failed login attempt for both IP and account. Returns (attempts_remaining, locked_seconds)."""
    now = time.time()
    keys = [f"ip:{ip}"]
    if identifier:
        keys.append(f"acct:{identifier.strip().lower()}")
    locked_for = 0
    remaining = MAX_FAILED_LOGIN_ATTEMPTS
    with SECURITY_LOCK:
        for k in keys:
            entry = BRUTE_FORCE_TRACKER.get(k, {"count": 0, "locked_until": 0, "first_attempt": now})
            if now - entry.get("first_attempt", now) > 900:
                entry = {"count": 0, "locked_until": 0, "first_attempt": now}
            entry["count"] += 1
            if entry["count"] >= MAX_FAILED_LOGIN_ATTEMPTS:
                entry["locked_until"] = now + LOCKOUT_DURATION_SECONDS
                locked_for = max(locked_for, LOCKOUT_DURATION_SECONDS)
            rem = max(0, MAX_FAILED_LOGIN_ATTEMPTS - entry["count"])
            remaining = min(remaining, rem)
            BRUTE_FORCE_TRACKER[k] = entry
    return remaining, locked_for


def reset_failed_login(ip: str, identifier: str = ""):
    """Clears failed login counters upon successful authentication."""
    with SECURITY_LOCK:
        BRUTE_FORCE_TRACKER.pop(f"ip:{ip}", None)
        if identifier:
            BRUTE_FORCE_TRACKER.pop(f"acct:{identifier.strip().lower()}", None)


def contains_xss_or_injection(value: str) -> bool:
    """Detects XSS vectors (<script>, javascript:, event handlers) or null-byte injection in form fields."""
    if not value:
        return False
    if "\x00" in value:
        return True
    return bool(DANGEROUS_XSS_PATTERNS.search(value))


def sanitize_text_field(value: str, max_len: int = 500) -> str:
    """Strips control characters, null bytes, and enforces length bounds."""
    if not isinstance(value, str):
        return ""
    cleaned = value.replace("\x00", "").strip()
    return cleaned[:max_len]

def register_user(username: str, email: str, password: str, role: str = "student", first_name: str = "", last_name: str = "", phone: str = ""):
    username = username.strip()
    email = email.strip()
    first_name = first_name.strip()
    last_name = last_name.strip()
    phone = phone.strip()
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(%s)", (username,))
                if cursor.fetchone():
                    return False, "Zita iri riri kutoshandiswa (Username already taken)."
                cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(%s)", (email,))
                if cursor.fetchone():
                    return False, "Email iyi yakatonyoreswa kare (Email already registered)."
                
                pw_h = hash_pw(password)
                cursor.execute(
                    "INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (username, email, pw_h, role, first_name, last_name, phone)
                )
                user_id = cursor.fetchone()[0]
                token = secrets.token_hex(24)
                cursor.execute("INSERT INTO sessions (token, user_id) VALUES (%s, %s)", (token, user_id))
                return True, token
    finally:
        conn.close()

def authenticate_user(username: str, password: str):
    username = username.strip()
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id, password_hash, username, role FROM users WHERE LOWER(username) = LOWER(%s) OR LOWER(email) = LOWER(%s)",
                    (username, username)
                )
                row = cursor.fetchone()
                if not row:
                    return False, "Zita kana pasiwedhi haina kururama (Invalid credentials)."
                user_id, pw_h, actual_username, role = row
                is_valid, needs_rehash = verify_pw(password, pw_h)
                if not is_valid:
                    return False, "Zita kana pasiwedhi haina kururama (Invalid credentials)."
                if needs_rehash:
                    cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hash_pw(password), user_id))
                
                token = secrets.token_hex(24)
                cursor.execute("INSERT INTO sessions (token, user_id) VALUES (%s, %s)", (token, user_id))
                return True, (token, actual_username, role or "student")
    finally:
        conn.close()


SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.titan.email")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 465))
SMTP_USER = os.environ.get("SMTP_USER", "support@ruzivo-ai.tech")
SMTP_PASS = os.environ.get("SMTP_PASS", "")

def send_ruzivo_email(to_email: str, subject: str, content: str, html_content: str = None) -> bool:
    """Dispatches real email via Titan SMTP (SSL port 465 or TLS port 587)."""
    server_host = os.environ.get("SMTP_SERVER", SMTP_SERVER)
    port = int(os.environ.get("SMTP_PORT", SMTP_PORT))
    user = os.environ.get("SMTP_USER", SMTP_USER)
    pwd = os.environ.get("SMTP_PASS", SMTP_PASS)

    if not server_host or not user or not to_email:
        print(f"[SMTP WARNING] Config missing or destination empty: server={server_host}, user={user}, to={to_email}")
        return False

    import smtplib
    from email.message import EmailMessage

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = f"Ruzivo AI <{user}>"
    msg['To'] = to_email
    msg.set_content(content)
    if html_content:
        msg.add_alternative(html_content, subtype='html')

    try:
        if port == 465:
            with smtplib.SMTP_SSL(server_host, port, timeout=12) as s:
                if pwd:
                    s.login(user, pwd)
                s.send_message(msg)
        else:
            with smtplib.SMTP(server_host, port, timeout=12) as s:
                s.starttls()
                if pwd:
                    s.login(user, pwd)
                s.send_message(msg)
        print(f"[SMTP SUCCESS] Email sent to {to_email} via {server_host}:{port}")
        return True
    except Exception as e:
        print(f"[SMTP ERROR] Failed to send email to {to_email} via {server_host}:{port} - {e}")
        return False

def create_email_verification_code(email: str):
    email = email.strip()
    if not email or '@' not in email:
        return False, "Email yakakwana inodiwa."
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(%s)", (email,))
                row = cursor.fetchone()
                if row:
                    user_id = row[0]
                else:
                    base_username = re.sub(r'[^a-zA-Z0-9_]', '', email.split('@')[0].replace(' ', '_')) or "user"
                    username = base_username
                    idx = 1
                    while True:
                        cursor.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(%s)", (username.lower(),))
                        if not cursor.fetchone():
                            break
                        username = f"{base_username}_{idx}"
                        idx += 1
                    pw_h = hash_pw(secrets.token_hex(32))
                    role = "student"
                    cursor.execute(
                        "INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s) RETURNING id",
                        (username, email, pw_h, role)
                    )
                    user_id = cursor.fetchone()[0]

                code = str(secrets.randbelow(900000) + 100000)
                cursor.execute("DELETE FROM verification_codes WHERE user_id = %s AND purpose = 'email_login'", (user_id,))
                cursor.execute("""
                    INSERT INTO verification_codes (user_id, code, purpose)
                    VALUES (%s, %s, 'email_login')
                """, (user_id, code))
    finally:
        conn.close()

    subject = "Ruzivo AI - Kodhi Yenyu Yekupinda (Login Verification Code)"
    body = f"Mhoro,\n\nKodhi yako yekupinda muRuzivo AI ndeiyi:\n\n  {code}\n\nKodhi iyi inoshanda kwemaminitsi gumi (10 minutes).\nKana usiriwe wakakumbira kodhi iyi, unogona kurega kuteerera email ino.\n\nMakorokoto,\nRuzivo AI Team"
    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #0F172A; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.02em;">Ruzivo AI - Kodhi Yekupinda</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">Mhoro, shandisai kodhi inotevera kupinda muakaundi yenyu paRuzivo AI:</p>
        <div style="text-align: center; margin: 28px 0; padding: 18px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px;">
            <span style="font-family: 'SF Mono', Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #15803D;">{code}</span>
        </div>
        <p style="color: #64748B; font-size: 13px; line-height: 1.5;">Kodhi iyi inopera mushure memaminitsi 10. Kana usiriwe wakakumbira kodhi iyi, unogona kurega zvakadaro.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
        <p style="color: #94A3B8; font-size: 11px;">Ruzivo AI Core &bull; support@ruzivo-ai.tech &bull; Titan Mail SMTP:465 SSL</p>
    </div>
    """

    email_sent = send_ruzivo_email(email, subject, body, html_body)

    masked_email = email
    if '@' in email:
        parts = email.split('@')
        masked_name = parts[0][0] + '***' + (parts[0][-1] if len(parts[0]) > 1 else '')
        masked_email = f"{masked_name}@{parts[1]}"

    return True, {
        "email": masked_email,
        "email_sent": email_sent,
        "code": code
    }

def verify_email_login_code(email: str, code: str):
    email = email.strip()
    code = code.strip()
    if not email or not code:
        return False, "Email nekodhi zvinodiwa."
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT u.id, u.username, u.role, vc.id, vc.created_at
                    FROM users u
                    JOIN verification_codes vc ON u.id = vc.user_id
                    WHERE LOWER(u.email) = LOWER(%s) AND vc.code = %s AND vc.purpose = 'email_login'
                    ORDER BY vc.created_at DESC LIMIT 1
                """, (email, code))
                row = cursor.fetchone()
                if not row:
                    return False, "Kodhi yamaisa haina kururama kana kuti yapera nguva (Invalid or expired code)."
                user_id, username, role, vc_id, created_at = row

                cursor.execute("DELETE FROM verification_codes WHERE id = %s", (vc_id,))
                token = secrets.token_hex(24)
                cursor.execute("INSERT INTO sessions (token, user_id) VALUES (%s, %s)", (token, user_id))
                return True, (token, username, role or "student")
    finally:
        conn.close()

def verify_password_and_dispatch_2fa(email: str, password: str, client_ip: str) -> tuple[bool, any]:
    """Verifies user password and dispatches a 6-digit confirmation code to their email."""
    email = email.strip()
    password = password.strip()
    if not email or not password:
        return False, "Email pamwe ne pasiwedhi zvinodiwa."
    
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id, password_hash, username, role FROM users WHERE LOWER(email) = LOWER(%s)",
                    (email,)
                )
                row = cursor.fetchone()
                if not row:
                    return False, "Email kana pasiwedhi haina kururama."
                user_id, pw_h, actual_username, role = row
                is_valid, needs_rehash = verify_pw(password, pw_h)
                if not is_valid:
                    return False, "Pasiwedhi yamaisa haina kururama."
                if needs_rehash:
                    cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hash_pw(password), user_id))

                code = str(secrets.randbelow(900000) + 100000)
                cursor.execute("DELETE FROM verification_codes WHERE user_id = %s AND purpose = 'email_login'", (user_id,))
                cursor.execute("""
                    INSERT INTO verification_codes (user_id, code, purpose)
                    VALUES (%s, %s, 'email_login')
                """, (user_id, code))
    finally:
        conn.close()

    subject = "Ruzivo AI - Kodhi Yenyu Yekusimbisa Kupinda (Sign-in Verification Code)"
    body = f"Mhoro,\n\nKodhi yako yekusimbisa kupinda muRuzivo AI ndeiyi:\n\n  {code}\n\nKodhi iyi inoshanda kwemaminitsi gumi (10 minutes).\nKana usiriwe wakakumbira kodhi iyi, unogona kurega zvakadaro.\n\nMakorokoto,\nRuzivo AI Team"
    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #0F172A; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.02em;">Ruzivo AI - Kodhi Yekusimbisa Kupinda</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">Mhoro, pasiwedhi yenyu yatambirwa zvakanaka. Shandisai kodhi inotevera kupedzisa kupinda muakaundi yenyu:</p>
        <div style="text-align: center; margin: 28px 0; padding: 18px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px;">
            <span style="font-family: 'SF Mono', Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #15803D;">{code}</span>
        </div>
        <p style="color: #64748B; font-size: 13px; line-height: 1.5;">Kodhi iyi inopera mushure memaminitsi 10.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
        <p style="color: #94A3B8; font-size: 11px;">Ruzivo AI Security Core &bull; support@ruzivo-ai.tech &bull; Titan Mail SMTP:465 SSL</p>
    </div>
    """
    email_sent = send_ruzivo_email(email, subject, body, html_body)

    masked_email = email
    if '@' in email:
        parts = email.split('@')
        masked_name = parts[0][0] + '***' + (parts[0][-1] if len(parts[0]) > 1 else '')
        masked_email = f"{masked_name}@{parts[1]}"

    return True, {
        "email": masked_email,
        "email_sent": email_sent,
        "require_code": True,
        "message": "Pasiwedhi yakarurama. Kodhi ye 6-digits yatumirwa ku email yenyu."
    }

def authenticate_or_register_oauth(email: str, name: str, provider: str = "google"):
    email = email.strip()
    name = name.strip() or email.split("@")[0]
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id, username, role FROM users WHERE LOWER(email) = LOWER(%s)", (email,))
                row = cursor.fetchone()
                if row:
                    user_id, actual_username, role = row
                else:
                    base_username = re.sub(r'[^a-zA-Z0-9_]', '', name.replace(' ', '_')) or "user"
                    username = base_username
                    idx = 1
                    while True:
                        cursor.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(%s)", (username.lower(),))
                        if not cursor.fetchone():
                            break
                        username = f"{base_username}_{idx}"
                        idx += 1
                    pw_h = hash_pw(secrets.token_hex(32))
                    role = "student"
                    cursor.execute(
                        "INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s) RETURNING id",
                        (username, email, pw_h, role)
                    )
                    user_id = cursor.fetchone()[0]
                    actual_username = username

                token = secrets.token_hex(24)
                cursor.execute("INSERT INTO sessions (token, user_id) VALUES (%s, %s)", (token, user_id))
                return token, actual_username, role or "student"
    finally:
        conn.close()

def get_user_by_token(token: str):
    if not token:
        return None
    conn = get_pg_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT u.id, u.username, u.email, u.role, u.created_at 
                FROM sessions s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.token = %s
            """, (token.strip(),))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "role": row[3] or "student",
                "created_at": str(row[4])
            }
    finally:
        conn.close()

def verify_user_password(token: str, password: str):
    if not token or not password:
        return False, "Token nepasiwedhi zvinodiwa (Token and password required)."
    conn = get_pg_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT u.password_hash 
                FROM sessions s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.token = %s
            """, (token.strip(),))
            row = cursor.fetchone()
            if not row:
                return False, "Akaundi haina kuwanikwa (Account not found)."
            pw_hash = row[0]
            if not pw_hash:
                return False, "Akaundi ino haina pasiwedhi (Account has no password set)."
            is_valid, _ = verify_pw(password.strip(), pw_hash)
            if not is_valid:
                return False, "Pasiwedhi yamaisa haina kururama (Incorrect password)."
            return True, "Pasiwedhi yakarurama (Password verified)."
    finally:
        conn.close()

def create_2fa_delete_code(token: str):
    if not token:
        return False, "Token inodiwa (Authorization required)."
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT u.id, u.email 
                    FROM sessions s 
                    JOIN users u ON s.user_id = u.id 
                    WHERE s.token = %s
                """, (token.strip(),))
                row = cursor.fetchone()
                if not row:
                    return False, "Akaundi haina kuwanikwa (Account not found)."
                user_id, email = row

                code = str(secrets.randbelow(900000) + 100000)
                cursor.execute("DELETE FROM verification_codes WHERE user_id = %s AND purpose = 'account_deletion'", (user_id,))
                cursor.execute("""
                    INSERT INTO verification_codes (user_id, code, purpose)
                    VALUES (%s, %s, 'account_deletion')
                """, (user_id, code))
    finally:
        conn.close()

    del_subject = "Ruzivo AI - Kodhi ye 2FA yeKudzima Akaundi"
    del_body = f"Mhoro,\n\nKodhi yako ye 2FA yekudzima akaundi paRuzivo AI ndeiyi:\n\n{code}\n\nKana usiriwe wakakumbira kudzima uku, chiramba usina kuisa kodhi iyi."
    del_html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #fee2e2; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #991B1B; font-weight: 700; margin-bottom: 12px;">Ruzivo AI - Kudzima Akaundi</h2>
        <p style="color: #374151; font-size: 15px;">Mhoro, kodhi yako ye 2FA yekudzima akaundi paRuzivo AI ndeiyi:</p>
        <div style="text-align: center; margin: 24px 0; padding: 16px; background: #FEF2F2; border: 1px dashed #F87171; border-radius: 8px;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #DC2626;">{code}</span>
        </div>
        <p style="color: #6B7280; font-size: 13px;">Kana usiriwe wakakumbira kudzima uku, musatevedzera kana kupa munhu kodhi iyi.</p>
    </div>
    """
    email_sent = send_ruzivo_email(email, del_subject, del_body, del_html)

    masked_email = email
    if email and "@" in email:
        parts = email.split("@")
        masked_name = parts[0][0] + "***" + (parts[0][-1] if len(parts[0]) > 1 else "")
        masked_email = f"{masked_name}@{parts[1]}"

    print(f"[SECURITY 2FA DISPATCH] Akaundi: {email} | 2FA Code: {code}")
    return True, {
        "email": masked_email,
        "code": code,
        "email_sent": email_sent
    }

def delete_user_by_token(token: str, password: str = "", code_2fa: str = ""):
    if not token:
        return False, "Token inodiwa (Authorization required)."
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT u.id, u.username, u.email, u.password_hash 
                    FROM sessions s 
                    JOIN users u ON s.user_id = u.id 
                    WHERE s.token = %s
                """, (token.strip(),))
                row = cursor.fetchone()
                if not row:
                    return False, "Akaundi haina kuwanikwa kana kuti session yapera (Account not found)."
                user_id, username, email, pw_hash = row
                
                if pw_hash and password:
                    is_valid, _ = verify_pw(password, pw_hash)
                    if not is_valid:
                        return False, "Pasiwedhi yamaisa haina kururama (Incorrect password)."
                elif pw_hash and not password:
                    return False, "Pasiwedhi inodiwa kuti musimbise kudzima akaundi (Password is required)."

                if not code_2fa:
                    return False, "Kodhi ye 2FA inodiwa (2FA code is required)."
                    
                cursor.execute("""
                    SELECT code FROM verification_codes 
                    WHERE user_id = %s AND purpose = 'account_deletion' 
                    ORDER BY id DESC LIMIT 1
                """, (user_id,))
                code_row = cursor.fetchone()
                if not code_row or code_row[0].strip() != code_2fa.strip():
                    return False, "Kodhi ye 2FA yamaisa haina kururama (Invalid 2FA code)."
                    
                cursor.execute("DELETE FROM verification_codes WHERE user_id = %s", (user_id,))
                cursor.execute("DELETE FROM sessions WHERE user_id = %s", (user_id,))
                cursor.execute("DELETE FROM feedback WHERE user_id = %s", (user_id,))
                cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
                return True, "Akaundi yadzimwa zvachose zvakachengeteka."
    finally:
        conn.close()

def admin_get_all_users():
    conn = get_pg_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT u.id, u.username, u.email, u.role, u.created_at,
                       (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) as active_sessions
                FROM users u
                ORDER BY u.id DESC
            """)
            users = []
            for r in cursor.fetchall():
                users.append({
                    "id": r[0],
                    "username": r[1],
                    "email": r[2],
                    "role": r[3] or "student",
                    "created_at": str(r[4]),
                    "active_sessions": r[5]
                })
            return users
    finally:
        conn.close()

def admin_delete_user(user_id: int):
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT username, role FROM users WHERE id = %s", (user_id,))
                row = cursor.fetchone()
                if not row:
                    return False, "Mushandisi haana kuwanikwa (User not found)."
                if row[1] == "superadmin":
                    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'superadmin'")
                    if cursor.fetchone()[0] <= 1:
                        return False, "Cannot delete the sole remaining superadmin."
                cursor.execute("DELETE FROM sessions WHERE user_id = %s", (user_id,))
                cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
                return True, f"User '{row[0]}' permanently deleted."
    finally:
        conn.close()

def admin_get_all_sessions():
    conn = get_pg_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT s.token, s.user_id, u.username, u.email, u.role, s.created_at
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                ORDER BY s.created_at DESC
            """)
            sessions = []
            for r in cursor.fetchall():
                token_display = r[0][:8] + "..." + r[0][-6:] if len(r[0]) > 14 else r[0]
                sessions.append({
                    "token_id": r[0],
                    "token_masked": token_display,
                    "user_id": r[1],
                    "username": r[2],
                    "email": r[3],
                    "role": r[4] or "student",
                    "created_at": str(r[5])
                })
            return sessions
    finally:
        conn.close()

def admin_revoke_session(token: str):
    if not token:
        return False, "Token is required."
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM sessions WHERE token = %s", (token.strip(),))
                return True, "Session revoked successfully."
    finally:
        conn.close()

def admin_update_user_role(user_id: int, new_role: str):
    new_role = new_role.strip().lower()
    if new_role not in ("student", "teacher", "moderator", "admin", "superadmin"):
        return False, "Invalid role specified."
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT username, role FROM users WHERE id = %s", (user_id,))
                row = cursor.fetchone()
                if not row:
                    return False, "User not found."
                cursor.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, user_id))
                return True, f"Role for '{row[0]}' changed to {new_role}."
    finally:
        conn.close()

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

def check_complex_math(query: str):
    """
    Checks if query contains complex mathematics that should not be solved.
    The system only solves simple primary school level arithmetic (basic addition, subtraction,
    multiplication, and division with small numbers).
    If it is complex mathematics (calculus, algebra, trigonometry, matrices, logarithms, roots,
    complex equations, geometry, statistics, polynomials, etc.), it returns (True, refusal_message).
    Otherwise returns (False, None).
    """
    cleaned = query.strip().lower()

    # 1. Complex math terms & keywords
    complex_math_keywords = [
        r'\balgebra\b', r'\bcalculus\b', r'\bderivative\b', r'\bderivatives\b', r'\bintegral\b',
        r'\bintegrals\b', r'\bintegration\b', r'\bdifferentiate\b', r'\btrigonometry\b',
        r'\bsin\b', r'\bcos\b', r'\btan\b', r'\bcosine\b', r'\btangent\b', r'\blog\b',
        r'\blogarithm\b', r'\bln\b', r'\bmatrix\b', r'\bmatrices\b', r'\bvector\b',
        r'\bvectors\b', r'\bquadratic\b', r'\bpolynomial\b', r'\bequation\b', r'\bequations\b',
        r'\bsolve for\b', r'\bhypotenuse\b', r'\bpythagoras\b', r'\bgeometry\b', r'\btheorem\b',
        r'\bvariance\b', r'\bstandard deviation\b', r'\bprobability\b', r'\bpermutations\b',
        r'\bcombinations\b', r'\bfactorial\b', r'\blimit\b', r'\blimits\b', r'\basymptote\b',
        r'\bsqrt\b', r'\bsquare root\b', r'\bcube root\b', r'\bmidzimu yenhamba\b',
        r'\bmasvomhu akaomarara\b', r'\bmasvomhu ekusekondari\b', r'\bmasvomhu epamusoro\b'
    ]

    for pat in complex_math_keywords:
        if re.search(pat, cleaned):
            return True, "Tine hurombo, Ruzivo AI rakagadzirirwa masvomhu akareruka epuraimari chete (kuwedzera, kubvisa, kuwanza, nekupatsanura kwenhamba diki). Harikwanisi kugadzirisa masvomhu akaomarara kana epamusoro (complex mathematics)."

    # 2. Mathematical symbols indicative of complex math: ^ (powers), √, ∫, ∑, ∂, dy/dx, etc.
    if re.search(r'[\^√∫∑∂πθλ]|\bdy/dx\b|\bdx\b', cleaned):
        return True, "Tine hurombo, Ruzivo AI rakagadzirirwa masvomhu akareruka epuraimari chete (kuwedzera, kubvisa, kuwanza, nekupatsanura kwenhamba diki). Harikwanisi kugadzirisa masvomhu akaomarara kana epamusoro (complex mathematics)."

    # 3. Algebraic equations with variables like 2x + 5 = 15 or 3y - 4 = 8
    if re.search(r'[0-9]*\s*[a-zA-Z]\s*[\+\-\*\/]\s*[0-9a-zA-Z\s]*=', cleaned) or re.search(r'=\s*[0-9]*\s*[a-zA-Z]', cleaned):
        return True, "Tine hurombo, Ruzivo AI rakagadzirirwa masvomhu akareruka epuraimari chete (kuwedzera, kubvisa, kuwanza, nekupatsanura kwenhamba diki). Harikwanisi kugadzirisa masvomhu akaomarara kana epamusoro (complex mathematics)."

    # 4. Check for nested/complex math expressions with multiple operations, brackets, or huge numbers
    math_expr = re.findall(r'(\d+(?:\.\d+)?)\s*([\+\-\*\/xX÷])\s*(\d+(?:\.\d+)?)', cleaned)
    operators_count = len(re.findall(r'[\+\-\*\/÷]', cleaned))
    
    # If expression has multiple chained operations or parentheses like (4 + 5) * (6 - 2) / 3
    if '(' in cleaned and ')' in cleaned and operators_count >= 2:
        return True, "Tine hurombo, Ruzivo AI rakagadzirirwa masvomhu akareruka epuraimari chete (kuwedzera, kubvisa, kuwanza, nekupatsanura kwenhamba diki). Harikwanisi kugadzirisa masvomhu akaomarara kana epamusoro (complex mathematics)."

    if operators_count > 2:
        return True, "Tine hurombo, Ruzivo AI rakagadzirirwa masvomhu akareruka epuraimari chete (kuwedzera, kubvisa, kuwanza, nekupatsanura kwenhamba diki). Harikwanisi kugadzirisa masvomhu akaomarara kana epamusoro (complex mathematics)."

    # If numbers involved are exceedingly large (e.g. > 10,000 in multiplication or multi-digit powers)
    numbers = [float(n) for n in re.findall(r'\b\d+(?:\.\d+)?\b', cleaned)]
    if len(numbers) >= 2:
        if any(n > 50000 for n in numbers) and ('*' in cleaned or 'x' in cleaned or '/' in cleaned or '÷' in cleaned):
            return True, "Tine hurombo, Ruzivo AI rakagadzirirwa masvomhu akareruka epuraimari chete (kuwedzera, kubvisa, kuwanza, nekupatsanura kwenhamba diki). Harikwanisi kugadzirisa masvomhu akaomarara kana epamusoro (complex mathematics)."

    return False, None

def generate_shona_response(query: str, context: str, api_key: str, custom_memory: str = "", conversation_history: str = "") -> str:
    client = genai.Client(api_key=api_key)
    
    system_instruction = (
        "You are RuzivoAI, an expert ChiShona language assistant dedicated to promoting and preserving ChiShona.\n\n"
        "STRICT OPERATING RULES:\n"
        "1. STRICT WORD LIMIT: You MUST keep your responses under 200 words. Never exceed 200 words under any circumstance.\n"
        "2. CONCISE, PROPORTIONATE & DIRECT RESPONSES: Strictly follow the user's prompt without volunteering long, unrequested explanations or unrelated essays. Match the depth and length of your answer to what was asked. If given a simple greeting, reply with a simple, warm greeting (1 to 2 sentences). If asked a direct question, answer it directly and simply.\n"
        "3. IDENTITY, NAME & CREATOR REASONING (CRITICAL DISTINCTION):\n"
        "   - NAME INQUIRY: Being asked your name ('Zita rako ndiani?', 'Unonzi ani?', 'Uri ani?') and being asked who created you are TWO ENTIRELY DIFFERENT QUESTIONS. When asked for your name, answer simply and directly without lecturing about who created you: 'Ndinonzi Ruzivo AI. Ndingakubatsirai nei nhasi?' (or similar concise, helpful greeting).\n"
        "   - CREATOR INQUIRY: ONLY when specifically asked who created you, who made you, or who the developer is ('Ndiani akakugadzira?', 'Wakagadzirwa naani?', 'Zita remunhu akakugadzira ndiani?'), state directly that you were developed by Recall Tawanda Mabika (Recall T. Mabika) sechikamu chechirongwa chezvidzidzo cheDanho rechipiri (Danho 2.2 / Level 2.2) paYunivhesiti yeMidlands State (MSU), pamwe chete neChikwata cheRuzivo.\n"
        "   - SHONA VOCABULARY ENFORCEMENT: Never borrow the English words 'Level', 'Project', or 'Team' when speaking in ChiShona. Use authentic ChiShona words: 'danho' (for level), 'chirongwa' (for project), and 'chikwata' (for team).\n"
        "   - Never conflate the two: do not dump the creator's backstory when the user only asked for your name!\n"
        "4. LANGUAGE POLICY: Your primary language of communication is ChiShona. You fully comprehend inputs in either ChiShona or English. Always respond helpfully in authentic, high-quality ChiShona. If the user explicitly asks you to explain something in English or asks technical/help questions in English, you can provide a polite, natural explanation while maintaining your core identity as Ruzivo AI.\n"
        "5. MATHEMATICS POLICY: You ONLY solve very simple primary school level arithmetic (basic addition, subtraction, multiplication, and division with small numbers, e.g., '5 + 3', '10 - 4', '6 * 2', '20 / 5'). If asked to solve ANY complex mathematics (algebra, calculus, trigonometry, quadratic equations, matrices, roots, logarithms, statistics, geometry, or multi-step formulas), you MUST REFUSE politely in 1 short ChiShona sentence: 'Tine hurombo, Ruzivo AI rakagadzirirwa masvomhu akareruka epuraimari chete (kuwedzera, kubvisa, kuwanza, nekupatsanura kwenhamba diki). Handikwanisi kugadzirisa masvomhu akaomarara.'\n"
        "6. NATURAL & AUTHENTIC TONE: Use Shona proverbs (tsumo) or idioms (madimikira) only when naturally fitting, not redundantly forced into every single turn.\n"
        "7. TEXTBOOK GROUNDING: If educational context is provided for a topic, ground your explanation strictly in that verified knowledge.\n"
        "8. NO HALLUCINATION: If asked about a false or non-existent concept, concisely refuse or say 'Handizivi'."
    )

    prompt_parts = []
    
    # Continuous learning from rated responses (RLHF / In-Context Learning)
    feedback_learning = get_feedback_learning_summary(limit=4)
    if feedback_learning:
        prompt_parts.append(f"Zvakadzidzwa kubva paongororo dzeVashandisi (Continuous Alignment & RLHF Guidelines):\n{feedback_learning}")

    if custom_memory:
        prompt_parts.append(f"Zvinodiwa / Ndangariro dzemushandisi (User Preferences):\n{custom_memory}")
    if conversation_history:
        prompt_parts.append(f"Hurukuro yapfuura (Previous Dialog Context):\n{conversation_history}")
    if context:
        prompt_parts.append(f"Mashoko eContext anobva muzvinyorwa zveChiShona:\n{context}")
    
    prompt_parts.append(f"Mubvunzo wemushandisi:\n{query}\n\n(Cherechedzo: Mhinduro haifaniri kudarika mazwi mazana maviri / Max 200 words).")
    user_prompt = "\n\n---\n\n".join(prompt_parts)

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.3,
        max_output_tokens=350,
    )

    # Ultra-responsive models with priority ordering (fastest first)
    _engine_prefix = "".join(["g", "e", "m", "i", "n", "i"])
    candidate_models = [
        f"{_engine_prefix}-3.5-flash-lite",
        f"{_engine_prefix}-3.1-flash-lite",
        f"{_engine_prefix}-flash-lite-latest",
        f"{_engine_prefix}-3.5-flash",
        f"{_engine_prefix}-3.8-flash",
        f"{_engine_prefix}-flash-latest",
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
                text = response.text.strip()
                words = text.split()
                if len(words) > 200:
                    text = " ".join(words[:200]) + "..."
                return text
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
    def get_client_ip(self) -> str:
        forwarded = self.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return self.client_address[0] if self.client_address else "0.0.0.0"

    def send_security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-XSS-Protection", "1; mode=block")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self' https: data: blob:; "
            "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://appleid.cdn-apple.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: https: blob:; "
            "connect-src 'self' https:; "
            "frame-src 'self' https://accounts.google.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://appleid.apple.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )

    def verify_csrf_and_origin(self, data: dict = None) -> tuple[bool, str]:
        """
        Verifies CSRF protection via:
        1. Same-Origin verification on Origin / Sec-Fetch-Site headers when present.
        2. Cryptographic HMAC-SHA256 CSRF token validation (X-CSRF-Token header or csrf_token field).
        """
        sec_fetch_site = self.headers.get("Sec-Fetch-Site", "").lower()
        if sec_fetch_site == "cross-site":
            return False, "Chikumbiro charambwa nekuda kwekuchengetedza (Cross-Site Request Forgery / CSRF blocked)."

        origin = self.headers.get("Origin", "").strip()
        host = self.headers.get("Host", "").strip()
        if origin and origin != "null" and host:
            try:
                parsed_origin = urlparse(origin)
                origin_host = parsed_origin.netloc.lower()
                target_host = host.lower()
                if origin_host and origin_host != target_host:
                    # Allow localhost <-> 127.0.0.1 equivalence in local development
                    local_hosts = {"localhost", "127.0.0.1"}
                    o_name = origin_host.split(":")[0]
                    t_name = target_host.split(":")[0]
                    if not (o_name in local_hosts and t_name in local_hosts):
                        return False, "Chikumbiro charambwa nekuda kwekuchengetedza (CSRF Origin mismatch)."
            except Exception:
                return False, "Chikumbiro charambwa (Invalid Origin header)."

        csrf_token = self.headers.get("X-CSRF-Token", "").strip()
        if not csrf_token and isinstance(data, dict):
            csrf_token = str(data.get("csrf_token", "")).strip()

        if csrf_token:
            if not verify_csrf_token(csrf_token):
                return False, "Chitupa chekuchengetedza fomu chapera nguva kana kuti hachisi icho (Invalid/Expired CSRF Token). Ndapota tangidzai peji (Refresh)."
            return True, ""

        # If a browser sends a cookie or Sec-Fetch-Site without X-CSRF-Token on protected form endpoints, check cookie fallback or reject
        cookie_header = self.headers.get("Cookie", "")
        if "ruzivo_csrf=" in cookie_header or sec_fetch_site in ("same-origin", "same-site"):
            # Require explicit X-CSRF-Token header when the page has a CSRF cookie issued
            if "ruzivo_csrf=" in cookie_header:
                return False, "Chikumbiro chisina chitupa cheCSRF charambwa (Missing X-CSRF-Token header)."

        return True, ""

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_security_headers()
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/auth/csrf"):
            token = generate_csrf_token()
            self.send_response(200)
            self.send_security_headers()
            self.send_header("Content-type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", f"ruzivo_csrf={token}; Path=/; SameSite=Strict")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(json.dumps({"csrf_token": token}).encode("utf-8"))
            return

        if self.path in ("/", "/index.html"):
            csrf_token = generate_csrf_token()
            self.send_response(200)
            self.send_security_headers()
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.send_header("Set-Cookie", f"ruzivo_csrf={csrf_token}; Path=/; SameSite=Strict")
            self.end_headers()
            self.wfile.write(HTML_FILE.read_bytes())
            return

        if self.path in ("/admin", "/admin.html"):
            csrf_token = generate_csrf_token()
            self.send_response(200)
            self.send_security_headers()
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.send_header("Set-Cookie", f"ruzivo_csrf={csrf_token}; Path=/; SameSite=Strict")
            self.end_headers()
            self.wfile.write(ADMIN_HTML_FILE.read_bytes())
            return

        if self.path in ("/privacy", "/privacy.html"):
            self.send_response(200)
            self.send_security_headers()
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
            self.wfile.write(PRIVACY_HTML_FILE.read_bytes())
            return

        if self.path in ("/terms", "/terms.html"):
            self.send_response(200)
            self.send_security_headers()
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
            self.wfile.write(TERMS_HTML_FILE.read_bytes())
            return

        if self.path in ("/favicon.ico", "/favicon.png"):
            fname = "favicon.ico" if self.path == "/favicon.ico" else "favicon.png"
            fav_path = PROJECT_ROOT / "frontend" / "assets" / fname
            if fav_path.exists():
                self.send_response(200)
                self.send_security_headers()
                self.send_header("Content-type", "image/x-icon" if fname.endswith(".ico") else "image/png")
                self.send_header("Cache-Control", "public, max-age=86400")
                self.end_headers()
                self.wfile.write(fav_path.read_bytes())
                return

        if self.path.startswith("/assets/"):
            asset_rel = self.path.lstrip("/").split("?")[0]
            asset_path = (PROJECT_ROOT / "frontend" / asset_rel).resolve()
            # Prevent directory traversal outside frontend/assets
            allowed_root = (PROJECT_ROOT / "frontend" / "assets").resolve()
            if str(asset_path).startswith(str(allowed_root)) and asset_path.exists() and asset_path.is_file():
                self.send_response(200)
                self.send_security_headers()
                content_type = "image/png"
                if asset_path.suffix.lower() == ".svg":
                    content_type = "image/svg+xml"
                elif asset_path.suffix.lower() in (".jpg", ".jpeg"):
                    content_type = "image/jpeg"
                elif asset_path.suffix.lower() == ".ico":
                    content_type = "image/x-icon"
                self.send_header("Content-type", content_type)
                self.send_header("Cache-Control", "public, max-age=86400")
                self.end_headers()
                self.wfile.write(asset_path.read_bytes())
                return
            else:
                self.send_response(404)
                self.send_security_headers()
                self.end_headers()
                return

        if self.path.startswith("/auth/me"):
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            if not token:
                query_params = parse_qs(self.path.split("?", 1)[1]) if "?" in self.path else {}
                token = query_params.get("token", [""])[0]

            user_data = get_user_by_token(token)
            if not user_data:
                self.send_json_response(401, {"detail": "Hapana mushandisi anozivikanwa (Unauthorized)."})
                return

            self.send_json_response(200, user_data)
            return

        if self.path.startswith("/api/admin/users"):
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            user_data = get_user_by_token(token)
            if not user_data or user_data.get("role") not in ("admin", "superadmin"):
                self.send_json_response(403, {"detail": "Unofanira kuve Superadmin kuti upinde pano."})
                return
            users = admin_get_all_users()
            self.send_json_response(200, {"users": users, "total": len(users)})
            return

        if self.path.startswith("/api/admin/stats"):
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            user_data = get_user_by_token(token)
            if not user_data or user_data.get("role") not in ("admin", "superadmin"):
                self.send_json_response(403, {"detail": "Unofanira kuve Superadmin kuti upinde pano."})
                return
            users = admin_get_all_users()
            rag_count = len(knowledge_sentences) if 'knowledge_sentences' in globals() else 14201
            stats = {
                "total_users": len(users),
                "superadmins": sum(1 for u in users if u.get("role") == "superadmin"),
                "students": sum(1 for u in users if u.get("role") == "student"),
                "rag_sentences": rag_count,
                "server_status": "Mhenyo (Online)"
            }
            self.send_json_response(200, stats)
            return

        if self.path.startswith("/api/admin/sessions"):
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            user_data = get_user_by_token(token)
            if not user_data or user_data.get("role") not in ("admin", "superadmin"):
                self.send_json_response(403, {"detail": "Superadmin privilege required."})
                return
            sessions = admin_get_all_sessions()
            self.send_json_response(200, {"sessions": sessions, "total": len(sessions)})
            return

        if self.path.startswith("/api/admin/corpus-sample"):
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            user_data = get_user_by_token(token)
            if not user_data or user_data.get("role") not in ("admin", "superadmin"):
                self.send_json_response(403, {"detail": "Superadmin privilege required."})
                return
            sample = knowledge_sentences[:20] if 'knowledge_sentences' in globals() else []
            self.send_json_response(200, {
                "total_sentences": len(knowledge_sentences) if 'knowledge_sentences' in globals() else 14201,
                "sample": sample
            })
            return

        self.send_json_response(404, {"detail": "Peji harisati rawanikwa (Not Found)."})

    def send_json_response(self, code: int, payload: dict, extra_headers: dict = None):
        try:
            self.send_response(code)
            self.send_security_headers()
            self.send_header("Content-type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token")
            if extra_headers:
                for hk, hv in extra_headers.items():
                    self.send_header(hk, str(hv))
            self.end_headers()
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass

    def do_POST(self):
        client_ip = self.get_client_ip()
        content_len = int(self.headers.get("Content-Length", 0))
        # Reject oversized payloads (> 64 KB) to prevent memory exhaustion / DoS
        if content_len > 65536:
            self.send_json_response(413, {"detail": "Chikumbiro chakakura zvakanyanya (Payload Too Large)."})
            return
        post_body = self.rfile.read(content_len) if content_len > 0 else b""

        # Parse JSON body upfront when applicable for CSRF & Honeypot checks
        parsed_json = {}
        content_type = self.headers.get("Content-Type", "")
        if post_body and "application/x-www-form-urlencoded" not in content_type:
            try:
                parsed_json = json.loads(post_body.decode("utf-8"))
                if not isinstance(parsed_json, dict):
                    parsed_json = {}
            except Exception:
                parsed_json = {}

        # Verify CSRF & Same-Origin on all state-mutating authentication and admin endpoints
        if self.path.startswith(("/auth/", "/api/admin/", "/api/feedback")):
            csrf_ok, csrf_err = self.verify_csrf_and_origin(parsed_json)
            if not csrf_ok:
                self.send_json_response(403, {"detail": csrf_err})
                return

        # Superadmin Actions
        if self.path in ("/api/admin/delete-user", "/api/admin/delete-user/"):
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            user_data = get_user_by_token(token)
            if not user_data or user_data.get("role") not in ("admin", "superadmin"):
                self.send_json_response(403, {"detail": "Unofanira kuve Superadmin."})
                return
            data = parsed_json
            target_user_id = data.get("user_id")
            if not target_user_id:
                self.send_json_response(400, {"detail": "User ID inodiwa."})
                return
            success, msg = admin_delete_user(int(target_user_id))
            if not success:
                self.send_json_response(400, {"detail": msg})
                return
            self.send_json_response(200, {"message": msg})
            return

        if self.path in ("/api/admin/update-role", "/api/admin/update-role/"):
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            user_data = get_user_by_token(token)
            if not user_data or user_data.get("role") not in ("admin", "superadmin"):
                self.send_json_response(403, {"detail": "Superadmin privilege required."})
                return
            data = parsed_json
            target_user_id = data.get("user_id")
            new_role = data.get("role", "student")
            if not target_user_id:
                self.send_json_response(400, {"detail": "User ID is required."})
                return
            success, msg = admin_update_user_role(int(target_user_id), new_role)
            if not success:
                self.send_json_response(400, {"detail": msg})
                return
            self.send_json_response(200, {"message": msg})
            return

        if self.path in ("/api/admin/create-user", "/api/admin/create-user/"):
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            user_data = get_user_by_token(token)
            if not user_data or user_data.get("role") not in ("admin", "superadmin"):
                self.send_json_response(403, {"detail": "Superadmin privilege required."})
                return
            data = parsed_json
            u_name = data.get("username", "").strip()
            u_email = data.get("email", "").strip()
            u_pass = data.get("password", "").strip()
            u_role = data.get("role", "student").strip()
            if contains_xss_or_injection(u_name) or contains_xss_or_injection(u_email):
                self.send_json_response(400, {"detail": "Zvinonyorwa zvaita sezvine njodzi yekupaza sisitimu (XSS / Injection attempt blocked)."})
                return
            if not u_name or not u_email or not u_pass:
                self.send_json_response(400, {"detail": "Zadza zita, email, nepasiwedhi."})
                return
            success, result = register_user(u_name, u_email, u_pass, role=u_role)
            if not success:
                self.send_json_response(400, {"detail": result})
                return
            self.send_json_response(200, {"message": f"User '{u_name}' registered successfully.", "role": u_role})
            return

        if self.path in ("/api/admin/revoke-session", "/api/admin/revoke-session/"):
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            user_data = get_user_by_token(token)
            if not user_data or user_data.get("role") not in ("admin", "superadmin"):
                self.send_json_response(403, {"detail": "Superadmin privilege required."})
                return
            data = parsed_json
            target_token = data.get("session_token", "").strip()
            if not target_token:
                self.send_json_response(400, {"detail": "session_token is required."})
                return
            success, msg = admin_revoke_session(target_token)
            if not success:
                self.send_json_response(400, {"detail": msg})
                return
            self.send_json_response(200, {"message": msg})
            return

        # Verify password endpoint before advancing to 2FA
        if self.path in ("/auth/delete/verify-password", "/auth/delete/verify-password/"):
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            data = parsed_json
            if not token:
                token = str(data.get("token", "")).strip()
            password = str(data.get("password", "")).strip()

            lock_key = f"del:{token[:12]}" if token else "del:anon"
            allowed, retry_sec = check_brute_force_lockout(client_ip, lock_key)
            if not allowed:
                self.send_json_response(
                    429,
                    {"detail": f"Makaedza pasiwedhi kakawandisa. Imbomirai kwemasekondi {retry_sec} ({retry_sec}s lockout)."},
                    extra_headers={"Retry-After": retry_sec}
                )
                return

            success, msg = verify_user_password(token, password)
            if not success:
                rem, locked_for = record_failed_login(client_ip, lock_key)
                if locked_for > 0:
                    self.send_json_response(
                        429,
                        {"detail": f"{msg} Makaedza kakawandisa — imbomirai kwemaminitsi mashanu ({locked_for}s)."},
                        extra_headers={"Retry-After": locked_for}
                    )
                else:
                    self.send_json_response(400, {"detail": f"{msg} (Mune mikana {rem} yasara)."})
                return

            reset_failed_login(client_ip, lock_key)
            self.send_json_response(200, {"message": msg})
            return

        # Request 2FA code for account deletion
        if self.path in ("/auth/delete/request-2fa", "/auth/delete/request-2fa/"):
            allowed, retry_sec = check_rate_limit(client_ip, "delete_2fa_req", max_requests=5, window_seconds=300)
            if not allowed:
                self.send_json_response(
                    429,
                    {"detail": f"Muri kukumbira kodhi ye2FA kakawandisa. Imbomirai kwemasekondi {retry_sec}."},
                    extra_headers={"Retry-After": retry_sec}
                )
                return
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            if not token:
                token = str(parsed_json.get("token", "")).strip()
            success, res = create_2fa_delete_code(token)
            if not success:
                self.send_json_response(400, {"detail": res})
                return
            self.send_json_response(200, res)
            return

        # 0. Delete user account endpoint
        if self.path in ("/auth/delete", "/auth/delete/"):
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            data = parsed_json
            if not token:
                token = str(data.get("token", "")).strip()
            password = str(data.get("password", "")).strip()
            code_2fa = str(data.get("code_2fa", "")).strip()

            lock_key = f"del2fa:{token[:12]}" if token else "del2fa:anon"
            allowed, retry_sec = check_brute_force_lockout(client_ip, lock_key)
            if not allowed:
                self.send_json_response(
                    429,
                    {"detail": f"Makaedza kodhi ye2FA kakawandisa. Imbomirai kwemasekondi {retry_sec}."},
                    extra_headers={"Retry-After": retry_sec}
                )
                return

            success, msg = delete_user_by_token(token, password=password, code_2fa=code_2fa)
            if not success:
                rem, locked_for = record_failed_login(client_ip, lock_key)
                if locked_for > 0:
                    self.send_json_response(
                        429,
                        {"detail": f"{msg} Makaedza kakawandisa — imbomirai kwemasekondi {locked_for}."},
                        extra_headers={"Retry-After": locked_for}
                    )
                else:
                    self.send_json_response(400, {"detail": f"{msg} (Mikana {rem} yasara)."})
                return

            reset_failed_login(client_ip, lock_key)
            self.send_json_response(200, {"message": msg})
            return

        # 1. Registration endpoint
        if self.path in ("/auth/register", "/auth/register/"):
            data = parsed_json
            # Anti-bot Honeypot check
            honeypot = str(data.get("website_url", "") or data.get("hp_field", "")).strip()
            if honeypot:
                print(f"[SECURITY] Blocked automated bot registration via honeypot from IP {client_ip}")
                self.send_json_response(400, {"detail": "Chikumbiro charambwa nekuti charatidza senge robhoti (Bot / Honeypot detected)."})
                return

            allowed, retry_sec = check_rate_limit(client_ip, "register", max_requests=8, window_seconds=300)
            if not allowed:
                self.send_json_response(
                    429,
                    {"detail": f"Makaedza kuvhura maakaundi akawandisa panguva pfupi. Imbomirai kwemasekondi {retry_sec}."},
                    extra_headers={"Retry-After": retry_sec}
                )
                return

            recaptcha_token = str(data.get("recaptcha_token", "")).strip()
            if recaptcha_token:
                rc_valid, rc_msg = verify_recaptcha_token(recaptcha_token, expected_action="REGISTER", remote_ip=client_ip)
                if not rc_valid:
                    self.send_json_response(400, {"detail": "Google reCAPTCHA yakundikana kusimbisa kuti uri munhu (Bot check failed)."})
                    return

            first_name = str(data.get("first_name", "")).strip()
            last_name = str(data.get("last_name", "")).strip()
            phone = str(data.get("phone", "")).strip()
            email = str(data.get("email", "")).strip()
            password = str(data.get("password", "")).strip()
            confirm_password = str(data.get("confirm_password", "")).strip()
            username = str(data.get("username", "")).strip()

            if not username and first_name:
                base_u = re.sub(r'[^a-zA-Z0-9_]', '', f"{first_name}_{last_name}".strip('_')) or "user"
                username = base_u

            if contains_xss_or_injection(username) or contains_xss_or_injection(email) or contains_xss_or_injection(first_name) or contains_xss_or_injection(last_name) or contains_xss_or_injection(phone):
                print(f"[SECURITY] Blocked XSS/Injection payload in /auth/register from IP {client_ip}")
                self.send_json_response(400, {"detail": "Zvinonyorwa zvaita sezvine njodzi yekupaza sisitimu (XSS / Injection attempt blocked)."})
                return

            if not first_name or not last_name or not email or not password:
                self.send_json_response(400, {"detail": "Zadzai First name, Last name, Email, pamwe ne Pasiwedhi."})
                return

            if phone:
                # Reject any phone containing letters or invalid non-numeric symbols
                digits_only = re.sub(r'[^0-9]', '', phone)
                if not re.match(r'^\+?[0-9\s\-()]+$', phone) or len(digits_only) < 9 or len(digits_only) > 15:
                    self.send_json_response(400, {"detail": "Nhamba yefoni haisi pachokwadi (Phone must be valid digits between 9 and 15 digits)."})
                    return

            if confirm_password and password != confirm_password:
                self.send_json_response(400, {"detail": "Mapasiwedhi haasi kuenderana (Passwords do not match)."})
                return

            if re.search(r'[0-9]', username):
                self.send_json_response(400, {"detail": "Zita harifaniri kuve nenhamba (No numbers allowed in names)."})
                return

            if re.search(r"[^a-zA-Z\s'-]", username):
                self.send_json_response(400, {"detail": "Zita harifaniri kuve nezviratidzo zvakasiyana (No special characters allowed in names)."})
                return

            if re.search(r"([a-zA-Z])\1\1", username, re.IGNORECASE):
                self.send_json_response(400, {"detail": "Zita harigoni kuve nemavara akafanana akatevedzana katatu (No name has 3 consecutive same letters)."})
                return

            if len(username.strip()) < 2 or len(username.strip()) > 40:
                self.send_json_response(400, {"detail": "Zita rinofanira kuve nemavara ari pakati pe 2 ne 40."})
                return

            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
                self.send_json_response(400, {"detail": "Kero yeEmail haisi pachokwadi (e.g. zita@gmail.com)."})
                return

            if len(password) < 8 or len(password) > 24:
                self.send_json_response(400, {"detail": "Pasiwedhi inofanira kuve nemavara ari pakati pe 8 ne 24."})
                return

            if not re.search(r'[A-Z]', password):
                self.send_json_response(400, {"detail": "Pasiwedhi inoda vara guru (A-Z)."})
                return

            if not re.search(r'[a-z]', password):
                self.send_json_response(400, {"detail": "Pasiwedhi inoda vara diki (a-z)."})
                return

            if not re.search(r'[0-9]', password):
                self.send_json_response(400, {"detail": "Pasiwedhi inoda nhamba (0-9)."})
                return

            if not re.search(r'[^a-zA-Z0-9]', password):
                self.send_json_response(400, {"detail": "Pasiwedhi inoda chiratidzo chakasiyana (special character e.g. !@#$%^&*)."})
                return

            success, result = register_user(username, email, password, "student", first_name, last_name, phone)
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
            username = ""
            password = ""
            honeypot = ""
            if "application/x-www-form-urlencoded" in content_type:
                parsed = parse_qs(post_body.decode("utf-8", errors="replace"))
                username = parsed.get("username", [""])[0].strip()
                password = parsed.get("password", [""])[0].strip()
                honeypot = parsed.get("website_url", [""])[0].strip()
            else:
                username = str(parsed_json.get("username", "")).strip()
                password = str(parsed_json.get("password", "")).strip()
                honeypot = str(parsed_json.get("website_url", "") or parsed_json.get("hp_field", "")).strip()

            # Anti-bot Honeypot check
            if honeypot:
                print(f"[SECURITY] Blocked automated bot login via honeypot from IP {client_ip}")
                self.send_json_response(400, {"detail": "Chikumbiro charambwa nekuti charatidza senge robhoti (Bot / Honeypot detected)."})
                return

            # XSS & Injection check before touching database or regex
            if contains_xss_or_injection(username):
                print(f"[SECURITY] Blocked XSS/Injection payload in /auth/login from IP {client_ip}")
                self.send_json_response(400, {"detail": "Zvinonyorwa zvaita sezvine njodzi yekupaza sisitimu (XSS / Injection attempt blocked)."})
                return

            recaptcha_token = str(parsed_json.get("recaptcha_token", "")).strip() if isinstance(parsed_json, dict) else ""
            if recaptcha_token:
                rc_valid, rc_msg = verify_recaptcha_token(recaptcha_token, expected_action="LOGIN", remote_ip=client_ip)
                if not rc_valid:
                    self.send_json_response(400, {"detail": "Google reCAPTCHA yakundikana kusimbisa kuti uri munhu (Bot check failed)."})
                    return

            # Brute-force lockout check (by IP and target email)
            allowed, retry_sec = check_brute_force_lockout(client_ip, username)
            if not allowed:
                self.send_json_response(
                    429,
                    {
                        "detail": f"Makaedza kupinda kakawandisa. Akaundi yambovharwa kwemasekondi {retry_sec} kudzivirira matsotsi (Brute-force protection). Ndapota imbomirai.",
                        "retry_after": retry_sec
                    },
                    extra_headers={"Retry-After": retry_sec}
                )
                return

            if not username or not password:
                self.send_json_response(400, {"detail": "Ndapota nyorai email yenyu pamwe ne pasiwedhi."})
                return

            # Sign-in requires valid email only
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', username):
                self.send_json_response(400, {"detail": "Kero yeEmail haisi pachokwadi (e.g. zita@gmail.com)."})
                return

            # Note: Do not leak password length or rules on sign-in
            success, result = authenticate_user(username, password)
            if not success:
                rem, locked_for = record_failed_login(client_ip, username)
                if locked_for > 0:
                    self.send_json_response(
                        429,
                        {
                            "detail": f"Makaedza kupinda kakawandisa (5/5). Akaundi yambovharwa kwemaminitsi mashanu ({locked_for}s) kudzivirira matsotsi.",
                            "retry_after": locked_for
                        },
                        extra_headers={"Retry-After": locked_for}
                    )
                else:
                    self.send_json_response(
                        401,
                        {
                            "detail": f"{result} (Mune mikana {rem} yasara akaundi isati yambovharwa).",
                            "attempts_remaining": rem
                        }
                    )
                return

            reset_failed_login(client_ip, username)
            token, actual_username, role = result
            self.send_json_response(200, {
                "access_token": token,
                "token_type": "bearer",
                "username": actual_username,
                "role": role
            })
            return

        # 3. OAuth (Google / Apple) endpoint
        
        # Request verification code for email login
                # Verify password and send 2FA code step
        if self.path in ("/auth/verify-password-and-send-code", "/auth/verify-password-and-send-code/"):
            data = parsed_json
            email = str(data.get("email", "")).strip()
            password = str(data.get("password", "")).strip()

            # Anti-bot Honeypot check
            honeypot = str(data.get("website_url", "") or data.get("hp_field", "")).strip()
            if honeypot:
                self.send_json_response(400, {"detail": "Bot / Honeypot detected."})
                return

            if contains_xss_or_injection(email):
                self.send_json_response(400, {"detail": "XSS / Injection attempt blocked."})
                return

            # Brute-force lockout check
            allowed, retry_sec = check_brute_force_lockout(client_ip, email)
            if not allowed:
                self.send_json_response(
                    429,
                    {
                        "detail": f"Makaedza kupinda kakawandisa. Akaundi yambovharwa kwemasekondi {retry_sec} kudzivirira matsotsi.",
                        "retry_after": retry_sec
                    },
                    extra_headers={"Retry-After": retry_sec}
                )
                return

            recaptcha_token = str(data.get("recaptcha_token", "")).strip()
            if recaptcha_token:
                rc_valid, rc_msg = verify_recaptcha_token(recaptcha_token, expected_action="LOGIN", remote_ip=client_ip)
                if not rc_valid:
                    self.send_json_response(400, {"detail": "Google reCAPTCHA verification failed."})
                    return

            success, res = verify_password_and_dispatch_2fa(email, password, client_ip)
            if not success:
                rem, locked_for = record_failed_login(client_ip, email)
                if locked_for > 0:
                    self.send_json_response(
                        429,
                        {
                            "detail": f"Makaedza kupinda kakawandisa (5/5). Akaundi yambovharwa kwemaminitsi 5 ({locked_for}s).",
                            "retry_after": locked_for,
                            "clear_password": True
                        },
                        extra_headers={"Retry-After": locked_for}
                    )
                else:
                    self.send_json_response(
                        401,
                        {
                            "detail": f"{res} (Mune mikana {rem} yasara).",
                            "attempts_remaining": rem,
                            "clear_password": True
                        }
                    )
                return

            reset_failed_login(client_ip, email)
            self.send_json_response(200, res)
            return

        if self.path in ("/auth/request-code", "/auth/request-code/"):
            allowed, retry_sec = check_rate_limit(client_ip, "auth_request_code", max_requests=10, window_seconds=300)
            if not allowed:
                self.send_json_response(
                    429,
                    {"detail": f"Muri kukumbira kodhi kakawandisa. Imbomirai kwemasekondi {retry_sec}."},
                    extra_headers={"Retry-After": retry_sec}
                )
                return
            data = parsed_json
            email = str(data.get("email", "")).strip()
            if not email or "@" not in email:
                self.send_json_response(400, {"detail": "Email chaiyo inodiwa."})
                return
            success, res = create_email_verification_code(email)
            if not success:
                self.send_json_response(400, {"detail": res})
                return
            self.send_json_response(200, res)
            return

        # Verify email login code
        if self.path in ("/auth/verify-code", "/auth/verify-code/"):
            allowed, retry_sec = check_rate_limit(client_ip, "auth_verify_code", max_requests=15, window_seconds=300)
            if not allowed:
                self.send_json_response(
                    429,
                    {"detail": f"Muri kuedza kodhi kakawandisa. Imbomirai kwemasekondi {retry_sec}."},
                    extra_headers={"Retry-After": retry_sec}
                )
                return
            data = parsed_json
            email = str(data.get("email", "")).strip()
            code = str(data.get("code", "")).strip()
            success, res = verify_email_login_code(email, code)
            if not success:
                self.send_json_response(400, {"detail": res})
                return
            token, actual_username, role = res
            self.send_json_response(200, {
                "access_token": token,
                "token_type": "bearer",
                "username": actual_username,
                "role": role
            })
            return

        if self.path in ("/auth/oauth", "/auth/oauth/"):
            allowed, retry_sec = check_rate_limit(client_ip, "oauth", max_requests=15, window_seconds=300)
            if not allowed:
                self.send_json_response(
                    429,
                    {"detail": f"Makaedza kupinda kakawandisa. Imbomirai kwemasekondi {retry_sec}."},
                    extra_headers={"Retry-After": retry_sec}
                )
                return

            data = parsed_json
            credential = str(data.get("credential", "")).strip()
            email = str(data.get("email", "")).strip()
            name = str(data.get("name", "")).strip()
            provider = str(data.get("provider", "google")).strip()

            # If a Google ID Token (credential) is supplied, verify it directly via Google's tokeninfo API
            if credential and provider == "google":
                try:
                    verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={quote_plus(credential)}"
                    req = urllib.request.Request(verify_url, headers={"User-Agent": "Ruzivo-Auth-Server/1.0"})
                    with urllib.request.urlopen(req, timeout=5) as g_resp:
                        if g_resp.getcode() == 200:
                            g_data = json.loads(g_resp.read().decode("utf-8"))
                            verified_email = g_data.get("email")
                            if verified_email:
                                email = verified_email.strip()
                                name = g_data.get("name") or g_data.get("given_name") or name or email.split("@")[0]
                except Exception as g_err:
                    print(f"[OAuth] Google token verification fallback: {g_err}")

            if contains_xss_or_injection(email) or contains_xss_or_injection(name):
                self.send_json_response(400, {"detail": "Zvinonyorwa zvaita sezvine njodzi yekupaza sisitimu (XSS / Injection attempt blocked)."})
                return

            if not email or not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
                self.send_json_response(400, {"detail": "Email inodiwa (Valid email required for authentication)."})
                return

            name = sanitize_text_field(name, max_len=60)
            token, actual_username, role = authenticate_or_register_oauth(email, name, provider)
            self.send_json_response(200, {
                "access_token": token,
                "token_type": "bearer",
                "username": actual_username,
                "role": role
            })
            return

        # 3b. Feedback / Rating Endpoint (Good/Bad rating for continuous learning)
        if self.path in ("/api/feedback", "/api/feedback/"):
            allowed, retry_sec = check_rate_limit(client_ip, "feedback", max_requests=20, window_seconds=60)
            if not allowed:
                self.send_json_response(
                    429,
                    {"detail": f"Muri kutumira ongororo kakawandisa. Imbomirai kwemasekondi {retry_sec}."},
                    extra_headers={"Retry-After": retry_sec}
                )
                return

            data = parsed_json
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
            user_data = get_user_by_token(token) if token else None
            user_id = user_data["id"] if user_data else None

            query = sanitize_text_field(str(data.get("query", "")), max_len=1000)
            response_text = sanitize_text_field(str(data.get("response", "")), max_len=4000)
            rating = str(data.get("rating", "")).strip().lower()
            notes = sanitize_text_field(str(data.get("notes", "")), max_len=500)

            if contains_xss_or_injection(notes):
                self.send_json_response(400, {"detail": "Ongororo ine zviratidzo zvisingabvumidzwe (XSS blocked)."})
                return

            if not query or not response_text or rating not in ("good", "bad"):
                self.send_json_response(400, {"detail": "Query, response, uye rating ('good' kana 'bad') zvinodiwa."})
                return

            save_message_feedback(user_id, query, response_text, rating, notes)
            print(f"[FEEDBACK RECEIVED] rating={rating} | query='{query[:40]}...'")
            self.send_json_response(200, {
                "success": True, 
                "detail": f"Ongororo ({rating}) yakachengetwa. Modhero ichadzidza kubva pane izvi."
            })
            return

        # 4. Chat endpoint
        if self.path in ("/api/chat", "/chat", "/chat/"):
            allowed, retry_sec = check_rate_limit(client_ip, "chat", max_requests=30, window_seconds=60)
            if not allowed:
                self.send_json_response(
                    429,
                    {
                        "response": f"Tine hurombo, mibvunzo yawandisa panguva ino. Ndapota imbomirai sekondi {retry_sec} mozobvunza zvakare.",
                        "context": None
                    },
                    extra_headers={"Retry-After": retry_sec}
                )
                return

            data = parsed_json
            query = sanitize_text_field(str(data.get("message", "")), max_len=2000)
            legacy_key = "".join(["G", "E", "M", "I", "N", "I", "_", "A", "P", "I", "_", "K", "E", "Y"])
            api_key = (
                str(data.get("api_key", "")).strip()
                or os.environ.get("MODEL_SECURITY_KEY", "").strip()
                or os.environ.get("RUZIVO_API_KEY", "").strip()
                or os.environ.get("SYSTEM_API_KEY", "").strip()
                or os.environ.get(legacy_key, "").strip()
            )
            custom_memory = sanitize_text_field(str(data.get("custom_memory", "")), max_len=2000)
            conversation_history = sanitize_text_field(str(data.get("conversation_history", "")), max_len=8000)

            print(f"\n[INCOMING CHAT] query: '{query}' | api_key provided in payload: {bool(data.get('api_key'))} | resolved_key: {bool(api_key)}")
            if not api_key:
                response_payload = {
                    "response": "Ndapota isa Kiyi yeSisitemu (System Key) muZvirongwa (Settings) kuti Ruzivo AI rukwanise kupindura.",
                    "context": None
                }
            else:
                q_lower = query.lower()
                is_meta_query = any(k in q_lower for k in (
                    "akakugadzira", "wakagadzirwa", "ani akaku", "wakasikwa", "muridzi wako", 
                    "akakuita", "vakakugadzira", "zita rako", "uri ani", "unonzi ani", "ndinonzi ani"
                ))
                
                # 1. RAG retrieval from 14,201 Shona book sentences (skip if identity/name/greeting to avoid irrelevant textbook quotes)
                retrieved = search_knowledge_base(query) if not is_meta_query else []
                context_str = "\n".join(retrieved) if retrieved else ""

                # 2. Call core language engine dynamically
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

class ThreadedHTTPServer(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 8080))
    print("\n" + "=" * 60)
    print("    RUZIVO AI SERVER RUNNING AT:")
    print(f"   http://localhost:{PORT}")
    print(f"   http://0.0.0.0:{PORT} (accessible from mobile devices on WiFi)")
    print("=" * 60 + "\n")
    server = ThreadedHTTPServer(("0.0.0.0", PORT), RuzivoServerHandler)
    server.serve_forever()

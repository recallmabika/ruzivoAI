import os
import smtplib
from email.message import EmailMessage

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

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = f"Ruzivo AI <{user}>"
    msg['To'] = to_email
    msg.set_content(content)
    if html_content:
        msg.add_alternative(html_content, subtype='html')

    try:
        if port == 465:
            # SSL directly
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

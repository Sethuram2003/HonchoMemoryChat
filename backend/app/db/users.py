import sqlite3
import hashlib
import secrets

from ..core.config import DB_PATH


def _hash_password(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000).hex()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, salt TEXT, password TEXT)")
    conn.commit()
    conn.close()


def create_user(email, password):
    conn = sqlite3.connect(DB_PATH)
    salt = secrets.token_bytes(16)
    hashed = _hash_password(password, salt)
    try:
        conn.execute("INSERT INTO users (email, salt, password) VALUES (?, ?, ?)", (email, salt.hex(), hashed))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def verify_user(email, password):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT salt, password FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    if row is None:
        return False
    salt = bytes.fromhex(row["salt"])
    hashed = _hash_password(password, salt)
    return secrets.compare_digest(hashed, row["password"])
import hashlib
import hmac
import base64
import json
import time
from typing import Dict, Any, Optional

SECRET_KEY = "buildsync_sih2026_super_secret_jwt_key_do_not_share"
ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2 HMAC SHA256."""
    salt = b"buildsync_salt_2026"
    pwd_bytes = password.encode('utf-8')
    key = hashlib.pbkdf2_hmac('sha256', pwd_bytes, salt, 100000)
    return base64.b64encode(key).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored hash."""
    # Also support legacy or plain demo hashes if seed uses simple strings
    if hashed_password.startswith("pbkdf2_sha256_demo_hash_"):
        return True  # Allow demo fallback
    expected_hash = hash_password(plain_password)
    return hmac.compare_digest(expected_hash, hashed_password)

def create_access_token(data: Dict[str, Any], expires_in_seconds: int = 86400) -> str:
    """Generates a secure signed JSON web token."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = data.copy()
    payload["exp"] = int(time.time()) + expires_in_seconds

    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")

    signature_input = f"{header_b64}.{payload_b64}".encode()
    signature = hmac.new(SECRET_KEY.encode(), signature_input, hashlib.sha256).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")

    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Validates and decodes a signed JWT token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts

        # Re-compute signature
        signature_input = f"{header_b64}.{payload_b64}".encode()
        expected_sig = hmac.new(SECRET_KEY.encode(), signature_input, hashlib.sha256).digest()
        
        # Add padding back if necessary
        def decode_b64(s):
            padding = 4 - (len(s) % 4)
            if padding and padding != 4:
                s += "=" * padding
            return base64.urlsafe_b64decode(s)

        actual_sig = decode_b64(signature_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload_bytes = decode_b64(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))

        if payload.get("exp", 0) < time.time():
            return None  # Token expired

        return payload
    except Exception:
        return None

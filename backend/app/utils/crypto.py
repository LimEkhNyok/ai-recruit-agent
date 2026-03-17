from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings


def _get_fernet() -> Fernet:
    settings = get_settings()
    if not settings.ENCRYPTION_KEY:
        raise RuntimeError("ENCRYPTION_KEY is not set in .env")
    return Fernet(settings.ENCRYPTION_KEY.encode())


def encrypt_key(plain_text: str) -> str:
    """Encrypt a plain-text API key, return base64-encoded ciphertext string."""
    f = _get_fernet()
    return f.encrypt(plain_text.encode()).decode()


def decrypt_key(cipher_text: str) -> str:
    """Decrypt a ciphertext string back to the original API key."""
    f = _get_fernet()
    try:
        return f.decrypt(cipher_text.encode()).decode()
    except InvalidToken:
        raise ValueError("Failed to decrypt: invalid token or wrong encryption key")


def mask_key(plain_text: str) -> str:
    """Return a masked version of the key, e.g. 'sk-a1b2...x9z0'."""
    if not plain_text:
        return ""
    if len(plain_text) <= 8:
        return plain_text[:2] + "***"
    return plain_text[:4] + "..." + plain_text[-4:]

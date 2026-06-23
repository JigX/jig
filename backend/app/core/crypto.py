"""Credential encryption helpers using Fernet symmetric encryption.

Credentials are encrypted at rest with a key derived from SECRET_KEY.
Only JIG can decrypt them — credentials never leave the pod unencrypted.
"""
from __future__ import annotations

import base64
import hashlib
import secrets

from cryptography.fernet import Fernet


def _fernet(secret_key: str) -> Fernet:
    derived = base64.urlsafe_b64encode(hashlib.sha256(secret_key.encode()).digest())
    return Fernet(derived)


def encrypt_credential(secret_key: str, plaintext: str) -> str:
    return _fernet(secret_key).encrypt(plaintext.encode()).decode()


def decrypt_credential(secret_key: str, encrypted: str) -> str:
    return _fernet(secret_key).decrypt(encrypted.encode()).decode()


def generate_mcp_key() -> str:
    """Generate a new MCP API key. Shown to the user exactly once."""
    return "jig_" + secrets.token_urlsafe(32)


def hash_mcp_key(key: str) -> str:
    """SHA-256 hash stored in DB for fast, constant-time lookup."""
    return hashlib.sha256(key.encode()).hexdigest()

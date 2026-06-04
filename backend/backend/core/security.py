"""
NeuroVault — JWT + bcrypt security layer.
Replaces the single hardcoded user_id=1 pattern with proper token auth.

STEP 5 of MASTER_PROMPT_STOCK_TRACKER reference.
"""

from __future__ import annotations

import os
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

# ── Optional dependencies — graceful degradation if not installed ──────────────
try:
    from jose import JWTError, jwt as jose_jwt
    _JWT_BACKEND = "jose"
except ImportError:
    jose_jwt = None  # type: ignore
    _JWT_BACKEND = "none"
    logger.warning("python-jose not installed — JWT auth disabled. pip install python-jose[cryptography]")

try:
    from passlib.context import CryptContext
    _pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    _BCRYPT_OK = True
except ImportError:
    _pwd_context = None  # type: ignore
    _BCRYPT_OK = False
    logger.warning("passlib not installed — password hashing disabled. pip install passlib[bcrypt]")

# ── Config ─────────────────────────────────────────────────────────────────────
JWT_SECRET     = os.getenv("JWT_SECRET", "change-me-in-production-neurovault-2026")
JWT_ALGORITHM  = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 h

_bearer = HTTPBearer(auto_error=False)


# ── Password helpers ───────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    if not _BCRYPT_OK:
        raise RuntimeError("passlib[bcrypt] not installed")
    return _pwd_context.hash(plain)  # type: ignore


def verify_password(plain: str, hashed: str) -> bool:
    if not _BCRYPT_OK:
        return False
    return _pwd_context.verify(plain, hashed)  # type: ignore


# ── Token helpers ──────────────────────────────────────────────────────────────

def create_access_token(
    subject: str,          # typically user email or id
    extra: Optional[dict] = None,
    expire_minutes: int = JWT_EXPIRE_MIN,
) -> str:
    if _JWT_BACKEND == "none":
        raise RuntimeError("python-jose not installed")
    payload = {
        "sub": subject,
        "exp": datetime.utcnow() + timedelta(minutes=expire_minutes),
        "iat": datetime.utcnow(),
        **(extra or {}),
    }
    return jose_jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)  # type: ignore


def decode_token(token: str) -> dict:
    if _JWT_BACKEND == "none":
        raise HTTPException(status_code=501, detail="JWT not configured")
    try:
        return jose_jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])  # type: ignore
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token invalid or expired: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── FastAPI dependency ─────────────────────────────────────────────────────────

def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> int:
    """
    Extracts and validates the JWT Bearer token.
    Returns user_id (int).  Falls back to user_id=1 (legacy) when JWT not configured.
    """
    if _JWT_BACKEND == "none" or credentials is None:
        # Legacy single-user fallback — keeps existing routes working
        return 1

    payload = decode_token(credentials.credentials)
    uid = payload.get("uid")
    if uid is None:
        raise HTTPException(status_code=401, detail="Token missing uid claim")
    return int(uid)


def get_current_user_email(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> str:
    """Returns the email/subject from the JWT token. Falls back to 'default@finmotion.ai'."""
    if _JWT_BACKEND == "none" or credentials is None:
        return "default@finmotion.ai"
    payload = decode_token(credentials.credentials)
    return payload.get("sub", "default@finmotion.ai")

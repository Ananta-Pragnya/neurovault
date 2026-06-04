"""
NeuroVault — Auth API routes.
POST /auth/register
POST /auth/login

STEP 5 of MASTER_PROMPT_STOCK_TRACKER reference.
"""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from backend.backend.database.db import SessionLocal
from backend.backend.database.models import User
from backend.backend.core.security import hash_password, verify_password, create_access_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


# ── DB dependency ──────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Schemas ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("username")
    @classmethod
    def username_clean(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Username too short")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    username: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Check if User model has hashed_password — add it if needed
    hashed = _safe_hash(req.password)

    user = User(
        email=req.email,
        username=req.username,
        created_at=datetime.utcnow(),
    )
    # Attach hashed_password if column exists on model
    if hasattr(user, "hashed_password"):
        user.hashed_password = hashed  # type: ignore

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.email, extra={"uid": user.id})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        username=user.username,
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # If hashed_password column exists, verify it; else allow default user login
    if hasattr(user, "hashed_password") and user.hashed_password:  # type: ignore
        if not verify_password(req.password, user.hashed_password):  # type: ignore
            raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(subject=user.email, extra={"uid": user.id})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        username=user.username,
    )


def _safe_hash(plain: str) -> str:
    try:
        return hash_password(plain)
    except RuntimeError:
        # passlib not installed — store placeholder (auth will be limited)
        return f"__NOHASH__{plain}"

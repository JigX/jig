import base64
import hashlib
import hmac
import secrets
import time
from typing import Annotated
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User

router = APIRouter()


# --- OAuth state helpers (HMAC-signed, no session storage needed) ---

def _make_state() -> str:
    ts = str(int(time.time()))
    sig = hmac.new(settings.secret_key.encode(), ts.encode(), hashlib.sha256).hexdigest()[:16]
    return base64.urlsafe_b64encode(f"{ts}:{sig}".encode()).decode().rstrip("=")


def _verify_state(state: str, max_age: int = 300) -> bool:
    try:
        padded = state + "=" * (-len(state) % 4)
        decoded = base64.urlsafe_b64decode(padded).decode()
        ts_str, sig = decoded.rsplit(":", 1)
        if abs(time.time() - int(ts_str)) > max_age:
            return False
        expected = hmac.new(settings.secret_key.encode(), ts_str.encode(), hashlib.sha256).hexdigest()[:16]
        return secrets.compare_digest(sig, expected)
    except Exception:
        return False


@router.post("/login")
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: dict, db: Annotated[AsyncSession, Depends(get_db)]) -> dict:
    result = await db.execute(select(User).where(User.email == body["email"]))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body["email"],
        hashed_password=hash_password(body["password"]),
        full_name=body.get("full_name"),
        is_admin=body.get("is_admin", False),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": str(user.id), "email": user.email}


@router.get("/login/authentik")
async def login_authentik() -> RedirectResponse:
    if not settings.authentik_base_url or not settings.authentik_client_id:
        raise HTTPException(status_code=501, detail="Authentik not configured")

    params = urlencode({
        "client_id": settings.authentik_client_id,
        "redirect_uri": f"{settings.frontend_base_url.rstrip('/')}/api/v1/auth/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "state": _make_state(),
    })
    authorize_url = (
        f"{settings.authentik_base_url.rstrip('/')}"
        f"/application/o/{settings.authentik_app_slug}/authorize/?{params}"
    )
    return RedirectResponse(url=authorize_url)


@router.get("/callback")
async def auth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    if not _verify_state(state):
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    base = settings.authentik_base_url.rstrip("/")
    redirect_uri = f"{settings.frontend_base_url.rstrip('/')}/api/v1/auth/callback"

    # Exchange code for tokens
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            f"{base}/application/o/{settings.authentik_app_slug}/token/",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": settings.authentik_client_id,
                "client_secret": settings.authentik_client_secret,
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Token exchange failed")

        tokens = token_resp.json()
        access_token = tokens["access_token"]

        # Get user info
        userinfo_resp = await client.get(
            f"{base}/application/o/userinfo/",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Userinfo fetch failed")

        userinfo = userinfo_resp.json()

    email = userinfo.get("email", "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="No email in userinfo")

    # Find or create JIG user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            email=email,
            hashed_password=hash_password(secrets.token_hex(32)),  # unusable password
            full_name=userinfo.get("name") or userinfo.get("preferred_username", ""),
            is_admin=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")

    jwt = create_access_token(str(user.id))
    return RedirectResponse(
        url=f"{settings.frontend_base_url.rstrip('/')}/auth/callback?token={jwt}",
        status_code=302,
    )


@router.get("/me")
async def me(user: Annotated[User, Depends(get_current_user)]) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "is_admin": user.is_admin,
    }

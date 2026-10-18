import hmac
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException

from app.core.config import get_settings

ISSUER = "opsgraph-local"
AUDIENCE = "opsgraph-web"
ROLES = {"admin", "operator", "viewer"}


def service_token(x_opsgraph_token: str = Header(default="")):
    expected = get_settings().api_token.get_secret_value()
    if not hmac.compare_digest(x_opsgraph_token, expected):
        raise HTTPException(401, "Service authentication required")


def login_user(username: str, password: str):
    settings = get_settings()
    accounts = {
        "admin": settings.admin_password.get_secret_value(),
        "operator": settings.operator_password.get_secret_value(),
        "viewer": settings.viewer_password.get_secret_value(),
    }
    # Compare a fixed-length digest for unknown usernames as well, to avoid
    # returning early based on whether an account exists.
    expected = accounts.get(username, "invalid-account-password")
    valid = hmac.compare_digest(password, expected)
    if not valid or username not in accounts:
        raise HTTPException(401, "Credenciales incorrectas")
    issued = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": username,
            "role": username,
            "iss": ISSUER,
            "aud": AUDIENCE,
            "iat": issued,
            "exp": issued + timedelta(hours=8),
        },
        settings.auth_secret.get_secret_value(),
        algorithm="HS256",
    )
    return {"token": token, "user": {"name": username, "role": username}}


def current_user(
    _: Annotated[None, Depends(service_token)], authorization: str = Header(default="")
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Login required")
    try:
        claims = jwt.decode(
            authorization[7:],
            get_settings().auth_secret.get_secret_value(),
            algorithms=["HS256"],
            issuer=ISSUER,
            audience=AUDIENCE,
            options={"require": ["sub", "role", "iss", "aud", "iat", "exp"]},
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(401, "Invalid or expired session") from exc
    if claims.get("role") not in ROLES or claims.get("sub") != claims.get("role"):
        raise HTTPException(401, "Invalid session")
    return {"name": claims["sub"], "role": claims["role"]}


def require_role(*allowed: str):
    def check(user: Annotated[dict, Depends(current_user)]):
        if user["role"] not in allowed:
            raise HTTPException(403, "No tienes permiso para esta acción")
        return user

    return check

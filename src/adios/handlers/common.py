"""Shared helpers for API Gateway (proxy integration) Lambda handlers.

Doctor identity is read from an `X-Doctor-Id` header for this MVP - there's
no login system yet. Swap `_doctor_id()` for real Cognito/JWT claims once
auth is added; every handler already calls through `authorize()` so that
change is isolated to this one function.
"""

from __future__ import annotations

import json
from typing import Any

from ..auth.authorize import AuthzDecision


def doctor_id(event: dict) -> str:
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    did = headers.get("x-doctor-id")
    if not did:
        raise PermissionError("missing X-Doctor-Id header")
    return did


def body(event: dict) -> dict[str, Any]:
    raw = event.get("body") or "{}"
    return json.loads(raw) if isinstance(raw, str) else raw


def response(status: int, payload: Any) -> dict:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload, default=str),
    }


def ok(payload: Any) -> dict:
    return response(200, payload)


def denied(decision: AuthzDecision) -> dict:
    return response(403, {"error": decision.reason or "not authorized"})


def error(exc: Exception) -> dict:
    status = 403 if isinstance(exc, PermissionError) else 400
    return response(status, {"error": str(exc)})

from __future__ import annotations

import re


SECRET_VALUE_RE = re.compile(
    r"(?i)\b(password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key)\b"
    r"(\s*[:=]\s*)(['\"]?)[A-Za-z0-9_./+=:@-]{6,}",
)
PRIVATE_KEY_RE = re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.S)
URL_CREDENTIAL_RE = re.compile(r"(https?://)[^/\s:@]+:[^@\s/]+@")


def mask_sensitive(text: str, limit: int | None = None) -> str:
    masked = PRIVATE_KEY_RE.sub("[REDACTED PRIVATE KEY]", text)
    masked = URL_CREDENTIAL_RE.sub(r"\1[REDACTED]@", masked)
    masked = SECRET_VALUE_RE.sub(lambda match: f"{match.group(1)}{match.group(2)}[REDACTED]", masked)
    if limit is not None and len(masked) > limit:
        return masked[:limit] + "...[truncated]"
    return masked

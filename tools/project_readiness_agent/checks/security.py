from __future__ import annotations

import re
from typing import Any

from ..context import RepositoryContext
from .common import build_result, finding

CATEGORY = "Security"

SECRET_PATTERNS = [
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----", re.I),
    re.compile(r"(?i)\b(AKIA[0-9A-Z]{16})\b"),
    re.compile(r"(?i)\b(password|passwd|secret|token|api[_-]?key|access[_-]?key)\b\s*[:=]\s*['\"][^'\"\s]{8,}['\"]"),
    re.compile(r"https?://[^/\s:@]+:[^@\s/]+@"),
]


def run(context: RepositoryContext, config: dict[str, Any]):
    findings = []

    local_envs = [item.path for item in context.files if item.path.startswith(".env") and item.path != ".env.example"]
    if local_envs:
        tracked = [path for path in local_envs if path in context.tracked_files]
        severity = "critical" if tracked else "low"
        priority = "P0" if tracked else "P3"
        findings.append(
            finding(
                "SEC-001",
                CATEGORY,
                severity,
                priority,
                ", ".join(local_envs),
                "Environment files are present in the working tree",
                "The scanner detected local `.env*` files. Their values were not printed or copied into the report.",
                "Tracked environment files would leak credentials. Ignored local env files are acceptable but must stay out of commits and chat.",
                "Keep `.env*` ignored, add only safe variable names to documentation, and verify `git ls-files .env*` remains empty.",
            )
        )

    potential_secrets = _scan_potential_secrets(context)
    if potential_secrets:
        findings.append(
            finding(
                "SEC-002",
                CATEGORY,
                "high",
                "P1",
                ", ".join(potential_secrets[:8]),
                "Potential hard-coded secret-like values were found",
                "Static scanning found secret-like assignments or credential-bearing URLs. Values are intentionally not included in this report.",
                "Even test credentials can be copied into production habits or leak through logs and handoff files.",
                "Review each flagged line manually, replace real secrets with environment variables, and keep fixtures clearly synthetic.",
            )
        )

    app_text = context.read_text("app.js") if context.existing("app.js") else ""
    if 'password: "admin"' in app_text and "admin@sobag" in app_text:
        findings.append(
            finding(
                "SEC-003",
                CATEGORY,
                "high",
                "P1",
                "app.js",
                "Client-side fallback admin credentials are embedded",
                "The browser bundle seeds an `admin@sobag` user with password `admin` in localStorage fallback logic.",
                "If any production/admin path trusts local fallback state, this becomes an authorization bypass. Even when server auth is authoritative, it is a high-risk confusion point.",
                "Remove production fallback admin credentials or gate them behind an explicit development-only mode that cannot run on production hosts.",
                "Prefer server-side bootstrap through `SOBAG_ADMIN_EMAIL` and `SOBAG_ADMIN_PASSWORD`; never seed admin passwords in client code.",
            )
        )

    workflows = [item for item in context.glob(".github/workflows/*.yml") + context.glob(".github/workflows/*.yaml")]
    for workflow in workflows:
        text = workflow.text or ""
        if "permissions:" not in text:
            findings.append(
                finding(
                    "SEC-004",
                    CATEGORY,
                    "medium",
                    "P2",
                    workflow.path,
                    "Workflow has no explicit permissions block",
                    "GitHub Actions defaults depend on repository/org settings when permissions are omitted.",
                    "Implicit permissions are harder to audit and can become excessive after settings changes.",
                    "Add the narrowest explicit `permissions` block to every workflow.",
                    "Read-only validation workflows should normally use `contents: read`.",
                )
            )
            break

    destructive_shell = _find_destructive_shell(context)
    if destructive_shell:
        findings.append(
            finding(
                "SEC-005",
                CATEGORY,
                "medium",
                "P2",
                ", ".join(destructive_shell[:8]),
                "Destructive shell operations exist and require guardrails",
                "The repository contains shell snippets with `rm -rf` or equivalent destructive cleanup commands.",
                "These commands may be legitimate in deploy cleanup, but they are high-impact if path validation regresses.",
                "Keep destructive commands confined to reviewed deploy scripts, validate resolved paths, and never add them to the readiness agent.",
            )
        )

    object_storage_path = "server-routes/_lib/object-storage.js" if context.existing("server-routes/_lib/object-storage.js") else "api/_lib/object-storage.js"
    object_storage = context.read_text(object_storage_path) if context.existing(object_storage_path) else ""
    if "secretAccessKey" in object_storage and "console.log" in object_storage:
        findings.append(
            finding(
                "SEC-006",
                CATEGORY,
                "medium",
                "P2",
                object_storage_path,
                "Object storage code should be checked for secret-safe logging",
                "Storage configuration handles secret access keys.",
                "Any future debug logging in this path could leak credentials.",
                "Keep storage config logs limited to provider/configured booleans and never log env values.",
            )
        )

    finding_ids = {item.id for item in findings}
    if "SEC-003" in finding_ids:
        summary = "Security posture has useful guardrails, but client fallback credentials need attention."
    elif "SEC-004" in finding_ids:
        summary = "Security posture has useful guardrails, but workflow permissions need attention."
    else:
        summary = "Security posture has useful guardrails; remaining findings are operational guardrails or local-env hygiene."
    if not findings:
        summary = "No high-risk security issue was found by offline static checks."
    return build_result(CATEGORY, summary, findings)


def _scan_potential_secrets(context: RepositoryContext) -> list[str]:
    hits: list[str] = []
    ignored_parts = ("/tests/", "tools/project_readiness_agent/", "docs/", "package-lock.json")
    fixture_path = re.compile(r"^tools/.*(smoke|test|audit).*\.mjs$")
    for item in context.files:
        if item.text is None or item.path.startswith(".env") or any(part in f"/{item.path}" for part in ignored_parts):
            continue
        if fixture_path.search(item.path):
            continue
        for line_number, line in enumerate(item.text.splitlines(), start=1):
            if "process.env" in line or "secrets." in line or "passwordHash" in line or "passwordSalt" in line:
                continue
            if "__server__" in line:
                continue
            if any(pattern.search(line) for pattern in SECRET_PATTERNS):
                hits.append(f"{item.path}:{line_number}")
                break
    return hits


def _find_destructive_shell(context: RepositoryContext) -> list[str]:
    hits: list[str] = []
    pattern = re.compile(r"\brm\s+-rf\b|Remove-Item\s+.*-Recurse", re.I)
    for item in context.files:
        if item.text is None or item.path.startswith("tools/project_readiness_agent/"):
            continue
        if item.suffix not in {".yml", ".yaml", ".mjs", ".js", ".md", ".sh"}:
            continue
        if pattern.search(item.text):
            hits.append(item.path)
    return hits

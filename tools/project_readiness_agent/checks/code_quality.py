from __future__ import annotations

import re
from typing import Any

from ..context import RepositoryContext
from .common import build_result, finding

CATEGORY = "Code Quality"


def run(context: RepositoryContext, config: dict[str, Any]):
    findings = []
    code_files = [item for item in context.files if item.suffix in {".js", ".mjs", ".py", ".rs"} and item.text is not None]

    app = context.file_map.get("app.js")
    if app and app.lines > 8000:
        findings.append(
            finding(
                "CODE-001",
                CATEGORY,
                "high",
                "P1",
                f"app.js ({app.lines} lines)",
                "Client application logic is too concentrated",
                "The main browser bundle contains many unrelated flows in one file: catalog, auth, account, admin, cart, rendering, and state.",
                "Edge-case fixes become hard to localize and regression risk rises for every UI change.",
                "Extract stable modules by workflow, beginning with auth/account, catalog query/rendering, and admin/order state.",
            )
        )

    cart = context.file_map.get("cart.js")
    if cart and cart.lines > 1000:
        findings.append(
            finding(
                "CODE-002",
                CATEGORY,
                "medium",
                "P2",
                f"cart.js ({cart.lines} lines)",
                "Cart flow needs smaller testable units",
                "Cart behavior is implemented in a large browser script.",
                "Complex cart and checkout edge cases are difficult to cover without smaller pure functions.",
                "Extract calculation, validation, persistence, and DOM rendering helpers with focused tests.",
            )
        )

    if not any(path in context.file_map for path in ["eslint.config.js", ".eslintrc", ".eslintrc.json"]):
        findings.append(
            finding(
                "CODE-003",
                CATEGORY,
                "medium",
                "P2",
                "repository",
                "No standard lint configuration is detected",
                "The repository relies on custom `tools/autofix.mjs` checks but has no reusable ESLint/TypeScript lint layer.",
                "Custom checks are valuable, but they do not catch broad JavaScript correctness patterns or unsafe refactors.",
                "Add ESLint with a small ruleset that complements, not replaces, the existing custom invariant checks.",
            )
        )

    todo_hits = []
    todo_pattern = re.compile(r"\b(TODO|FIXME|HACK)\b", re.I)
    for item in code_files:
        if item.text and todo_pattern.search(item.text):
            todo_hits.append(item.path)
    if todo_hits:
        findings.append(
            finding(
                "CODE-004",
                CATEGORY,
                "low",
                "P3",
                ", ".join(todo_hits[:8]),
                "Open implementation markers need triage",
                f"{len(todo_hits)} code files contain TODO/FIXME/HACK markers.",
                "Untriaged markers are easy to forget during release readiness decisions.",
                "Convert real work into tracked checklist items and remove stale markers.",
            )
        )

    auth_path = "server-routes/_lib/auth.js" if context.existing("server-routes/_lib/auth.js") else "api/_lib/auth.js"
    auth_text = context.read_text(auth_path) if context.existing(auth_path) else ""
    if "decodeURIComponent(part.slice" in auth_text and "try" not in auth_text[auth_text.find("function parseCookies") : auth_text.find("function sessionCookie")]:
        findings.append(
            finding(
                "CODE-005",
                CATEGORY,
                "medium",
                "P2",
                auth_path,
                "Cookie parsing can throw on malformed input",
                "`parseCookies` decodes cookie parts without an isolated error guard.",
                "A malformed Cookie header can turn an auth lookup into a server error instead of a clean unauthenticated response.",
                "Wrap cookie decoding per pair and ignore malformed cookie fragments.",
                "If decoding fails, skip that cookie and continue parsing the rest.",
            )
        )

    summary = "Code is functional but needs stronger modularity, linting, and edge-case hardening."
    if not findings:
        summary = "No code-quality blockers were found by offline static checks."
    return build_result(CATEGORY, summary, findings, metadata={"code_files": len(code_files)})

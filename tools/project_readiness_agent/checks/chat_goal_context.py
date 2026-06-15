from __future__ import annotations

import re
from typing import Any

from ..context import RepositoryContext
from .common import build_result, finding

CATEGORY = "Chat / GoAL Context"

CONTEXT_NAME_RE = re.compile(r"(goal|goals|chat|prompt|prompts|agent|review|readiness|handoff|context|status)", re.I)


def run(context: RepositoryContext, config: dict[str, Any]):
    findings = []
    candidates = [
        item
        for item in context.files
        if item.text is not None and item.suffix in {".md", ".txt", ".log", ".yml", ".yaml", ".json"} and CONTEXT_NAME_RE.search(item.path)
    ]

    if not candidates:
        findings.append(
            finding(
                "CHAT-001",
                CATEGORY,
                "medium",
                "P2",
                "repository",
                "No repository chat/GoAL context artifacts were found",
                "The agent did not find local context files that describe current goals or chat handoff state.",
                "The generated GoAL prompt would rely only on code inspection and could miss product intent.",
                "Add a latest active context document or keep `reports/project-readiness/latest-chat.md` current.",
            )
        )

    findings.append(
        finding(
            "CHAT-002",
            CATEGORY,
            "info",
            "P3",
            "external chat / GoAL interface",
            "External chat access: unavailable",
            "The agent has no direct access to the external GoAL interface or old Sobag Opt chat history.",
            "This prevents verification of messages that are not saved in the repository.",
            "Use only repository artifacts for readiness decisions; start a new GoAL chat from the generated latest-chat prompt.",
        )
    )

    latest_context = [
        "reports/project-readiness/latest-chat.md",
        "reports/project-readiness/latest.md",
        "docs/ai-handoff/ACTIVE_CONTEXT.md",
        "docs/ai-handoff/CURRENT_STATUS.md",
        "docs/ai-handoff/NEXT_GOAL_PROMPT.md",
    ]
    available_latest = [path for path in latest_context if context.existing(path)]
    if not available_latest:
        findings.append(
            finding(
                "CHAT-003",
                CATEGORY,
                "high",
                "P1",
                ", ".join(latest_context),
                "No latest-context entrypoint is available",
                "The expected latest report, chat summary, or active handoff files are missing.",
                "A GoAL handoff could accidentally depend on stale or implicit chat history.",
                "Generate readiness reports and keep active handoff files current before opening a new GoAL chat.",
            )
        )

    stale_zip = context.existing("project-ai-handoff-latest.zip")
    if stale_zip:
        findings.append(
            finding(
                "CHAT-004",
                CATEGORY,
                "low",
                "P3",
                "project-ai-handoff-latest.zip",
                "Archive context should not outrank latest markdown reports",
                "A generated context ZIP exists, but the agent cannot inspect it deeply without expanding archive contents.",
                "Archives can lag behind `latest.md` and active handoff files.",
                "Use `reports/project-readiness/latest-chat.md` first, then linked markdown reports; treat ZIPs as optional transfer artifacts.",
            )
        )

    summary = "External chat is unavailable; only repository-saved context is used, with a new latest-context GoAL chat as the intended target."
    return build_result(CATEGORY, summary, findings, metadata={"context_candidates": [item.path for item in candidates[:40]]})

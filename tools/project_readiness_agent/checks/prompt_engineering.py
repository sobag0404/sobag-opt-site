from __future__ import annotations

import re
from typing import Any

from ..context import RepositoryContext
from .common import build_result, finding

CATEGORY = "Prompt Engineering"

PROMPT_PATH_RE = re.compile(r"(prompt|goal|handoff|agent|readiness|review)", re.I)


def run(context: RepositoryContext, config: dict[str, Any]):
    findings = []
    prompt_files = [
        item
        for item in context.files
        if item.text is not None and item.suffix in {".md", ".txt", ".yml", ".yaml"} and PROMPT_PATH_RE.search(item.path)
    ]

    if not prompt_files:
        findings.append(
            finding(
                "PROMPT-001",
                CATEGORY,
                "high",
                "P1",
                "repository",
                "No prompt/handoff artifacts were found",
                "The agent could not identify prompt, goal, handoff, or readiness files.",
                "GoAL handoff would lack reproducible context.",
                "Add a clear latest handoff prompt and keep it linked from readiness reports.",
            )
        )

    latest_chat = context.file_map.get("reports/project-readiness/latest-chat.md")
    if latest_chat and latest_chat.text and len(latest_chat.text) > int(config.get("reports", {}).get("chat_limit", 4000)):
        findings.append(
            finding(
                "PROMPT-002",
                CATEGORY,
                "high",
                "P1",
                "reports/project-readiness/latest-chat.md",
                "Latest GoAL chat prompt exceeds the 4000-character limit",
                "The short chat summary is too long for the requested GoAL handoff format.",
                "Operators may paste a truncated prompt and lose important constraints.",
                "Regenerate the summary with stricter compression and keep links to the full report.",
            )
        )

    stale_context_risk = []
    for item in prompt_files:
        text = item.text or ""
        if len(text) > 12000 and "ACTIVE_CONTEXT.md" not in text and "latest-chat.md" not in text:
            stale_context_risk.append(item.path)
    if stale_context_risk:
        findings.append(
            finding(
                "PROMPT-003",
                CATEGORY,
                "medium",
                "P2",
                ", ".join(stale_context_risk[:6]),
                "Long prompts risk pulling obsolete context into new chats",
                "Some prompt/handoff artifacts are long and do not clearly delegate to the latest active context.",
                "A new GoAL chat may overfit to old history instead of current blockers.",
                "For new runs, use `reports/project-readiness/latest-chat.md` as the entry prompt and link to the latest report/context files only.",
            )
        )

    for item in prompt_files:
        text = (item.text or "").lower()
        if "ignore previous" in text or "ignore all previous" in text:
            findings.append(
                finding(
                    "PROMPT-004",
                    CATEGORY,
                    "medium",
                    "P2",
                    item.path,
                    "Prompt contains broad context override language",
                    "A prompt contains language that may weaken higher-priority safety or repository instructions.",
                    "Broad override phrases can amplify prompt-injection risk.",
                    "Replace broad override language with a scoped instruction: use only the latest repository context for this task while preserving safety constraints.",
                )
            )
            break

    if context.existing("tools/project_readiness_agent/prompts/goal_prompt.md"):
        goal_template = context.read_text("tools/project_readiness_agent/prompts/goal_prompt.md")
        expected = ["role", "priority", "security", "latest"]
        if not all(word in goal_template.lower() for word in expected):
            findings.append(
                finding(
                    "PROMPT-005",
                    CATEGORY,
                    "medium",
                    "P2",
                    "tools/project_readiness_agent/prompts/goal_prompt.md",
                    "GoAL prompt template misses required prompt-engineering anchors",
                    "The template should contain role, priority, latest-context, and security constraints.",
                    "Generated prompts may be ambiguous for automated use.",
                    "Update the template with role, goal, context, tasks, priorities, constraints, expected result, and done criteria.",
                )
            )

    summary = "Prompt artifacts exist; generation uses full repository context, while new GoAL chats start from the latest readiness package."
    if not findings:
        summary = "Prompt artifacts are suitable for a latest-context GoAL handoff."
    return build_result(CATEGORY, summary, findings, metadata={"prompt_files": [item.path for item in prompt_files[:30]]})

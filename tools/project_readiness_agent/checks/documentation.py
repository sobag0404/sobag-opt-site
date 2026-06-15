from __future__ import annotations

from typing import Any

from ..context import RepositoryContext
from .common import build_result, finding

CATEGORY = "Documentation"


def run(context: RepositoryContext, config: dict[str, Any]):
    findings = []
    required = [
        "README.md",
        "docs/deploy-checklist.md",
        "docs/backend-security.md",
        "docs/ai-handoff/ACTIVE_CONTEXT.md",
        "docs/ai-handoff/CURRENT_STATUS.md",
        "docs/project-readiness-agent.md",
    ]
    missing = [path for path in required if not context.existing(path)]
    if missing:
        findings.append(
            finding(
                "DOC-001",
                CATEGORY,
                "medium",
                "P2",
                ", ".join(missing),
                "Required handoff documentation is missing",
                "One or more expected operational/handoff documents were not found.",
                "A new developer or GoAL executor may miss current constraints and deployment rules.",
                "Create the missing documents or update the readiness-agent config if the project intentionally uses different paths.",
            )
        )

    readme = context.read_text("README.md") if context.existing("README.md") else ""
    stale_readme_markers = [
        "Проект статический",
        "достаточно открыть `index.html`",
        "задеплоить папку на Vercel",
    ]
    if readme and any(marker in readme for marker in stale_readme_markers) and context.existing("server.mjs") and context.existing("docs/vps-launch-runbook.md"):
        findings.append(
            finding(
                "DOC-002",
                CATEGORY,
                "high",
                "P1",
                "README.md",
                "README appears stale relative to VPS/backend reality",
                "README still describes the project as mostly static/Vercel-oriented while the repository contains VPS server, API routes, auth, storage, CI, and Rust migration docs.",
                "A handoff recipient can start from the wrong deployment/runtime model.",
                "Update README with current production architecture, local commands, VPS workflow, required env names, and links to active handoff docs.",
            )
        )

    docs = [item for item in context.glob("docs/*.md") + context.glob("docs/ai-handoff/*.md")]
    if len(docs) > 20 and not context.existing("docs/README.md"):
        findings.append(
            finding(
                "DOC-003",
                CATEGORY,
                "low",
                "P3",
                "docs/",
                "Documentation set needs an index",
                f"{len(docs)} markdown documents exist under docs without a detected docs index.",
                "Relevant runbooks are easy to miss as the repository grows.",
                "Add `docs/README.md` that maps active runbooks, historical plans, and GoAL handoff files.",
            )
        )

    if context.existing("docs/project-readiness-agent.md"):
        doc = context.read_text("docs/project-readiness-agent.md")
        lowered = doc.lower()
        expected_phrases = ["python tools/project_readiness_agent/run.py", "github actions", "limitations", "new check"]
        missing_phrases = [phrase for phrase in expected_phrases if phrase not in lowered]
        if missing_phrases:
            findings.append(
                finding(
                    "DOC-004",
                    CATEGORY,
                    "medium",
                    "P2",
                    "docs/project-readiness-agent.md",
                    "Readiness-agent documentation is incomplete",
                    "The agent documentation misses one or more required operational topics.",
                    "Future maintainers may not know how to run, extend, or interpret the agent.",
                    "Document local run, scheduled run, config, extension points, report paths, and limitations.",
                )
            )

    summary = "Documentation is extensive but README and discoverability need tightening."
    if not findings:
        summary = "Documentation covers the scanned readiness topics."
    return build_result(CATEGORY, summary, findings, metadata={"docs_count": len(context.glob("docs/**/*.md"))})

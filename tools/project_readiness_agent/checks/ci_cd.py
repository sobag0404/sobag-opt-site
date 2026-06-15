from __future__ import annotations

import re
from typing import Any

from ..context import RepositoryContext
from .common import build_result, finding

CATEGORY = "CI/CD"


def run(context: RepositoryContext, config: dict[str, Any]):
    findings = []
    workflows = context.glob(".github/workflows/*.yml") + context.glob(".github/workflows/*.yaml")
    workflow_paths = {item.path for item in workflows}

    readiness_path = ".github/workflows/project-readiness-agent.yml"
    if readiness_path not in workflow_paths:
        findings.append(
            finding(
                "CICD-001",
                CATEGORY,
                "high",
                "P1",
                readiness_path,
                "Scheduled readiness-agent workflow is missing",
                "The required workflow file was not found.",
                "The agent will not run every 15 minutes in GitHub Actions.",
                "Add `.github/workflows/project-readiness-agent.yml` with `*/15 * * * *` and manual dispatch.",
            )
        )
    else:
        text = context.read_text(readiness_path)
        if "*/15 * * * *" not in text:
            findings.append(
                finding(
                    "CICD-002",
                    CATEGORY,
                    "high",
                    "P1",
                    readiness_path,
                    "Readiness workflow cron is incorrect",
                    "The workflow exists but does not contain the required 15-minute cron.",
                    "The agent would not run at the requested cadence.",
                    "Set schedule cron to `*/15 * * * *`.",
                )
            )
        if "workflow_dispatch" not in text:
            findings.append(
                finding(
                    "CICD-003",
                    CATEGORY,
                    "medium",
                    "P2",
                    readiness_path,
                    "Readiness workflow lacks manual dispatch",
                    "Manual workflow launch was not detected.",
                    "Operators need a way to refresh reports outside the schedule.",
                    "Add `workflow_dispatch`.",
                )
            )
        if "contents: write" not in text and "git commit" in text:
            findings.append(
                finding(
                    "CICD-004",
                    CATEGORY,
                    "medium",
                    "P2",
                    readiness_path,
                    "Report commit step lacks matching write permission",
                    "A workflow that commits reports needs `contents: write`.",
                    "The commit step may fail or rely on implicit permissions.",
                    "Declare `permissions: contents: write` only for this workflow.",
                )
            )

    for workflow in workflows:
        text = workflow.text or ""
        if "permissions:" not in text:
            findings.append(
                finding(
                    "CICD-005",
                    CATEGORY,
                    "medium",
                    "P2",
                    workflow.path,
                    "Workflow permissions are implicit",
                    "At least one workflow lacks an explicit permissions block.",
                    "Implicit permissions are harder to audit and can vary by repository setting.",
                    "Add explicit minimal permissions to each workflow.",
                )
            )
            break
        if uses_unpinned_actions(text):
            findings.append(
                finding(
                    "CICD-006",
                    CATEGORY,
                    "low",
                    "P3",
                    workflow.path,
                    "Actions are version-pinned but not SHA-pinned",
                    "Workflow actions use version tags such as `@v4`.",
                    "Tag pinning is common, but SHA pinning gives stronger supply-chain integrity.",
                    "For high-assurance workflows, pin third-party actions by SHA and review update cadence.",
                )
            )
            break

    if "check" not in (context.package.get("scripts", {}) if isinstance(context.package.get("scripts"), dict) else {}):
        findings.append(
            finding(
                "CICD-007",
                CATEGORY,
                "high",
                "P1",
                "package.json",
                "CI validation script is missing",
                "No `check` script was detected.",
                "Push/PR validation cannot share a standard local command.",
                "Add `npm run check` or update workflows to the current validation command.",
            )
        )

    summary = "CI/CD has useful smoke/deploy gates; permissions and readiness schedule are the main audit points."
    if not findings:
        summary = "CI/CD checks match the readiness-agent requirements."
    return build_result(CATEGORY, summary, findings, metadata={"workflows": sorted(workflow_paths)})


def uses_unpinned_actions(text: str) -> bool:
    for match in re.finditer(r"uses:\s*[^@\s]+@([^\s]+)", text):
        ref = match.group(1)
        if not re.fullmatch(r"[a-f0-9]{40}", ref):
            return True
    return False

from __future__ import annotations

from typing import Any

from ..context import RepositoryContext
from .common import build_result, finding

CATEGORY = "Tests"


def run(context: RepositoryContext, config: dict[str, Any]):
    findings = []
    command_results = context.command_results or context.run_configured_commands()
    test_files = [
        item.path
        for item in context.files
        if item.path.endswith((".test.mjs", ".spec.js", "_test.py")) or "/tests/" in f"/{item.path}"
    ]

    if not test_files:
        findings.append(
            finding(
                "TEST-001",
                CATEGORY,
                "high",
                "P1",
                "repository",
                "No automated tests were detected",
                "No test/spec files were found in the scanned repository context.",
                "The project cannot be safely handed off without an executable regression baseline.",
                "Add focused tests for critical order, auth, catalog, and readiness-agent behavior.",
            )
        )
    elif len(test_files) < 4:
        findings.append(
            finding(
                "TEST-001",
                CATEGORY,
                "medium",
                "P2",
                ", ".join(test_files),
                "Automated test surface is thin",
                f"Only {len(test_files)} test/spec files were detected.",
                "A small test set can miss regressions in auth, orders, imports, and deployment gates.",
                "Add focused unit tests around high-risk business logic and keep smoke tests for integration paths.",
            )
        )

    package_scripts = context.package.get("scripts", {}) if isinstance(context.package.get("scripts"), dict) else {}
    for script in ["check", "ui:smoke"]:
        if script not in package_scripts:
            findings.append(
                finding(
                    f"TEST-MISSING-{script.upper().replace(':', '-')}",
                    CATEGORY,
                    "medium",
                    "P2",
                    "package.json",
                    f"`npm run {script}` is not defined",
                    "Expected validation script is missing from package.json.",
                    "Developers and CI lose a standard command for regression checks.",
                    f"Add or document the replacement for `npm run {script}`.",
                )
            )

    for result in command_results:
        if result.skipped:
            findings.append(
                finding(
                    "TEST-002",
                    CATEGORY,
                    "medium",
                    "P2",
                    result.command,
                    "Configured verification command was skipped",
                    f"`{result.command}` did not run because command execution is disabled.",
                    "Readiness scoring is less reliable when executable checks are skipped.",
                    "Run the agent with command execution enabled before GoAL handoff.",
                )
            )
            continue
        if not result.ok:
            severity = "high" if result.command.startswith("npm") else "medium"
            priority = "P1" if severity == "high" else "P2"
            reason = result.error or f"exit code {result.returncode}"
            findings.append(
                finding(
                    "TEST-003",
                    CATEGORY,
                    severity,
                    priority,
                    result.command,
                    "Configured verification command failed",
                    f"`{result.command}` failed: {reason}. Output was captured with secret masking.",
                    "A failing local/CI gate blocks reliable handoff.",
                    "Fix the failing command before marking the project ready.",
                    (result.stderr or result.stdout)[:800],
                )
            )

    if "ui:smoke" in package_scripts and not any("ui:smoke" in result.command for result in command_results):
        findings.append(
            finding(
                "TEST-004",
                CATEGORY,
                "low",
                "P3",
                "package.json",
                "Browser smoke exists but is not run by the readiness agent",
                "`npm run ui:smoke` is available, but the default readiness agent avoids launching a browser every 15 minutes.",
                "UI regressions may remain undetected between explicit smoke runs.",
                "Run UI smoke before release/cutover or add a separate scheduled browser workflow if runtime cost is acceptable.",
            )
        )

    summary = "Executable checks are captured in the report; failed commands are treated as readiness blockers."
    if not findings:
        summary = "Configured tests and checks passed."
    return build_result(CATEGORY, summary, findings, metadata={"test_files": test_files, "commands": [r.command for r in command_results]})

from __future__ import annotations

from pathlib import Path
from typing import Any

from ..context import RepositoryContext
from .common import build_result, finding

CATEGORY = "Architecture"


def run(context: RepositoryContext, config: dict[str, Any]):
    findings = []
    scan = config.get("scan", {})
    large_lines = int(scan.get("large_file_lines", 1500))
    huge_lines = int(scan.get("huge_file_lines", 5000))

    code_files = [item for item in context.files if item.suffix in {".js", ".mjs", ".py", ".rs"} and item.lines]
    huge = [item for item in code_files if item.lines >= huge_lines]
    large = [item for item in code_files if large_lines <= item.lines < huge_lines]
    if huge:
        locations = ", ".join(f"{item.path} ({item.lines} lines)" for item in huge[:5])
        findings.append(
            finding(
                "ARCH-001",
                CATEGORY,
                "high",
                "P1",
                locations,
                "Monolithic implementation files dominate key behavior",
                "One or more source files are large enough to hide unrelated responsibilities and make regression review expensive.",
                "Large files increase merge risk, make ownership unclear, and slow down senior review of critical flows.",
                "Split high-churn UI/API responsibilities into route, state, rendering, and domain modules after current release blockers are controlled.",
                "Start with extracting auth/account, catalog rendering, and admin/order flows from the largest client file.",
            )
        )
    elif large:
        locations = ", ".join(f"{item.path} ({item.lines} lines)" for item in large[:5])
        findings.append(
            finding(
                "ARCH-001",
                CATEGORY,
                "medium",
                "P2",
                locations,
                "Large source files need explicit ownership",
                "Several implementation files are above the configured size threshold.",
                "The project is still maintainable, but future changes will be harder to isolate.",
                "Document ownership boundaries and extract modules when touching these areas.",
            )
        )

    runtimes = [name for name in ["api", "server-routes", "rust-server"] if context.existing(name)]
    if len(runtimes) >= 3:
        findings.append(
            finding(
                "ARCH-002",
                CATEGORY,
                "medium",
                "P1",
                ", ".join(runtimes),
                "Multiple backend surfaces are active in one repository",
                "The repository contains legacy API compatibility wrappers, VPS server routes, and a Rust migration surface.",
                "Without a strict source-of-truth map, route behavior can drift between Node compatibility and Rust preview/cutover code.",
                "Keep a route ownership matrix in docs and require parity smoke tests before switching any public path.",
                "For each route, record: public URL, current authority, shadow implementation, write/read mode, rollback command.",
            )
        )

    root_html = [item for item in context.files if "/" not in item.path and item.suffix == ".html"]
    if len(root_html) > 12 and not context.existing("components/site-shell.js"):
        findings.append(
            finding(
                "ARCH-003",
                CATEGORY,
                "medium",
                "P2",
                "root HTML pages",
                "Static pages do not have an obvious shared shell",
                "The project has many top-level HTML pages and no detected shell component.",
                "Repeated layout markup can drift between pages.",
                "Introduce or document a single shell/header/footer ownership pattern.",
            )
        )
    elif len(root_html) > 12:
        findings.append(
            finding(
                "ARCH-003",
                CATEGORY,
                "low",
                "P3",
                "root HTML pages",
                "Many static entry points require shell discipline",
                f"{len(root_html)} top-level HTML pages are present.",
                "A shared shell exists, but page-level drift remains a recurring risk in a static multi-page site.",
                "Keep the shell checks in `npm run check` and avoid adding page-local header/footer markup.",
            )
        )

    root_pngs = [item for item in context.files if "/" not in item.path and item.suffix == ".png"]
    tracked_root_pngs = [item for item in root_pngs if item.path in context.tracked_files]
    if len(tracked_root_pngs) > 10:
        findings.append(
            finding(
                "ARCH-004",
                CATEGORY,
                "medium",
                "P2",
                "repository root",
                "Tracked QA screenshots pollute the application root",
                f"{len(tracked_root_pngs)} root-level PNG files are tracked.",
                "Large binary artifacts increase clone size and obscure source changes in reviews.",
                "Move historical screenshots to release artifacts or a dedicated ignored QA archive; keep only current reference images that are intentionally reviewed.",
            )
        )

    duplicate_libs = _matching_lib_wrappers(context)
    if duplicate_libs:
        findings.append(
            finding(
                "ARCH-005",
                CATEGORY,
                "info",
                "P3",
                "api/_lib and server-routes/_lib",
                "Compatibility wrappers are present and should remain thin",
                f"{len(duplicate_libs)} API library compatibility wrappers point at server-route library files.",
                "This is acceptable when wrappers only re-export canonical modules; it becomes risky if logic forks.",
                "Keep wrappers as one-line re-exports or remove the duplicate surface after Vercel compatibility is retired.",
            )
        )

    summary = "Architecture is serviceable but carries clear modularity and migration-surface risk."
    if not findings:
        summary = "Architecture has no obvious blocker in the scanned repository context."
    return build_result(CATEGORY, summary, findings, metadata={"code_files": len(code_files), "top_level_html": len(root_html)})


def _matching_lib_wrappers(context: RepositoryContext) -> list[str]:
    result: list[str] = []
    for item in context.glob("server-routes/_lib/*.js"):
        peer = f"api/_lib/{Path(item.path).name}"
        if peer in context.file_map:
            result.append(item.path)
    return result

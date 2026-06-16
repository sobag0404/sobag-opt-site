from __future__ import annotations

import json
from typing import Any

from ..context import RepositoryContext
from .common import build_result, finding

CATEGORY = "Product Readiness"


def run(context: RepositoryContext, config: dict[str, Any]):
    findings = []
    package_scripts = context.package.get("scripts", {}) if isinstance(context.package.get("scripts"), dict) else {}
    expected_gates = [
        "audit:goal-readiness",
        "audit:goal-completion",
        "smoke:prod",
        "audit:errors",
        "audit:access",
        "audit:vps-release",
    ]
    missing_gates = [script for script in expected_gates if script not in package_scripts]
    if missing_gates:
        findings.append(
            finding(
                "PROD-001",
                CATEGORY,
                "medium",
                "P2",
                "package.json",
                "Expected product readiness gates are missing",
                "Some standard product/release validation scripts were not found.",
                "The project is harder to hand off when readiness gates are not encoded as commands.",
                "Add the missing scripts or document the replacement commands in the active handoff.",
            )
        )

    real_input_packets = [
        "local-import-output/final-content-packet.json",
        "local-import-output/object-storage-env-packet.json",
        "local-import-output/catalog-db-env-packet.json",
        "local-import-output/cwv-field-audit-packet.json",
        "local-import-output/vps-rust-cutover-packet.json",
    ]
    missing_packets = [path for path in real_input_packets if not context.existing(path)]
    incomplete_packets = [path for path in real_input_packets if context.existing(path) and _packet_incomplete(context, path)]
    cwv_packet = "local-import-output/cwv-field-audit-packet.json"
    cwv_synthetic_ready = _synthetic_cwv_ready(context)
    cwv_field_pending = cwv_packet in incomplete_packets and cwv_synthetic_ready
    blocking_incomplete_packets = [path for path in incomplete_packets if path != cwv_packet or not cwv_synthetic_ready]
    if missing_packets or blocking_incomplete_packets:
        location = ", ".join([*missing_packets, *blocking_incomplete_packets])
        title = "Real external input packets are not available" if missing_packets else "Real external input packets are incomplete"
        description = (
            "The active GoAL completion audit requires real no-secret input packets for final content, storage, catalog DB, CWV field audit, and VPS/Rust cutover."
        )
        if blocking_incomplete_packets:
            description += " One or more packet files exist but still contain template/pending values."
        findings.append(
            finding(
                "PROD-002",
                CATEGORY,
                "high",
                "P1",
                location,
                title,
                description,
                "Without these inputs, the project cannot honestly be declared ready for the next production/cutover stage.",
                "Collect the real packets locally, keep secrets out of Git/chat, then run strict goal completion/readiness audits.",
            )
        )
    if cwv_field_pending:
        findings.append(
            finding(
                "PROD-002",
                CATEGORY,
                "low",
                "P3",
                cwv_packet,
                "Real field CWV packet remains pending",
                "The CWV field packet is still a template, but deploy, Rust/VPS, production smoke, and synthetic 10k catalog/performance evidence are recorded.",
                "The Rust/VPS transition can be handed off with warnings, but real post-launch field data is still needed for ongoing product monitoring.",
                "Collect real field CWV after production traffic is available; keep synthetic evidence separate from field data.",
            )
        )

    if context.existing("project-ai-handoff-latest.zip"):
        tracked = "project-ai-handoff-latest.zip" in context.tracked_files
        findings.append(
            finding(
                "PROD-003",
                CATEGORY,
                "medium" if tracked else "low",
                "P2" if tracked else "P3",
                "project-ai-handoff-latest.zip",
                "Generated handoff ZIP is present in the repository workspace",
                "The workspace contains a generated handoff archive.",
                "Archives can become stale quickly and may accidentally include sensitive or obsolete context.",
                "Regenerate the archive only from reviewed no-secret files and avoid relying on it as the source of truth.",
            )
        )

    active_context = context.read_text("docs/ai-handoff/ACTIVE_CONTEXT.md") if context.existing("docs/ai-handoff/ACTIVE_CONTEXT.md") else ""
    if "future no-Node migration" in active_context or "Rust" in active_context:
        findings.append(
            finding(
                "PROD-004",
                CATEGORY,
                "info",
                "P3",
                "docs/ai-handoff/ACTIVE_CONTEXT.md",
                "Next-stage migration context is available",
                "The repository documents the current Node/VPS path and the later Rust/no-Node migration direction.",
                "This helps handoff, but it also means GoAL prompts must distinguish current blockers from the active Rust transition finish line.",
                "Use the next GoAL prompt to finish the Rust transition only after P0/P1 readiness blockers are controlled.",
            )
        )

    rust_required = [
        "rust-server/Cargo.toml",
        "rust-server/src/main.rs",
        "tools/rust-auth-me-cutover-smoke.mjs",
        "tools/rust-auth-write-cutover-smoke.mjs",
        "tools/rust-orders-write-smoke.mjs",
        "tools/rust-admin-orders-cutover-smoke.mjs",
        "tools/rust-ssr-cutover-audit.mjs",
    ]
    missing_rust = [path for path in rust_required if not context.existing(path)]
    if missing_rust:
        findings.append(
            finding(
                "PROD-005",
                CATEGORY,
                "high",
                "P1",
                ", ".join(missing_rust),
                "Rust transition finish line is missing required artifacts",
                "The active project goal is to complete the Rust transition, but required Rust server or cutover smoke artifacts are missing.",
                "Without these artifacts, a GoAL run cannot safely finish or verify the Rust cutover.",
                "Restore or implement the missing Rust server/cutover smoke files before attempting production route switches.",
            )
        )

    rust_scripts = [
        "smoke:rust:ssr",
        "smoke:rust:public-routes",
        "smoke:rust:auth-me-cutover",
        "smoke:rust:auth-write-cutover",
        "smoke:rust:orders-write",
        "smoke:rust:orders-briefs-cutover",
        "smoke:rust:admin-orders-cutover",
        "smoke:rust:admin-users-cutover",
        "smoke:rust:admin-content-cutover",
        "audit:rust-account-cutover",
        "audit:rust-ssr-cutover",
    ]
    missing_rust_scripts = [script for script in rust_scripts if script not in package_scripts]
    if missing_rust_scripts:
        findings.append(
            finding(
                "PROD-006",
                CATEGORY,
                "medium",
                "P2",
                "package.json",
                "Rust transition smoke/audit script coverage is incomplete",
                "Some expected Rust migration scripts are absent from package.json.",
                "The handoff recipient may not have a repeatable way to verify cutover safety.",
                "Add missing Rust scripts or update the readiness config to the current canonical script names.",
            )
        )

    summary = "Product readiness is constrained by missing real external packets and Rust cutover verification gates."
    if not findings:
        summary = "Product readiness gates and context are present in the scanned repository."
    elif cwv_field_pending and not missing_packets and not blocking_incomplete_packets:
        summary = "Product readiness gates passed; real field CWV remains a post-launch monitoring warning."
    return build_result(CATEGORY, summary, findings, metadata={"missing_packets": missing_packets, "incomplete_packets": incomplete_packets})


def _packet_incomplete(context: RepositoryContext, path: str) -> bool:
    try:
        text = context.read_text(path)
        packet = json.loads(text)
    except (OSError, json.JSONDecodeError):
        return True
    if "TODO" in text or "todo" in text:
        return True
    if path.endswith("object-storage-env-packet.json"):
        return not all(packet.get(field) is True for field in ["credentialsConfirmed", "publicReadConfirmed", "corsConfirmed"])
    if path.endswith("catalog-db-env-packet.json"):
        return packet.get("schemaApplied") is not True or packet.get("rollbackRehearsalConfirmed") is not True
    if path.endswith("cwv-field-audit-packet.json"):
        return packet.get("imageMigrationReady") is not True or any(_zero_metric(page) for page in packet.get("pages", []))
    return False


def _zero_metric(page: dict[str, Any]) -> bool:
    return any(float(page.get(field, 0) or 0) <= 0 for field in ["lcpMs", "firstPageApiKb"])


def _synthetic_cwv_ready(context: RepositoryContext) -> bool:
    structured_path = "reports/project-readiness/synthetic-cwv-evidence.json"
    doc_path = "docs/synthetic-cwv-readiness-evidence.md"
    if not context.existing(structured_path) or not context.existing(doc_path):
        return False
    try:
        evidence = json.loads(context.read_text(structured_path))
    except json.JSONDecodeError:
        return False
    external_gates = evidence.get("externalGates", {})
    synthetic_gates = evidence.get("syntheticGates", {})
    scale_smoke = synthetic_gates.get("catalogQueryScaleSmoke", {})
    return (
        evidence.get("evidenceType") == "synthetic"
        and evidence.get("fieldDataAvailable") is False
        and all(external_gates.get(name) == "PASS" for name in ["autofix-check", "rust-check", "vps-deploy", "production-smoke"])
        and scale_smoke.get("status") == "PASS"
        and int(scale_smoke.get("products", 0) or 0) >= 10000
        and int(scale_smoke.get("pageSize", 0) or 0) >= 48
        and synthetic_gates.get("audit:cwv") == "PASS"
        and synthetic_gates.get("smoke:prod:performance -- --self-test") == "PASS"
        and synthetic_gates.get("npm.cmd run check") == "PASS"
        and bool(evidence.get("postLaunchMonitoring"))
    )

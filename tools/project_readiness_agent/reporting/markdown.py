from __future__ import annotations

from collections import defaultdict
from pathlib import Path

from ..models import CheckResult, Finding, ProjectReport, Recommendation


TABLE_CATEGORIES = [
    "Architecture",
    "Code Quality",
    "Security",
    "Tests",
    "Documentation",
    "CI/CD",
    "Product Readiness",
    "Prompt Engineering",
]

FINDING_SECTIONS = [
    "Architecture",
    "Code Quality",
    "Security",
    "Tests",
    "Documentation",
    "CI/CD",
    "Product Readiness",
    "Prompt Engineering",
    "Chat / GoAL Context",
]

PRIORITY_ORDER = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}


def render_full_report(report: ProjectReport) -> str:
    by_category = {result.category: result for result in report.check_results}
    lines: list[str] = []
    lines.append("# Project Readiness Report")
    lines.append("")
    lines.append(f"Generated: {report.generated_at.isoformat()}")
    lines.append(f"Project: {report.project_name}")
    lines.append(f"Git: `{report.metadata.get('branch', 'unavailable')}` / `{report.metadata.get('commit', 'unavailable')}`")
    lines.append("")
    lines.append("## 1. Executive Summary")
    lines.append("")
    lines.append(report.summary)
    lines.append("")
    lines.append(f"- Итоговая оценка: **{report.score}/100**")
    lines.append(f"- Итоговый статус: **{report.status}**")
    lines.append(f"- Главный вывод: **{report.decision}**")
    lines.append("")
    lines.append("## 2. Readiness Score")
    lines.append("")
    lines.append("| Категория | Оценка | Статус | Комментарий |")
    lines.append("| --------- | -----: | ------ | ----------- |")
    for category in TABLE_CATEGORIES:
        result = by_category.get(category)
        if not result:
            lines.append(f"| {category} | 0 | MISSING | Проверка не выполнена. |")
            continue
        lines.append(f"| {category} | {result.score} | {result.status} | {escape_table(result.summary)} |")
    lines.append("")
    lines.append("## 3. Critical Blockers")
    lines.append("")
    critical = [finding for finding in report.findings if finding.severity == "critical"]
    if critical:
        for item in critical:
            lines.append(f"- **{item.id}** `{item.location}`: {item.title}")
    else:
        lines.append("Критичных блокеров не найдено.")
    lines.append("")
    lines.append("## 4. Findings")
    lines.append("")
    findings_by_category: dict[str, list[Finding]] = defaultdict(list)
    for item in report.findings:
        findings_by_category[item.category].append(item)
    for category in FINDING_SECTIONS:
        lines.append(f"### {category}")
        lines.append("")
        items = sorted(findings_by_category.get(category, []), key=lambda item: (SEVERITY_ORDER[item.severity], item.id))
        if not items:
            lines.append("Проблем не найдено.")
            lines.append("")
            continue
        for item in items:
            lines.extend(render_finding(item))
            lines.append("")
    lines.append("## 5. Recommendations")
    lines.append("")
    recommendations_by_priority: dict[str, list[Recommendation]] = defaultdict(list)
    for recommendation in report.recommendations:
        recommendations_by_priority[recommendation.priority].append(recommendation)
    for priority in ["P0", "P1", "P2", "P3"]:
        lines.append(f"### {priority}")
        lines.append("")
        items = recommendations_by_priority.get(priority, [])
        if not items:
            lines.append("Нет рекомендаций.")
        else:
            for item in items:
                suffix = f" ({item.finding_id})" if item.finding_id else ""
                lines.append(f"- [{item.category}]{suffix} {item.text}")
        lines.append("")
    lines.append("## 6. GoAL Readiness Decision")
    lines.append("")
    lines.append(f"Решение: **{report.decision}**.")
    lines.append("")
    lines.append(_decision_rationale(report))
    lines.append("")
    lines.append("## 7. GoAL Prompt")
    lines.append("")
    lines.append("```text")
    lines.append(report.goal_prompt.strip())
    lines.append("```")
    lines.append("")
    lines.append("## 8. Changed Files / Relevant Links")
    lines.append("")
    for link in report.links:
        lines.append(f"- `{link}`")
    if report.metadata.get("status"):
        lines.append("- Git working tree status:")
        for line in str(report.metadata["status"]).splitlines()[:20]:
            lines.append(f"  - `{line}`")
    else:
        lines.append("- Git working tree status: clean at scan time.")
    lines.append("- Diff/PR URL: unavailable in local repository context.")
    lines.append("")
    lines.append("## 9. Limitations")
    lines.append("")
    for limitation in report.limitations:
        lines.append(f"- {limitation}")
    lines.append("")
    lines.append("## 10. Validation Method")
    lines.append("")
    lines.append("Logical roles/check modules used:")
    for role in report.metadata.get("check_modules", []):
        lines.append(f"- {role}")
    lines.append("")
    lines.append("Local commands executed by the readiness agent:")
    commands = report.metadata.get("commands", [])
    if commands:
        for item in commands:
            status = "SKIPPED" if item.get("skipped") else "PASS" if item.get("ok") else "FAIL"
            suffix = " (timed out)" if item.get("timed_out") else ""
            lines.append(f"- {status}: `{item.get('command', '')}`{suffix}")
    else:
        lines.append("- No configured commands were recorded.")
    lines.append("")
    lines.append("Heavy/browser checks are not part of the scheduled readiness run; run `npm run ui:smoke` before UI/API release or cutover work.")
    lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_chat_summary(report: ProjectReport, limit: int = 4000) -> str:
    top_findings = sorted(
        [item for item in report.findings if item.severity in {"critical", "high", "medium"}],
        key=lambda item: (SEVERITY_ORDER[item.severity], PRIORITY_ORDER[item.priority], item.id),
    )[:6]
    recs = sorted(report.recommendations, key=lambda item: (PRIORITY_ORDER[item.priority], item.finding_id or item.text))[:6]
    prompt = compact_goal_prompt(report.goal_prompt, max_chars=900)
    next_packet = [
        "Next implementation packet:",
        "1. Run the real product-photo migration gates against the confirmed photo source and S3-compatible MinIO target; keep secrets out of chat/Git.",
        "2. Fill `local-import-output/cwv-field-audit-packet.json` only from real post-migration field measurements, then run strict goal-input gates.",
        "3. Keep Vercel/Next absent from active runtime/deploy; rerun VPS release, storage, error, and smoke audits after each cutover step.",
        "4. Re-verify Rust on Linux/VPS/CI with `cd rust-server && cargo fmt --check && cargo check --locked && cargo test --locked`; Windows MSVC `link.exe` remains local-only.",
        "5. Continue only small modularity slices when touching related code; large file ownership is remaining P2 debt.",
    ]
    lines = [
        f"\u0421\u0442\u0430\u0442\u0443\u0441 \u043f\u0440\u043e\u0435\u043a\u0442\u0430: {report.status}.",
        f"\u041e\u0446\u0435\u043d\u043a\u0430 \u0433\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u0438: {report.score}/100.",
        "\u0413\u043b\u0430\u0432\u043d\u044b\u0435 \u0431\u043b\u043e\u043a\u0435\u0440\u044b: " + ("; ".join(f"{item.id} {item.severity}: {item.title}" for item in top_findings) if top_findings else "\u043d\u0435\u0442 critical/high \u0431\u043b\u043e\u043a\u0435\u0440\u043e\u0432."),
        "\u0413\u043b\u0430\u0432\u043d\u044b\u0435 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u0438: " + ("; ".join(f"{item.priority} {item.finding_id}: {item.text}" for item in recs) if recs else "\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0442\u044c \u0442\u0435\u043a\u0443\u0449\u0438\u0435 gates."),
        f"\u0420\u0435\u0448\u0435\u043d\u0438\u0435: {report.decision}.",
        (
            "\u0421\u0441\u044b\u043b\u043a\u0438: reports/project-readiness/latest.md; reports/project-readiness/latest-chat.md; "
            ".github/workflows/project-readiness-agent.yml; tools/project_readiness_agent/run.py; "
            "tools/project_readiness_agent/config.yml. "
            f"Diff/commit/PR: commit {report.metadata.get('commit', 'unavailable')}; PR unavailable in local context."
        ),
        "",
        *next_packet,
        "",
        "\u041f\u0440\u043e\u043c\u043f\u0442 \u0434\u043b\u044f \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0435\u0433\u043e GoAL-\u0447\u0430\u0442\u0430:",
        prompt,
    ]
    text = "\n".join(lines).strip() + "\n"
    if len(text) <= limit:
        return text
    compact_lines = [
        *next_packet,
        f"\u0421\u0442\u0430\u0442\u0443\u0441 \u043f\u0440\u043e\u0435\u043a\u0442\u0430: {report.status}. \u041e\u0446\u0435\u043d\u043a\u0430: {report.score}/100.",
        "\u0411\u043b\u043e\u043a\u0435\u0440\u044b: " + ("; ".join(f"{item.id}: {item.title}" for item in top_findings[:4]) if top_findings else "\u043d\u0435\u0442 critical/high."),
        "\u0420\u0435\u0448\u0435\u043d\u0438\u0435: " + report.decision + ".",
        f"\u041e\u0442\u0447\u0451\u0442: reports/project-readiness/latest.md. GoAL: reports/project-readiness/latest-chat.md. Commit: {report.metadata.get('commit', 'unavailable')}; PR unavailable.",
        "\u041f\u0440\u043e\u043c\u043f\u0442: \u043e\u0442\u043a\u0440\u043e\u0439 \u043d\u043e\u0432\u044b\u0439 GoAL-\u0447\u0430\u0442 \u0438\u0437 \u044d\u0442\u043e\u0433\u043e \u0444\u0430\u0439\u043b\u0430 \u0438 `latest.md`; \u0442\u0435\u043a\u0443\u0449\u0430\u044f \u0441\u0442\u0430\u0440\u0442\u043e\u0432\u0430\u044f \u0442\u043e\u0447\u043a\u0430 \u0442\u043e\u043b\u044c\u043a\u043e latest readiness package \u0438 \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0435 repo artifacts. \u0421\u043d\u0430\u0447\u0430\u043b\u0430 P0/P1, \u0431\u0435\u0437 \u043b\u0438\u0448\u043d\u0438\u0445 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0439, \u043d\u0435 \u043f\u0435\u0447\u0430\u0442\u0430\u0442\u044c \u0441\u0435\u043a\u0440\u0435\u0442\u044b.",
    ]
    text = "\n".join(compact_lines).strip() + "\n"
    return text[: limit - 40].rstrip() + "\n[truncated to 4000 chars]\n" if len(text) > limit else text


def render_finding(item: Finding) -> list[str]:
    lines = [
        f"#### {item.id}: {item.title}",
        "",
        f"- Severity: `{item.severity}`",
        f"- Priority: `{item.priority}`",
        f"- File / area: `{item.location}`",
        f"- Description: {item.description}",
        f"- Why it matters: {item.impact}",
        f"- Recommendation: {item.recommendation}",
    ]
    if item.example:
        lines.append(f"- Example: {item.example}")
    return lines


def write_reports(report: ProjectReport, full_path: Path, chat_path: Path, chat_limit: int) -> tuple[str, str]:
    full_path.parent.mkdir(parents=True, exist_ok=True)
    chat_path.parent.mkdir(parents=True, exist_ok=True)
    full_text = render_full_report(report)
    chat_text = render_chat_summary(report, chat_limit)
    full_path.write_text(full_text, encoding="utf-8")
    chat_path.write_text(chat_text, encoding="utf-8")
    return full_text, chat_text


def escape_table(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def compact_goal_prompt(prompt: str, max_chars: int) -> str:
    prompt = prompt.strip()
    if len(prompt) <= max_chars:
        return prompt
    keep = prompt[: max_chars - 120].rstrip()
    return keep + "\n...\nПолный prompt и обоснование см. в reports/project-readiness/latest.md."


def _decision_rationale(report: ProjectReport) -> str:
    severities = defaultdict(int)
    for item in report.findings:
        severities[item.severity] += 1
    return (
        f"Основание: critical={severities['critical']}, high={severities['high']}, "
        f"medium={severities['medium']}, low={severities['low']}, info={severities['info']}. "
        "Оценка снижалась за недоступную информацию и невыполненные/проваленные gates."
    )

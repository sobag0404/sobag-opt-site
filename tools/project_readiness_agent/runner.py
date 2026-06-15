from __future__ import annotations

from pathlib import Path
from typing import Any

from .checks import CHECKS
from .config import load_config
from .context import RepositoryContext
from .models import (
    CheckResult,
    Finding,
    ProjectReport,
    Recommendation,
    cap_score_for_findings,
    readiness_decision,
    readiness_status,
    recommendation_from_finding,
    utc_now,
)


def run_agent(root: Path, config_path: Path | None = None) -> ProjectReport:
    config_path = config_path or root / "tools/project_readiness_agent/config.yml"
    config = load_config(config_path)
    context = RepositoryContext.load(root, config)
    context.run_configured_commands()
    results: list[CheckResult] = []
    for module in CHECKS:
        try:
            results.append(module.run(context, config))
        except Exception as error:  # noqa: BLE001 - report generation must survive failed checks.
            category = getattr(module, "CATEGORY", module.__name__.rsplit(".", 1)[-1])
            failure = Finding(
                id=f"AGENT-{len(results) + 1:03d}",
                category=category,
                severity="high",
                priority="P1",
                location=getattr(module, "__file__", category),
                title="Readiness check failed",
                description=f"The `{category}` check raised an exception: {type(error).__name__}.",
                impact="A failed check reduces trust in the readiness score and may hide real issues.",
                recommendation="Fix the check implementation and rerun the agent.",
                example=str(error),
            )
            results.append(CheckResult(category=category, score=50, status="FAIL", summary="Check failed and was converted into a finding.", findings=[failure]))

    score = aggregate_score(results, config)
    all_findings = [finding for result in results for finding in result.findings]
    score = cap_score_for_findings(score, all_findings)
    status = readiness_status(all_findings, score)
    decision = readiness_decision(status)
    recommendations = aggregate_recommendations(results)
    goal_prompt = build_goal_prompt(status, score, decision, all_findings, recommendations, context)
    summary = build_summary(status, score, decision, all_findings)
    links = [
        "reports/project-readiness/latest.md",
        "reports/project-readiness/latest-chat.md",
        ".github/workflows/project-readiness-agent.yml",
        "tools/project_readiness_agent/run.py",
        "tools/project_readiness_agent/config.yml",
        "tools/project_readiness_agent/checks/",
        "tools/project_readiness_agent/reporting/",
        "docs/project-readiness-agent.md",
        "docs/vps-rust-runtime-map.md",
    ]
    limitations = build_limitations(context)
    return ProjectReport(
        generated_at=utc_now(),
        root=str(root.resolve()),
        project_name=str(config.get("project", {}).get("name", root.name)),
        score=score,
        status=status,
        decision=decision,
        summary=summary,
        goal_prompt=goal_prompt,
        check_results=results,
        recommendations=recommendations,
        limitations=limitations,
        links=links,
        metadata={
            "branch": context.git.get("branch", "unavailable"),
            "commit": context.git.get("commit", "unavailable"),
            "status": context.git.get("status", ""),
            "check_modules": [
                *[getattr(module, "CATEGORY", module.__name__.rsplit(".", 1)[-1]) for module in CHECKS],
                "architecture-reviewer",
                "storage-migration-agent",
                "api-cleanup-agent",
                "rust-build-agent",
                "security-auditor",
                "qa-engineer",
                "devops-reviewer",
                "docs-reviewer",
                "prompt-engineer",
                "report-writer",
            ],
            "commands": [
                {
                    "command": result.command,
                    "ok": result.ok,
                    "skipped": result.skipped,
                    "timed_out": result.timed_out,
                    "returncode": result.returncode,
                }
                for result in context.command_results
            ],
        },
    )


def aggregate_score(results: list[CheckResult], config: dict[str, Any]) -> int:
    weights = config.get("weights", {})
    total_weight = 0
    weighted = 0
    for result in results:
        weight = int(weights.get(result.category, 0))
        if weight <= 0:
            continue
        total_weight += weight
        weighted += result.score * weight
    if total_weight <= 0:
        return 0
    return max(0, min(100, round(weighted / total_weight)))


def aggregate_recommendations(results: list[CheckResult]) -> list[Recommendation]:
    seen: set[tuple[str, str, str]] = set()
    items: list[Recommendation] = []
    for result in results:
        for recommendation in result.recommendations:
            key = (recommendation.priority, recommendation.category, recommendation.text)
            if key in seen:
                continue
            seen.add(key)
            items.append(recommendation)
        for item in result.findings:
            if item.id and not any(rec.finding_id == item.id for rec in items):
                rec = recommendation_from_finding(item)
                key = (rec.priority, rec.category, rec.text)
                if key not in seen:
                    seen.add(key)
                    items.append(rec)
    priority_order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    return sorted(items, key=lambda item: (priority_order[item.priority], item.category, item.finding_id or item.text))


def build_summary(status: str, score: int, decision: str, findings: list[Finding]) -> str:
    high = [item for item in findings if item.severity == "high"]
    critical = [item for item in findings if item.severity == "critical"]
    if critical:
        main = f"Проект имеет critical-блокеры: {', '.join(item.id for item in critical[:5])}."
    elif high:
        main = f"Проект не готов к следующему этапу без исправления high-блокеров: {', '.join(item.id for item in high[:6])}."
    else:
        main = "Критичных/high-блокеров не найдено; остаются предупреждения и ограничения проверки."
    return f"{main} Итог: {status}, {score}/100, {decision}."


def build_goal_prompt(
    status: str,
    score: int,
    decision: str,
    findings: list[Finding],
    recommendations: list[Recommendation],
    context: RepositoryContext,
) -> str:
    blocking = [item for item in findings if item.severity in {"critical", "high"}]
    p0_p1 = [item for item in recommendations if item.priority in {"P0", "P1"}][:10]
    goal_line = (
        "завершить переход Sobag Opt на Rust/no-Node контур без поломки текущего production"
        if status in {"READY", "READY_WITH_WARNINGS"}
        else "устранить P0/P1-блокеры готовности Sobag Opt перед завершением перехода на Rust/no-Node контур"
    )
    tasks = blocking[:8] if blocking else [item for item in findings if item.severity == "medium"][:6]
    task_lines = "\n".join(
        f"{index}. {item.priority} {item.id}: {item.title}. Файл/область: {item.location}. Рекомендация: {item.recommendation}"
        for index, item in enumerate(tasks, start=1)
    )
    if not task_lines:
        task_lines = "1. Подтвердить, что отчёт `reports/project-readiness/latest.md` остаётся актуальным, и перейти к следующему согласованному этапу без лишних изменений."
    rec_lines = "\n".join(
        f"- {item.priority} {item.finding_id}: {item.text}" if item.finding_id else f"- {item.priority}: {item.text}"
        for item in p0_p1
    )
    if not rec_lines:
        rec_lines = "- Нет P0/P1 рекомендаций; сохраняй существующие guardrails и не расширяй scope без причины."
    latest_files = [
        "reports/project-readiness/latest-chat.md",
        "reports/project-readiness/latest.md",
        "docs/ai-handoff/ACTIVE_CONTEXT.md",
        "docs/ai-handoff/CURRENT_STATUS.md",
    ]
    available = [path for path in latest_files if context.existing(path)]
    available_line = ", ".join(available) if available else "reports/project-readiness/latest-chat.md and latest.md после генерации"
    return f"""Ты — senior full-stack developer, architect, security engineer, QA/DevOps analyst и prompt engineer.

Цель: {goal_line}.

Контекст:
- Репозиторий: sobag-opt-site.
- Текущий статус readiness: {status}, оценка {score}/100, решение: {decision}.
- Этот промпт сформирован агентом на основе всего доступного контекста репозитория: кода, docs, handoff, workflows, отчётов и локальных артефактов.
- Новый GoAL-чат должен считать актуальной стартовой точкой только последний readiness-пакет и связанные latest-файлы: {available_line}.
- Не опирайся на старую историю Sobag Opt-чата как на источник истины; если нужного факта нет в latest-пакете или файлах репозитория, явно зафиксируй ограничение.
- Активная продуктовая цель: завершить Rust/no-Node переход только после прохождения cutover smoke/audit gates и сохранения rollback-пути.

Задачи по приоритету:
{task_lines}

Next implementation packet for VPS-only/Rust transition:
1. Run real product-photo migration gates against the confirmed photo source and the S3-compatible VPS/MinIO target; keep secrets out of Git/chat.
2. Fill `local-import-output/cwv-field-audit-packet.json` only from real post-migration field measurements, then run strict goal-input/readiness gates.
3. Keep Vercel/Next absent from active runtime/deploy, rerun VPS release/storage/error/smoke audits, and do not reintroduce Vercel Blob/provider aliases.
4. Re-verify Rust on Linux/VPS/CI with `cd rust-server && cargo fmt --check && cargo check --locked && cargo test --locked`; local Windows MSVC `link.exe` blocker is environment-only until toolchain is installed.
5. Continue only small modularity slices when touching related code; remaining ARCH-001 is P2 ownership debt.

P0/P1 рекомендации:
{rec_lines}

Ограничения:
- Сначала исправляй P0/P1, затем P2/P3.
- Не делай лишних изменений и не меняй бизнес-логику без прямой связи с findings.
- Не печатай секреты, токены, cookie, пароли, приватные URL или значения env.
- Не выполняй destructive-действия и не трогай production/env/cache/user data без явного разрешения.
- Используй существующие npm scripts, workflows и docs; сохраняй совместимость текущего VPS/Node контура.
- Для Rust-перехода двигайся через shadow/parity/cutover gates, а не через резкую замену маршрутов.
- Если внешний GoAL/старый чат недоступен, не имитируй доступ.

Ожидаемый результат:
- Исправлены или честно заблокированы актуальные P0/P1 findings.
- Обновлены релевантные docs/отчёты.
- Запущены применимые проверки.
- Итоговый ответ краткий: статус, оценка, что изменено, что осталось.

Критерии готовности:
- `python tools/project_readiness_agent/run.py` обновляет `reports/project-readiness/latest.md` и `latest-chat.md`.
- `latest-chat.md` не превышает 4000 символов.
- `npm run check` проходит или все ошибки отражены в отчёте.
- Нет новых секретов в Git/логах/отчётах.
"""


def build_limitations(context: RepositoryContext) -> list[str]:
    limitations = [
        "External chat access: unavailable; агент не имеет прямого доступа к внешнему GoAL-интерфейсу или старой истории сообщений.",
        "Проверка использует только файлы репозитория, локальные артефакты и результаты безопасно запущенных команд.",
        "Секреты и значения `.env*` не читаются в отчёт и не выводятся; наличие локальных env-файлов фиксируется как ограничение/риск.",
        "Нет прямого доступа к production-среде, базе данных, VPS-секретам и внешним сервисам, если они не представлены локальными no-secret артефактами.",
        "Внешние issue/PR URL недоступны из локального контекста, если они не сохранены в репозитории.",
    ]
    skipped = [result.command for result in context.command_results if result.skipped]
    if skipped:
        limitations.append(f"Некоторые команды были пропущены: {', '.join(skipped)}.")
    failed = [result.command for result in context.command_results if not result.ok and not result.skipped]
    if failed:
        limitations.append(f"Некоторые команды завершились ошибкой и отражены в findings: {', '.join(failed)}.")
    return limitations

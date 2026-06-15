from __future__ import annotations

import argparse
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from project_readiness_agent.config import load_config  # noqa: E402
from project_readiness_agent.reporting.markdown import write_reports  # noqa: E402
from project_readiness_agent.runner import run_agent  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the offline project readiness agent.")
    parser.add_argument("--root", default=".", help="Repository root. Defaults to current directory.")
    parser.add_argument("--config", default="", help="Optional config path.")
    parser.add_argument("--quiet", action="store_true", help="Only write reports; do not print the short status line.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    config_path = Path(args.config).resolve() if args.config else root / "tools/project_readiness_agent/config.yml"
    try:
        report = run_agent(root, config_path)
        config = load_config(config_path)
        configured_reports = config.get("reports", {})
        reports_config = {
            "full": _repo_path(root, configured_reports.get("full", "reports/project-readiness/latest.md")),
            "chat": _repo_path(root, configured_reports.get("chat", "reports/project-readiness/latest-chat.md")),
            "chat_limit": int(configured_reports.get("chat_limit", 4000)),
        }
        write_reports(report, reports_config["full"], reports_config["chat"], reports_config["chat_limit"])
        if not args.quiet:
            print(
                f"Статус: {report.status}. Оценка: {report.score}. "
                f"Главное: {report.decision}. "
                "Отчёт: reports/project-readiness/latest.md. GoAL: reports/project-readiness/latest-chat.md."
            )
        return 0
    except Exception as error:  # noqa: BLE001 - emergency report is required.
        write_emergency_report(root, error)
        if not args.quiet:
            print(
                "Статус: CRITICAL_BLOCKERS. Оценка: 0. "
                "Главное: агент не смог сформировать полный отчёт, создан аварийный отчёт. "
                "Отчёт: reports/project-readiness/latest.md. GoAL: reports/project-readiness/latest-chat.md."
            )
        return 1


def write_emergency_report(root: Path, error: Exception) -> None:
    directory = root / "reports/project-readiness"
    directory.mkdir(parents=True, exist_ok=True)
    message = f"{type(error).__name__}: {error}"
    full = f"""# Project Readiness Report

## 1. Executive Summary

Аварийный отчёт: агент не смог выполнить полный анализ.

- Итоговая оценка: **0/100**
- Итоговый статус: **CRITICAL_BLOCKERS**
- Главный вывод: критически нельзя передавать

## 2. Readiness Score

| Категория | Оценка | Статус | Комментарий |
| --------- | -----: | ------ | ----------- |
| Agent Runtime | 0 | BLOCKED | {message} |

## 3. Critical Blockers

- **AGENT-RUNTIME**: агент не смог сформировать полный отчёт.

## 4. Findings

### Chat / GoAL Context

#### AGENT-RUNTIME: Readiness agent failed

- Severity: `critical`
- Priority: `P0`
- File / area: `tools/project_readiness_agent/run.py`
- Description: {message}
- Why it matters: без отчёта нельзя честно оценить готовность.
- Recommendation: исправить ошибку агента и повторить запуск.

## 5. Recommendations

### P0

- Исправить аварийную ошибку агента и повторить `python tools/project_readiness_agent/run.py`.

## 6. GoAL Readiness Decision

Решение: **критически нельзя передавать**.

## 7. GoAL Prompt

```text
Открой новый GoAL-чат только для исправления readiness-agent runtime failure. Используй последний аварийный отчёт `reports/project-readiness/latest.md`, не опирайся на старую историю чата, не печатай секреты.
```

## 8. Changed Files / Relevant Links

- `reports/project-readiness/latest.md`
- `reports/project-readiness/latest-chat.md`
- `tools/project_readiness_agent/run.py`

## 9. Limitations

- External chat access: unavailable.
- Полный анализ не выполнен из-за runtime failure.
"""
    chat = (
        "Статус проекта: CRITICAL_BLOCKERS.\n"
        "Оценка готовности: 0/100.\n"
        f"Главный блокер: readiness-agent runtime failure ({message}).\n"
        "Решение: критически нельзя передавать.\n"
        "Отчёт: reports/project-readiness/latest.md.\n"
        "Промпт: открой новый GoAL-чат только для исправления агента; используй последний отчёт, не старую историю чата, не печатай секреты.\n"
    )
    (directory / "latest.md").write_text(full, encoding="utf-8")
    (directory / "latest-chat.md").write_text(chat[:4000], encoding="utf-8")


def _repo_path(root: Path, value: str) -> Path:
    path = Path(str(value))
    return path if path.is_absolute() else root / path


if __name__ == "__main__":
    raise SystemExit(main())

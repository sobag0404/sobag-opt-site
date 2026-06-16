# Project Readiness Report

Generated: 2026-06-16T18:05:00+00:00
Project: sobag-opt-site
Git: `main` / `9932b03`

## 1. Executive Summary

Критичных/high-блокеров не найдено; остаются предупреждения и ограничения проверки. Итог: READY_WITH_WARNINGS, 87/100, можно передавать с предупреждениями.

- Итоговая оценка: **87/100**
- Итоговый статус: **READY_WITH_WARNINGS**
- Главный вывод: **можно передавать с предупреждениями**

Current Rust/VPS evidence:
- Rust auth write parity is implemented and deployed at `743c63e`; exact production `/api/auth/login`, `/api/auth/register`, and `/api/auth/logout` are cut over to Rust. Nginx backup: `/etc/nginx/sites-available/sobag-opt.pre-rust-auth-write-20260616T174643Z`.
- GitHub gates passed for the latest deployed commit `9932b03`: `autofix-check` run `27637574364`, `rust-check` run `27637574179`, `vps-deploy` run `27637632119`, and `production-smoke` run `27637747742`.
- Live auth write smoke passed after cutover: register/login/logout, production cookie attributes, invalid credentials, duplicate registration, missing consent, CSRF-origin rejection, and no-order review guard returned expected results without logging cookies or secrets.
- Rust Redis-backed write-store parity for `/api/orders` and `/api/briefs` is implemented and deployed at `129740b`.
- GitHub `autofix-check` and `rust-check` passed for `129740b`; `vps-deploy` run `27631682347` passed with file-store and Redis fixture order/brief smokes before release activation.
- Live checks from this Codex thread passed after deploy: `/` 200 `no-cache`, `/api/health` 200 `no-store`, catalog prices are non-zero, production smoke, production performance/cache smoke, and production storage readiness.
- Production exact `/api/orders` and `/api/briefs` are now cut over to Rust. Nginx backup: `/etc/nginx/sites-available/sobag-opt.pre-rust-orders-briefs-20260616T164606Z`.
- Live order/brief smoke remains green after auth cutover: catalog prices are non-zero, a safe Rust-created order and brief persisted through Redis, minimum-total validation stayed active, and production smoke/performance/storage checks passed.

## 2. Readiness Score

| Категория | Оценка | Статус | Комментарий |
| --------- | -----: | ------ | ----------- |
| Architecture | 80 | WARN | Architecture is serviceable but carries clear modularity and migration-surface risk. |
| Code Quality | 80 | WARN | Code is functional but needs stronger modularity, linting, and edge-case hardening. |
| Security | 80 | WARN | Security posture has useful guardrails; remaining findings are operational guardrails or local-env hygiene. |
| Tests | 94 | WARN | Executable checks are captured in the report; failed commands are treated as readiness blockers. |
| Documentation | 100 | OK | Documentation covers the scanned readiness topics. |
| CI/CD | 94 | WARN | CI/CD has useful smoke/deploy gates; permissions and readiness schedule are the main audit points. |
| Product Readiness | 92 | WARN | Product readiness gates passed; real field CWV remains a post-launch monitoring warning. |
| Prompt Engineering | 86 | WARN | Prompt artifacts exist; generation uses full repository context, while new GoAL chats start from the latest readiness package. |

## 3. Critical Blockers

Критичных блокеров не найдено.

## 4. Findings

### Architecture

#### ARCH-001: Large source files need explicit ownership

- Severity: `medium`
- Priority: `P2`
- File / area: `app.js (4757 lines), components/app-admin.js (2604 lines), rust-server/src/main.rs (4898 lines)`
- Description: Several implementation files are above the configured size threshold.
- Why it matters: The project is still maintainable, but future changes will be harder to isolate.
- Recommendation: Document ownership boundaries and extract modules when touching these areas.

#### ARCH-003: Many static entry points require shell discipline

- Severity: `low`
- Priority: `P3`
- File / area: `root HTML pages`
- Description: 25 top-level HTML pages are present.
- Why it matters: A shared shell exists, but page-level drift remains a recurring risk in a static multi-page site.
- Recommendation: Keep the shell checks in `npm run check` and avoid adding page-local header/footer markup.

### Code Quality

#### CODE-003: No standard lint configuration is detected

- Severity: `medium`
- Priority: `P2`
- File / area: `repository`
- Description: The repository relies on custom `tools/autofix.mjs` checks but has no reusable ESLint/TypeScript lint layer.
- Why it matters: Custom checks are valuable, but they do not catch broad JavaScript correctness patterns or unsafe refactors.
- Recommendation: Add ESLint with a small ruleset that complements, not replaces, the existing custom invariant checks.

#### CODE-004: Open implementation markers need triage

- Severity: `low`
- Priority: `P3`
- File / area: `tools/goal-inputs-packet-template.mjs, tools/project_readiness_agent/checks/code_quality.py, tools/project_readiness_agent/checks/product_readiness.py, tools/vps-rust-cutover-packet-audit.mjs`
- Description: 4 code files contain TODO/FIXME/HACK markers.
- Why it matters: Untriaged markers are easy to forget during release readiness decisions.
- Recommendation: Convert real work into tracked checklist items and remove stale markers.

### Security

#### SEC-005: Destructive shell operations exist and require guardrails

- Severity: `medium`
- Priority: `P2`
- File / area: `.github/workflows/vps-deploy.yml, reports/project-readiness/latest.md, tools/vps-release-audit.mjs`
- Description: The repository contains shell snippets with `rm -rf` or equivalent destructive cleanup commands.
- Why it matters: These commands may be legitimate in deploy cleanup, but they are high-impact if path validation regresses.
- Recommendation: Keep destructive commands confined to reviewed deploy scripts, validate resolved paths, and never add them to the readiness agent.

#### SEC-001: Environment files are present in the working tree

- Severity: `low`
- Priority: `P3`
- File / area: `.env.local`
- Description: The scanner detected local `.env*` files. Their values were not printed or copied into the report.
- Why it matters: Tracked environment files would leak credentials. Ignored local env files are acceptable but must stay out of commits and chat.
- Recommendation: Keep `.env*` ignored, add only safe variable names to documentation, and verify `git ls-files .env*` remains empty.

### Tests

#### TEST-004: Browser smoke exists but is not run by the readiness agent

- Severity: `low`
- Priority: `P3`
- File / area: `package.json`
- Description: `npm run ui:smoke` is available, but the default readiness agent avoids launching a browser every 15 minutes.
- Why it matters: UI regressions may remain undetected between explicit smoke runs.
- Recommendation: Run UI smoke before release/cutover or add a separate scheduled browser workflow if runtime cost is acceptable.

### Documentation

Проблем не найдено.

### CI/CD

#### CICD-006: Actions are version-pinned but not SHA-pinned

- Severity: `low`
- Priority: `P3`
- File / area: `.github/workflows/autofix-check.yml`
- Description: Workflow actions use version tags such as `@v4`.
- Why it matters: Tag pinning is common, but SHA pinning gives stronger supply-chain integrity.
- Recommendation: For high-assurance workflows, pin third-party actions by SHA and review update cadence.

### Product Readiness

#### PROD-002: Real field CWV packet remains pending

- Severity: `low`
- Priority: `P3`
- File / area: `local-import-output/cwv-field-audit-packet.json`
- Description: The CWV field packet is still a template, but deploy, Rust/VPS, production smoke, and synthetic 10k catalog/performance evidence are recorded.
- Why it matters: The Rust/VPS transition can be handed off with warnings, but real post-launch field data is still needed for ongoing product monitoring.
- Recommendation: Collect real field CWV after production traffic is available; keep synthetic evidence separate from field data.

#### PROD-004: Next-stage migration context is available

- Severity: `info`
- Priority: `P3`
- File / area: `docs/ai-handoff/ACTIVE_CONTEXT.md`
- Description: The repository documents the current Node/VPS path and the remaining Rust/no-Node migration direction. Auth writes and order/brief writes are cut over; admin catalog/import/media/PIM remains the main fallback zone.
- Why it matters: This helps handoff, but it also means GoAL prompts must distinguish current blockers from the active Rust transition finish line.
- Recommendation: Use the next GoAL prompt to finish admin catalog/import/media/PIM parity and exact-route cutover only after P0/P1 readiness blockers are controlled.

### Prompt Engineering

#### PROMPT-003: Long prompts risk pulling obsolete context into new chats

- Severity: `medium`
- Priority: `P2`
- File / area: `docs/ai-handoff/LIVE_CONTEXT.md`
- Description: Some prompt/handoff artifacts are long and do not clearly delegate to the latest active context.
- Why it matters: A new GoAL chat may overfit to old history instead of current blockers.
- Recommendation: For new runs, use `reports/project-readiness/latest-chat.md` as the entry prompt and link to the latest report/context files only.

### Chat / GoAL Context

#### CHAT-002: External chat access: unavailable

- Severity: `info`
- Priority: `P3`
- File / area: `external chat / GoAL interface`
- Description: The agent has no direct access to the external GoAL interface or old Sobag Opt chat history.
- Why it matters: This prevents verification of messages that are not saved in the repository.
- Recommendation: Use only repository artifacts for readiness decisions; start a new GoAL chat from the generated latest-chat prompt.

## 5. Recommendations

### P0

Нет рекомендаций.

### P1

Нет рекомендаций.

### P2

- [Architecture] (ARCH-001) ARCH-001: Document ownership boundaries and extract modules when touching these areas.
- [Code Quality] (CODE-003) CODE-003: Add ESLint with a small ruleset that complements, not replaces, the existing custom invariant checks.
- [Prompt Engineering] (PROMPT-003) PROMPT-003: For new runs, use `reports/project-readiness/latest-chat.md` as the entry prompt and link to the latest report/context files only.
- [Security] (SEC-005) SEC-005: Keep destructive commands confined to reviewed deploy scripts, validate resolved paths, and never add them to the readiness agent.

### P3

- [Architecture] (ARCH-003) ARCH-003: Keep the shell checks in `npm run check` and avoid adding page-local header/footer markup.
- [CI/CD] (CICD-006) CICD-006: For high-assurance workflows, pin third-party actions by SHA and review update cadence.
- [Chat / GoAL Context] (CHAT-002) CHAT-002: Use only repository artifacts for readiness decisions; start a new GoAL chat from the generated latest-chat prompt.
- [Code Quality] (CODE-004) CODE-004: Convert real work into tracked checklist items and remove stale markers.
- [Product Readiness] (PROD-002) PROD-002: Collect real field CWV after production traffic is available; keep synthetic evidence separate from field data.
- [Product Readiness] (PROD-004) PROD-004: Use the next GoAL prompt to finish admin catalog/import/media/PIM parity and exact-route cutover only after P0/P1 readiness blockers are controlled.
- [Security] (SEC-001) SEC-001: Keep `.env*` ignored, add only safe variable names to documentation, and verify `git ls-files .env*` remains empty.
- [Tests] (TEST-004) TEST-004: Run UI smoke before release/cutover or add a separate scheduled browser workflow if runtime cost is acceptable.

## 6. GoAL Readiness Decision

Решение: **можно передавать с предупреждениями**.

Reason: critical=0, high=0, medium=4, low=6, info=2. Score is reduced only for warnings, unavailable local live checks, and post-launch monitoring items.

## 7. GoAL Prompt

```text
Ты — senior full-stack developer, architect, security engineer, QA/DevOps analyst и prompt engineer.

Цель: завершить переход Sobag Opt на Rust/no-Node контур без поломки текущего production.

Контекст:
- Репозиторий: sobag-opt-site.
- Текущий статус readiness: READY_WITH_WARNINGS, оценка 87/100, решение: можно передавать с предупреждениями.
- Этот промпт сформирован агентом на основе всего доступного контекста репозитория: кода, docs, handoff, workflows, отчётов и локальных артефактов.
- Новый GoAL-чат должен считать актуальной стартовой точкой только последний readiness-пакет и связанные latest-файлы: reports/project-readiness/latest-chat.md, reports/project-readiness/latest.md, docs/ai-handoff/ACTIVE_CONTEXT.md, docs/ai-handoff/CURRENT_STATUS.md.
- Не опирайся на старую историю Sobag Opt-чата как на источник истины; если нужного факта нет в latest-пакете или файлах репозитория, явно зафиксируй ограничение.
- Активная продуктовая цель: завершить Rust/no-Node переход только после прохождения cutover smoke/audit gates и сохранения rollback-пути.

Задачи по приоритету:
1. P2 ARCH-001: Large source files need explicit ownership. Файл/область: app.js (4757 lines), components/app-admin.js (2604 lines), rust-server/src/main.rs (4898 lines). Рекомендация: Document ownership boundaries and extract modules when touching these areas.
2. P2 CODE-003: No standard lint configuration is detected. Файл/область: repository. Рекомендация: Add ESLint with a small ruleset that complements, not replaces, the existing custom invariant checks.
3. P2 SEC-005: Destructive shell operations exist and require guardrails. Файл/область: .github/workflows/vps-deploy.yml, reports/project-readiness/latest.md, tools/vps-release-audit.mjs. Рекомендация: Keep destructive commands confined to reviewed deploy scripts, validate resolved paths, and never add them to the readiness agent.
4. P2 PROMPT-003: Long prompts risk pulling obsolete context into new chats. Файл/область: docs/ai-handoff/LIVE_CONTEXT.md. Рекомендация: For new runs, use `reports/project-readiness/latest-chat.md` as the entry prompt and link to the latest report/context files only.

Next implementation packet for VPS-only/Rust transition:
1. Inventory admin catalog/import/media/PIM Node contracts and Rust gaps; keep UI unchanged and do not do a broad proxy switch.
2. Implement parity smokes for admin catalog/import/media/PIM using safe fixtures, auth roles, no-secret logs, Redis/file-store compatibility, and validation/error contracts.
3. Prepare exact-route Nginx cutover only after smokes pass; backup the current site config, switch one bounded route group at a time, and keep rollback commands ready.
4. Run release gates: `cargo fmt --check`, `cargo check --locked`, `cargo test --locked`, `npm.cmd run check`, GitHub `autofix-check`, `rust-check`, `vps-deploy`, `production-smoke`, plus live admin-safe validation.
5. Keep Vercel/Next absent; real field CWV remains post-launch monitoring and must not be labeled synthetic evidence.

P0/P1 рекомендации:
- Нет P0/P1 рекомендаций; сохраняй существующие guardrails и не расширяй scope без причины.

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
```

## 8. Changed Files / Relevant Links

- `reports/project-readiness/latest.md`
- `reports/project-readiness/latest-chat.md`
- `.github/workflows/project-readiness-agent.yml`
- `tools/project_readiness_agent/run.py`
- `tools/project_readiness_agent/config.yml`
- `tools/project_readiness_agent/checks/`
- `tools/project_readiness_agent/reporting/`
- `docs/project-readiness-agent.md`
- `docs/vps-rust-runtime-map.md`
- `docs/synthetic-cwv-readiness-evidence.md`
- `reports/project-readiness/synthetic-cwv-evidence.json`
- Git working tree status:
  - ` M docs/ai-handoff/ACTIVE_CONTEXT.md`
  - ` M docs/ai-handoff/CURRENT_STATUS.md`
  - ` M docs/vps-rust-runtime-map.md`
  - ` M reports/project-readiness/latest-chat.md`
  - `?? output/`
- Diff/PR URL: unavailable in local repository context.

## 9. Limitations

- External chat access: unavailable; агент не имеет прямого доступа к внешнему GoAL-интерфейсу или старой истории сообщений.
- Проверка использует только файлы репозитория, локальные артефакты и результаты безопасно запущенных команд.
- Секреты и значения `.env*` не читаются в отчёт и не выводятся; наличие локальных env-файлов фиксируется как ограничение/риск.
- Нет прямого доступа к production-среде, базе данных, VPS-секретам и внешним сервисам, если они не представлены локальными no-secret артефактами.
- Внешние issue/PR URL недоступны из локального контекста, если они не сохранены в репозитории.

## 10. Validation Method

Logical roles/check modules used:
- Architecture
- Code Quality
- Security
- Tests
- Documentation
- CI/CD
- Product Readiness
- Prompt Engineering
- Chat / GoAL Context
- architecture-reviewer
- storage-migration-agent
- api-cleanup-agent
- rust-build-agent
- security-auditor
- qa-engineer
- devops-reviewer
- docs-reviewer
- prompt-engineer
- report-writer

Local commands executed by the readiness agent:
- PASS: `python -m unittest discover -s tools/project_readiness_agent/tests -t tools`
- PASS: `npm run check`

Heavy/browser checks are not part of the scheduled readiness run; run `npm run ui:smoke` before UI/API release or cutover work.

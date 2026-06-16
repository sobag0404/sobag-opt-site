Next implementation packet:
1. Keep production stable on commit `cefeb12`: cache/header smoke, price integrity, public price-list, and live catalog facets are green; `/api/orders` and `/api/briefs` are intentionally back on Node fallback after Rust live writes hit the Redis-vs-file-store gap.
2. Do not re-cut `/api/orders` or `/api/briefs` to Rust until Rust supports the live Redis-backed store provider or an approved store bridge, then rerun real VPS order/brief smokes against production-like env.
3. Continue review P1 only where business risk is low: persistence concurrency/locking, remaining RBAC decision-table expansion, workflow/supply-chain hardening, and live smoke evidence.
4. Pricing backlog needs business rules first: promo/action precedence, date windows, whether promo affects order totals, and XLSX red styling. Do not invent promo order-pricing defaults.
5. Cache/catalog note: `/api/catalog` is `no-store`; `/api/catalog-query` is short public cache and returns real imported facets (`Подушки 517`, `Наволочки 517`, `Мешки для обуви 170`, `Чехлы на чемодан 37`, `Ремувки 19`, `Флаги 65`). If first-load stale categories appear, diagnose client/localStorage/bootstrap cache before changing backend.
6. Keep Vercel/Next absent from active runtime/deploy; do not print secrets. Real field CWV remains post-launch monitoring and must not be labeled synthetic evidence.
Статус проекта: READY_WITH_WARNINGS. Оценка: 87/100.
Блокеры: ARCH-001: Large source files need explicit ownership; CODE-003: No standard lint configuration is detected; PROMPT-003: Long prompts risk pulling obsolete context into new chats; SEC-005: Destructive shell operations exist and require guardrails
Решение: можно передавать с предупреждениями.
Отчёт: reports/project-readiness/latest.md. GoAL: reports/project-readiness/latest-chat.md. Commit: 3b1e229; PR unavailable.
Промпт: открой новый GoAL-чат из этого файла и `latest.md`; текущая стартовая точка только latest readiness package и связанные repo artifacts. Сначала P0/P1, без лишних изменений, не печатать секреты.

Next implementation packet:
1. Run the real product-photo migration gates against the confirmed photo source and S3-compatible MinIO target; keep secrets out of chat/Git.
2. Fill `local-import-output/cwv-field-audit-packet.json` only from real post-migration field measurements, then run strict goal-input gates.
3. Keep Vercel/Next absent from active runtime/deploy; rerun VPS release, storage, error, and smoke audits after each cutover step.
4. Re-verify Rust on Linux/VPS/CI with `cd rust-server && cargo fmt --check && cargo check --locked && cargo test --locked`; Windows MSVC `link.exe` remains local-only.
5. Continue only small modularity slices when touching related code; large file ownership is remaining P2 debt.
Статус проекта: READY_WITH_WARNINGS. Оценка: 87/100.
Блокеры: ARCH-001: Large source files need explicit ownership; CODE-003: No standard lint configuration is detected; PROMPT-003: Long prompts risk pulling obsolete context into new chats; SEC-005: Destructive shell operations exist and require guardrails
Решение: можно передавать с предупреждениями.
Отчёт: reports/project-readiness/latest.md. GoAL: reports/project-readiness/latest-chat.md. Commit: baacadd; PR unavailable.
Промпт: открой новый GoAL-чат из этого файла и `latest.md`; текущая стартовая точка только latest readiness package и связанные repo artifacts. Сначала P0/P1, без лишних изменений, не печатать секреты.

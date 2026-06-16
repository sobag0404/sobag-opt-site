Next implementation packet:
1. Run the real product-photo migration gates against the confirmed photo source and S3-compatible MinIO target; keep secrets out of chat/Git.
2. Fill `local-import-output/cwv-field-audit-packet.json` only from real post-migration field measurements, then run strict goal-input gates.
3. Keep Vercel/Next absent from active runtime/deploy; rerun VPS release, storage, error, and smoke audits after each cutover step.
4. Re-verify Rust on Linux/VPS/CI with `cd rust-server && cargo fmt --check && cargo check --locked && cargo test --locked`; Windows MSVC `link.exe` remains local-only.
5. Continue only small modularity slices when touching related code; large file ownership is remaining P2 debt.
Статус проекта: NOT_READY. Оценка: 74/100.
Блокеры: PROD-002: Real external input packets are incomplete; ARCH-001: Large source files need explicit ownership; CODE-003: No standard lint configuration is detected; PROMPT-003: Long prompts risk pulling obsolete context into new chats
Решение: нельзя передавать, нужны исправления.
Отчёт: reports/project-readiness/latest.md. GoAL: reports/project-readiness/latest-chat.md. Commit: 6797b29; PR unavailable.
Промпт: открой новый GoAL-чат из этого файла и `latest.md`; текущая стартовая точка только latest readiness package и связанные repo artifacts. Сначала P0/P1, без лишних изменений, не печатать секреты.

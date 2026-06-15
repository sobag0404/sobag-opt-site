# Project Readiness Agent

The project readiness agent is an offline repository scanner for Sobag Opt. It checks architecture, code quality, security, tests, documentation, CI/CD, product readiness, prompt engineering, and saved Chat / GoAL context.

It does not connect to an external GoAL chat. If external chat history is not saved in the repository, the report says `External chat access: unavailable`.

## Files

- `.github/workflows/project-readiness-agent.yml` runs the agent every 15 minutes and on manual dispatch.
- `tools/project_readiness_agent/run.py` is the local entrypoint.
- `tools/project_readiness_agent/config.yml` stores thresholds, paths, command settings, and scan exclusions.
- `tools/project_readiness_agent/checks/` contains one module per check category.
- `tools/project_readiness_agent/reporting/` generates markdown reports.
- `reports/project-readiness/latest.md` is the full report.
- `reports/project-readiness/latest-chat.md` is the compact GoAL prompt, capped at 4000 characters.

## Local Run

```powershell
python tools/project_readiness_agent/run.py
```

To run only the agent tests:

```powershell
python -m unittest discover -s tools/project_readiness_agent/tests -t tools
```

By default the agent also runs configured validation commands from `config.yml`, including `npm run check`. To skip them for a fast local scan:

```powershell
$env:PROJECT_READINESS_RUN_COMMANDS="false"
python tools/project_readiness_agent/run.py
```

## GitHub Actions

The workflow runs on:

- cron: `*/15 * * * *`
- `workflow_dispatch`

It installs Python and Node dependencies, runs the agent, and uploads reports as an artifact. Scheduled runs are read-only. Manual `workflow_dispatch` also starts a separate commit job that has `contents: write` and commits updated reports only when the report content changed beyond the generated timestamp.

Default workflow permissions are `contents: read`; `contents: write` is scoped only to the manual report-commit job. The workflow does not use custom tokens and does not print secrets.

## Reading Reports

Use `reports/project-readiness/latest.md` for the full senior-level review and `reports/project-readiness/latest-chat.md` to start a new GoAL chat.

The prompt is generated from all available repository context, but the new GoAL chat is instructed to treat the latest readiness package as the current starting point. Old Sobag Opt chat history is not a source of truth unless it is saved in repository files.

The active product goal for generated GoAL prompts is to finish the Rust/no-Node transition only after P0/P1 readiness blockers and Rust cutover gates are controlled.

## Adding a New Check

1. Add a module in `tools/project_readiness_agent/checks/`.
2. Export `CATEGORY` and `run(context, config)`.
3. Return `CheckResult`, usually through `checks/common.py::build_result`.
4. Add the module to `tools/project_readiness_agent/checks/__init__.py`.
5. Add focused tests if the check has scoring or parsing logic.

## Limitations

- No direct external GoAL/chat access.
- No access to production secrets, VPS env, database data, or external services unless represented by no-secret repository artifacts.
- Secret-like values are masked in command output.
- Local `.env*` files are not copied into reports.
- Browser smoke tests are not run every 15 minutes by default to avoid heavy scheduled jobs; run `npm run ui:smoke` before release/cutover.

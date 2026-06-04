# Error Log Review

Sobag Opt uses a lightweight error review workflow without adding secrets or external monitoring vendors.

## What Is Logged

All API routes that use `handleError(res, error, req)` write a structured log for server-side errors (`5xx`):

```json
{
  "level": "error",
  "event": "api_error",
  "requestId": "audit-request-1",
  "method": "POST",
  "path": "/api/admin/catalog",
  "status": 500,
  "code": "server_error",
  "message": "Synthetic server failure"
}
```

Production logs do not include stack traces. Query strings are excluded from the `path` field, and the log helper must not reference secret env names.

Every error response includes:

- `requestId` in the JSON body;
- `X-Sobag-Request-Id` response header.

## Review Triggers

Review logs when any of these happens:

- `production-smoke` GitHub Actions workflow fails;
- `/api/health` returns non-ready storage;
- a manager/admin reports an API action failure;
- a buyer reports failed checkout, saved proposal, login, or product review submission;
- Vercel dashboard shows elevated function errors.

## Review Steps

1. Open the failed GitHub Actions run first.
2. Note the route, HTTP status, and any request id in the failure output.
3. Open Vercel Function logs for the matching deploy and timeframe.
4. Filter/search for `api_error`.
5. Match by `requestId` when available, otherwise by `path`, `method`, and timestamp.
6. Classify the issue as `storage/env`, `auth/access`, `catalog/import`, `content`, `orders/CRM`, `frontend smoke`, or `unknown`.
7. Do not paste env values, cookies, tokens, raw customer data, or full logs into issues or chat.
8. If the error is reproducible locally, add or update a smoke/audit test before fixing.

## Local Checks

Run the audit directly:

```bash
npm.cmd run audit:errors
```

It is also included in:

```bash
npm.cmd run check
```

The audit verifies:

- the shared HTTP helper emits structured `api_error` logs;
- production logs omit stack traces;
- logs include route path without query string;
- error responses include request id;
- API routes use `handleError(res, error, req)` unless explicitly documented as a direct safe response route.

## Optional Client-Error Logging

By default, only `5xx` server errors are logged. Temporarily setting `SOBAG_LOG_CLIENT_ERRORS=1` can include `4xx` errors during a targeted debugging session.
Do this only with explicit approval for the environment being changed.

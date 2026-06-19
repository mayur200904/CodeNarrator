# Deployment Observability and Alerting Plan

## Scope
This plan covers the FastAPI backend and Next.js frontend for production deployment.

## Logging
- Backend: keep structured logs for request path, status code, latency, and job_id when available.
- Backend: log lifecycle transitions for generation jobs (queued, processing, completed, failed).
- Frontend: capture user-visible failures for generate/poll flows and include project name + action context.

## Key Metrics
- API availability: success rate for `GET /openapi.json` and `GET /api/jobs/{job_id}`.
- Job reliability: count of `failed` jobs vs `completed` jobs.
- Job performance: p50/p95 time-to-first-chapter and total job duration.
- Queue pressure: number of queued + processing jobs.

## Minimum Alerts
- API availability alert: trigger when 5xx rate > 2% over 5 minutes.
- Job failure alert: trigger when failed jobs >= 3 in 15 minutes.
- Latency alert: trigger when p95 `/api/jobs/{job_id}` > 2 seconds for 10 minutes.
- Pipeline stall alert: trigger when any job remains `processing` > 30 minutes.

## Runbook (First Response)
1. Check API health endpoint and recent deploy changes.
2. Inspect job logs (`/api/jobs/{job_id}/logs`) for failing examples.
3. Validate outbound dependencies (LLM, TTS, media tooling) availability.
4. Restart worker process if stall is confirmed and re-run one known-good repo.
5. If regressions continue, roll back to previous commit and re-verify health.

## Release Gate
Deployment is blocked unless:
- Frontend lint/build pass.
- Python tests pass (or are explicitly skipped with rationale).
- Alerts above are configured in the deployment environment.
- Rollback command path is documented for on-call.

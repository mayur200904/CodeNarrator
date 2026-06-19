# CHANGELOGS

This file tracks all meaningful changes made by any contributor (human or AI agent) in this repository.

Versioning approach: Keep a rolling Unreleased section and move entries into dated releases.
Date format: YYYY-MM-DD

## Entry Rules
- Every merged change must add or update an entry here.
- Entries must be grouped by category:
  - Added
  - Changed
  - Fixed
  - Removed
  - Security
  - Docs
- Each entry should include:
  - Short summary
  - Affected area (backend, frontend, pipeline, docs, infra, tests)
  - Optional reference (PR/issue/commit)
- If a change is inferred from legacy history and not fully verified, prefix with [inferred].

## Template
Use this template for new release blocks:

### [vX.Y.Z] - YYYY-MM-DD
#### Added
- ...

#### Changed
- ...

#### Fixed
- ...

#### Removed
- ...

#### Security
- ...

#### Docs
- ...

## [Unreleased]

### Added
- Created SPEC.md defining mandatory engineering, architecture, API, quality, security, and collaboration rules for all stakeholders and agents. Area: docs/governance.
- Created CHANGELOGS.md with contribution requirements and release entry template. Area: docs/governance.
- Added repository `.env` template with required variables for Gemini and optional OpenAI-compatible provider setup. Area: backend/config.
- Added backend job logs endpoint (`GET /api/jobs/{job_id}/logs`) with incremental polling cursor support (`since`, `next_since`). Area: backend/api.

### Changed
- Updated Python requirements to include backend runtime dependencies (`fastapi`, `uvicorn`) required by the API server. Area: backend/dependencies.
- Updated LLM routing to use OpenRouter as default provider with automatic Gemini fallback when OpenRouter fails or is not configured. Area: backend/llm-runtime.
- Optimized large-repository tutorial generation by prioritizing/capping fetched files, limiting per-file LLM context, limiting total context size, and adaptively reducing abstraction count. Area: backend/performance.
- Improved GitHub crawler performance by avoiding full clone for HTTPS `.git` URLs and enabling shallow clone (`depth=1`) for true SSH clone mode. Area: backend/crawler-performance.
- Added hard crawl stop via `FAST_CRAWL_MAX_FILES` to avoid long repository traversal before generation starts. Area: backend/crawler-performance.
- Switched default LLM priority to Gemini-first with configurable fallback order via `LLM_PROVIDER_PRIORITY`. Area: backend/llm-runtime.
- Enabled progressive chapter file writes during generation so outputs appear earlier instead of only at final combine step. Area: backend/output-latency.
- Replaced frontend dummy terminal messages with real backend job logs and progress-driven updates in generation status UI. Area: frontend/ux.

### Fixed
- Resolved missing-module environment issue where FastAPI imports failed in virtualenv after requirements install. Area: backend/environment.

### Removed
- None yet.

### Security
- None yet.

### Docs
- Established project-wide policy that every merged change must be logged in this file.
- Expanded `.env.sample` to include required LLM routing fields and normalized key formatting. Area: docs/configuration.

---
Maintenance notes:
- Keep newest release sections at the top.
- Do not delete historical entries; append corrections as new lines.
- If an entry was incorrect, add a correcting entry and reference the prior one.

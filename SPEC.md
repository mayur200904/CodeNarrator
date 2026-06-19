# Project Specification (SPEC)

Version: 1.0
Effective date: 2026-04-10
Applies to: all contributors, maintainers, reviewers, and AI agents working in this repository.

## 1. Purpose
This document defines the mandatory engineering, product, and collaboration rules for this codebase.

Goals:
- Keep architecture coherent as the project evolves.
- Prevent regressions in backend APIs, tutorial generation flow, and frontend UX.
- Ensure every change is testable, reviewable, and reversible.

## 2. Scope
This repository contains:
- Python backend and orchestration pipeline (FastAPI + PocketFlow nodes)
- Documentation generation and video generation flows
- Next.js frontend application in web/
- Supporting docs, tests, and assets

These rules apply to all folders unless an explicit local rule file overrides them.

## 3. Guiding Principles
- Build only what is required by current product scope.
- Prefer simple, explicit designs over hidden abstractions.
- Keep behavior deterministic where possible.
- Favor backward-compatible API evolution.
- Make failures observable and actionable.

## 4. Architecture Rules
- Preserve pipeline separation:
  - Orchestration logic in core/ and flow.py
  - Node behavior in nodes.py and nodes_video.py
  - I/O helpers in utils/
  - API transport in server/app.py
  - UI concerns in web/
- No business logic in API handlers beyond validation, orchestration start, and response shaping.
- New background workflows must expose progress states consistent with existing job lifecycle:
  - queued -> processing -> completed or failed
- Every new output artifact must be placed under output/<project_name>/ with stable naming.

## 5. Backend API Rules
- All API changes must be additive by default.
- Breaking API changes require:
  - Explicit versioning strategy
  - Migration notes in CHANGELOGS.md
  - Reviewer approval from maintainers
- Request/response payloads must be validated using typed models.
- Error responses must be explicit and non-ambiguous.
- Avoid silent fallback behavior that hides failures from clients.

## 6. Frontend Rules
- Frontend must consume backend through the API utility layer in web/lib/.
- No hardcoded production URLs in feature components.
- Loading, success, and failure states must all be visible in UI.
- Any UI that triggers long-running jobs must support polling and user-safe retries.

## 7. Code Quality Rules
### Python
- Type hints required for new/modified public functions.
- No bare except statements.
- Keep functions focused and small.
- Raise meaningful exceptions at boundaries.

### TypeScript/Next.js
- Maintain strict typing.
- Avoid any unless justified in code comments.
- Use composable components and keep API calls centralized.

### General
- No dead/commented-out code in committed changes.
- No secrets, keys, or tokens in source.
- Keep code comments concise and meaningful.

## 8. Testing and Validation Rules
Before merge, contributors must run relevant checks:
- Backend tests (if present)
- Frontend lint
- Frontend type/build checks for changed paths
- Targeted regression test for changed behavior

Minimum acceptance for code changes:
- New behavior is verified by test or documented manual verification.
- Existing behavior affected by change is revalidated.

## 9. Documentation Rules
- Any behavior change must update:
  - User-facing docs if UX/API changed
  - Internal docs if architecture or flow changed
  - CHANGELOGS.md entry in the current release section
- Keep docs aligned with actual code paths.

## 10. Git and Review Rules
- One logical change per commit.
- Commit message style:
  - type(scope): imperative summary
  - Example: feat(api): add job cancellation endpoint
- Pull request must include:
  - What changed
  - Why it changed
  - Risk and rollback notes
  - Validation evidence

## 11. Security and Safety Rules
- Never commit secrets.
- Sanitize all external inputs and untrusted content.
- Treat generated text and fetched repo content as untrusted input.
- Log security-relevant errors with enough context for investigation.

## 12. Observability Rules
- New critical paths must emit clear logs for start, key transition, and failure.
- Failures must include actionable message context (without leaking secrets).
- Long-running tasks should provide status transitions visible to clients.

## 13. Change Management Rules
- Every merged code or docs change must have a corresponding entry in CHANGELOGS.md.
- If a change is too small to list independently, group it under an existing entry with clear scope.
- Historical backfills should be explicitly marked as inferred when exact dates are unknown.

## 14. Agent-Specific Operating Rules
All AI agents working on this repository must:
- Read relevant files before editing.
- Make minimal, focused changes.
- Avoid unrelated refactors.
- Validate with lint/tests when feasible.
- Report blockers explicitly instead of guessing.
- Update CHANGELOGS.md for every committed change.

## 15. Exceptions
Any exception to this SPEC requires:
- Written rationale in pull request
- Explicit maintainer approval
- Follow-up task if debt is introduced

## 16. Ownership
Repository maintainers own this SPEC.
Contributors may propose updates via pull requests.

---
If a rule here conflicts with a critical production hotfix need, prioritize service restoration first, then document the exception and remediation plan immediately after stabilization.

# FastAPI Backend Implementation Plan

## Goal
Transform the CLI-based Tutorial Generator into a web service using **FastAPI**. This will allow the system to be integrated into a frontend application or invoked remotely.

## Core Design
- **Async Processing**: Tutorial generation is time-consuming. We will use FastAPI's `BackgroundTasks` to handle generation effectively without blocking the API.
- **State Management**: We will track "Jobs" using a simple in-memory store (or file-based status) to allow clients to poll for progress.
- **Modularity**: We will refactor `main.py` to extract the core orchestration logic into a separate `service` module that can be imported by the API.

## Proposed Changes

### 1. Refactoring Core Logic
#### [NEW] `core/pipeline.py` (or extract from `main.py`)
- Create a function `run_tutorial_pipeline(params: dict)` that:
    - Sets up the `shared` dictionary.
    - runs `create_tutorial_flow`.
    - Handles exceptions and logging.
- This decoupling allows both `main.py` (CLI) and `server/app.py` (API) to use the exact same logic.

### 2. FastAPI Application Structure
New directory: `server/`

#### [NEW] `server/app.py`
- **POST /api/generate/text**
    - Body: `{"repo_url": "...", "clean": bool}`
    - Action: Starts `run_tutorial_pipeline` in background (Text mode).
    - Returns: `{"job_id": "...", "project_name": "..."}`

#### [NEW] `server/app.py` (Video)
- **POST /api/generate/video**
    - Body: `{"project_name": "...", "voice": "...", "style": "..."}`
    - Action: Starts `run_tutorial_pipeline` in background (Video mode).
    - Returns: `{"job_id": "..."}`

#### [NEW] `server/app.py` (Status & Artifacts)
- **GET /api/jobs/{job_id}**
    - Returns task status (queued, processing, completed, failed).
- **GET /api/projects/{project_name}/artifacts**
    - Returns list of generated files or serves them statically.

## Dependencies
- `fastapi`
- `uvicorn`
- `pydantic`

## Verification Plan
1.  Start server: `uvicorn server.app:app --reload`
2.  Open Swagger UI (`http://localhost:8000/docs`).
3.  Trigger text generation for a small repo.
4.  Poll status endpoint.
5.  Trigger video generation for the completed project.
6.  Verify outputs in the `output/` directory.

---

## Performance Optimization Plan (Phase 1 + Phase 2)

### Objective
Reduce markdown tutorial build latency from 30+ minutes to a practical low-latency baseline by shrinking prompt/context size and parallelizing chapter generation.

### Checklist
- [x] Define optimization scope and measurable target
- [x] Create implementation checklist and execution order
- [x] Phase 1: Add prompt/context caps for relationship and chapter generation
- [x] Phase 1: Reduce LLM retry tail latency for text nodes
- [x] Phase 2: Convert chapter writer to async parallel execution with bounded concurrency
- [ ] Run end-to-end benchmark and compare before/after runtime
- [ ] Tune default concurrency and context caps with real repos

### Phase 1 Implementation Details
1. Prompt/context controls
- Add configurable environment caps for relationship analysis context:
    - `FAST_REL_MAX_FILE_CHARS`
    - `FAST_REL_MAX_CONTEXT_CHARS`
- Add configurable environment caps for chapter write context:
    - `FAST_CHAPTER_MAX_FILE_CHARS`
    - `FAST_CHAPTER_MAX_CONTEXT_CHARS`
- Replace unbounded previous chapter summary expansion with bounded, metadata-only bridge context.

2. Retry tail-latency tuning
- Reduce default retries from `5` to `2` for text-generation nodes.
- Reduce default retry wait from `20s` to `4s`.
- Make retry behavior configurable through env:
    - `LLM_NODE_MAX_RETRIES`
    - `LLM_NODE_RETRY_WAIT_SEC`

### Phase 2 Implementation Details
1. Parallel chapter generation
- Replace sequential `BatchNode` chapter writer with `AsyncParallelBatchNode`.
- Wrap blocking LLM calls with `asyncio.to_thread(...)`.
- Add bounded concurrency via `asyncio.Semaphore` and env var:
    - `FAST_CHAPTER_PARALLELISM` (default `3`)

2. Async flow execution
- Run text pipeline with `AsyncFlow` so mixed sync + async nodes can be orchestrated.
- Update pipeline runner to invoke async flow safely.

### Acceptance Criteria
- Text generation starts producing chapters significantly earlier.
- Chapter generation stage runtime reduced materially on medium repositories.
- No regression in output folder structure and generated artifact format.
- Existing API contracts remain unchanged.

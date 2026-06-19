import os
import uuid
import asyncio
import contextlib
import re
from html import escape
from urllib.parse import quote
from datetime import datetime, timezone
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
from core.pipeline import run_tutorial_pipeline
from utils.repo_identity import derive_project_name

app = FastAPI(title="PocketFlow Tutorial Generator API")

# --- CORS ---
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for development convenience
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-Memory Job Store ---
JOBS = {}  # { job_id: { status: "queued"|"processing"|"completed"|"failed", result: dict, error: str } }
CHAPTER_TOTAL_RE = re.compile(r"^CHAPTER_TOTAL:\s*(\d+)\s*$")
CHAPTER_READY_RE = re.compile(r"^CHAPTER_READY:\s*(.+)\s*$")
MAX_TUTORIAL_FILES = max(1, int(os.getenv("FAST_TUTORIAL_MAX_FILES", "5")))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _infer_progress(message: str) -> int:
    msg = message.lower()
    if "crawling repository" in msg:
        return 8
    if "fetched " in msg and " files" in msg:
        return 20
    if "identifying abstractions" in msg:
        return 35
    if "analyzing relationships" in msg:
        return 50
    if "determining chapter order" in msg:
        return 62
    if "writing chapter" in msg:
        return 75
    if "combining tutorial" in msg:
        return 90
    if "tutorial generation complete" in msg:
        return 100
    return -1


def append_job_log(job_id: str, message: str):
    job = JOBS.get(job_id)
    if not job:
        return

    cleaned = message.strip()
    if not cleaned:
        return

    logs = job.setdefault("logs", [])
    logs.append(
        {
            "timestamp": _now_iso(),
            "message": cleaned,
        }
    )

    max_logs = 2000
    if len(logs) > max_logs:
        del logs[: len(logs) - max_logs]

    inferred = _infer_progress(cleaned)
    if inferred >= 0:
        current = job.get("progress", 0)
        job["progress"] = max(current, inferred)

    total_match = CHAPTER_TOTAL_RE.match(cleaned)
    if total_match:
        total = min(int(total_match.group(1)), MAX_TUTORIAL_FILES)
        job["total_chapters"] = total
        job["completed_chapters"] = min(job.get("completed_chapters", 0), total)
        return

    ready_match = CHAPTER_READY_RE.match(cleaned)
    if ready_match:
        chapter_file = ready_match.group(1).strip()
        files = job.setdefault("chapter_files", [])
        if chapter_file and chapter_file not in files and len(files) < MAX_TUTORIAL_FILES:
            files.append(chapter_file)
            files.sort()
        job["completed_chapters"] = min(len(files), MAX_TUTORIAL_FILES)
        total = job.get("total_chapters", 0)
        if total > 0:
            ratio = int((len(files) / total) * 100)
            job["progress"] = max(job.get("progress", 0), min(95, 62 + ratio // 3))


class JobLogWriter:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self._buffer = ""

    def write(self, data):
        if not isinstance(data, str):
            data = str(data)

        self._buffer += data
        while "\n" in self._buffer:
            line, self._buffer = self._buffer.split("\n", 1)
            append_job_log(self.job_id, line)
        return len(data)

    def flush(self):
        if self._buffer.strip():
            append_job_log(self.job_id, self._buffer)
        self._buffer = ""

# --- Models ---
class TextGenerationRequest(BaseModel):
    repo_url: str
    clean: Optional[bool] = False
    language: Optional[str] = "english"
    
class VideoGenerationRequest(BaseModel):
    repo_url: str # To identify project
    voice: Optional[str] = "en-US-AriaNeural"
    style: Optional[str] = "dark"

# --- Background Worker ---
def worker_task(job_id: str, params: dict):
    JOBS[job_id]["status"] = "processing"
    JOBS[job_id]["progress"] = max(JOBS[job_id].get("progress", 0), 5)
    append_job_log(job_id, "Job started.")

    log_writer = JobLogWriter(job_id)
    try:
        # Run synchronous pipeline with stdout/stderr captured into per-job logs
        with contextlib.redirect_stdout(log_writer), contextlib.redirect_stderr(log_writer):
            result = run_tutorial_pipeline(params)

        JOBS[job_id]["status"] = "completed"
        JOBS[job_id]["progress"] = 100
        if result.get("project_name"):
            JOBS[job_id]["project_name"] = result.get("project_name")
        JOBS[job_id]["result"] = {
            "project_name": result.get("project_name"),
            "final_output_dir": result.get("final_output_dir")
        }
        append_job_log(job_id, "Job completed successfully.")
    except Exception as e:
        JOBS[job_id]["status"] = "failed"
        JOBS[job_id]["error"] = str(e)
        JOBS[job_id]["progress"] = max(JOBS[job_id].get("progress", 0), 95)
        append_job_log(job_id, f"Job failed: {e}")
        print(f"Job {job_id} failed: {e}")
    finally:
        log_writer.flush()

# --- Endpoints ---

@app.post("/api/generate/text")
async def generate_text(req: TextGenerationRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    project_name = derive_project_name(req.repo_url, fallback="repository")
    JOBS[job_id] = {
        "status": "queued",
        "type": "text",
        "progress": 1,
        "logs": [],
        "project_name": project_name,
        "total_chapters": 0,
        "completed_chapters": 0,
        "chapter_files": [],
    }
    append_job_log(job_id, "Job queued for text generation.")
    
    params = {
        "repo_url": req.repo_url,
        "clean": req.clean,
        "language": req.language,
        "video_mode": "none"
    }
    
    background_tasks.add_task(worker_task, job_id, params)
    return {"job_id": job_id, "status": "queued"}

@app.post("/api/generate/video")
async def generate_video(req: VideoGenerationRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "status": "queued",
        "type": "video",
        "progress": 1,
        "logs": [],
        "total_chapters": 0,
        "completed_chapters": 0,
        "chapter_files": [],
    }
    append_job_log(job_id, "Job queued for video generation.")
    
    params = {
        "repo_url": req.repo_url, # Project name derived from this
        "video_mode": "only",
        "voice": req.voice,
        "style": req.style
    }
    
    background_tasks.add_task(worker_task, job_id, params)
    return {"job_id": job_id, "status": "queued"}

@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    return JOBS[job_id]


@app.get("/api/jobs/{job_id}/logs")
async def get_job_logs(job_id: str, since: int = 0):
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")

    logs = JOBS[job_id].get("logs", [])
    safe_since = max(0, int(since))
    sliced = logs[safe_since:]
    return {
        "job_id": job_id,
        "status": JOBS[job_id].get("status"),
        "progress": JOBS[job_id].get("progress", 0),
        "project_name": JOBS[job_id].get("project_name"),
        "total_chapters": JOBS[job_id].get("total_chapters", 0),
        "completed_chapters": JOBS[job_id].get("completed_chapters", 0),
        "chapter_files": JOBS[job_id].get("chapter_files", []),
        "logs": sliced,
        "next_since": safe_since + len(sliced),
    }


@app.get("/api/jobs/{job_id}/chapters")
async def get_job_chapters(job_id: str):
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")

    job = JOBS[job_id]
    return {
        "job_id": job_id,
        "project_name": job.get("project_name"),
        "status": job.get("status"),
        "total_chapters": job.get("total_chapters", 0),
        "completed_chapters": job.get("completed_chapters", 0),
        "chapter_files": job.get("chapter_files", []),
    }

@app.get("/api/projects/{project_name}/artifacts")
async def list_artifacts(project_name: str):
    output_dir = "output"
    project_path = os.path.join(output_dir, project_name)
    
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project artifacts not found")
        
    files = []
    for root, _, filenames in os.walk(project_path):
        for filename in filenames:
            rel_path = os.path.relpath(os.path.join(root, filename), project_path)
            files.append(rel_path)
            
    return {"project": project_name, "files": files}


@app.get("/output/{project_name}/tutorial.mp4")
async def tutorial_video_page(project_name: str, raw: bool = False):
        video_path = os.path.join("output", project_name, "tutorial.mp4")
        if not os.path.exists(video_path):
                raise HTTPException(status_code=404, detail="Video file not found")

        if raw:
                return FileResponse(video_path, media_type="video/mp4", filename="tutorial.mp4")

        encoded_project = quote(project_name, safe="")
        safe_project_label = escape(project_name)
        video_src = f"/output/{encoded_project}/tutorial.mp4?raw=1"
        fallback_url = f"http://localhost:3000/tutorial/{encoded_project}"

        html = f"""<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tutorial Video - {safe_project_label}</title>
    <style>
        :root {{ color-scheme: dark; }}
        body {{
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: radial-gradient(circle at top, #0f172a, #020617 65%);
            font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
            color: #e2e8f0;
        }}
        .shell {{ width: min(96vw, 1200px); padding: 16px; }}
        .toolbar {{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }}
        .btn {{
            border: 1px solid rgba(226, 232, 240, 0.35);
            background: rgba(15, 23, 42, 0.85);
            color: #e2e8f0;
            border-radius: 10px;
            padding: 8px 12px;
            text-decoration: none;
            font-size: 13px;
            cursor: pointer;
        }}
        .btn:hover {{ background: rgba(30, 41, 59, 0.95); }}
        video {{ width: 100%; max-height: calc(100vh - 96px); border-radius: 12px; background: #000; }}
    </style>
</head>
<body>
    <main class="shell">
        <div class="toolbar">
            <button class="btn" onclick="goBack()">Back</button>
            <span>Project: {safe_project_label}</span>
        </div>
        <video controls preload="metadata" autoplay playsinline src="{video_src}"></video>
    </main>
    <script>
        function goBack() {{
            if (window.history.length > 1) {{
                window.history.back();
                return;
            }}
            window.location.href = {fallback_url!r};
        }}
    </script>
</body>
</html>
"""
        return HTMLResponse(content=html)

# Mount output directory to serve static files (markdown, videos, images)
# Access: http://localhost:8000/output/project_name/filename.md
if not os.path.exists("output"):
    os.makedirs("output")
app.mount("/output", StaticFiles(directory="output"), name="output")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("path/to/favicon.ico") if os.path.exists("path/to/favicon.ico") else JSONResponse({})

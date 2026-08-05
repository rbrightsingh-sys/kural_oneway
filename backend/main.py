"""
Kural 1-Way — demo backend stub.

Implements just enough of the API contract for the frontend to run
end-to-end during a demo:

  POST /api/upload        -> accepts audio (multipart) or typed text, returns a job_id
  GET  /api/job/{job_id}  -> returns job status; flips to "completed" after a short delay

Replace the `process_job` body with real transcription / routing logic
(e.g. Whisper, a queue worker, etc.) when wiring up the production backend.
"""

import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Kural 1-Way API")

# Allow the local Vite dev server (and any origin, for demo simplicity) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory job store — fine for a demo, swap for Redis/DB in production.
JOBS: dict[str, dict] = {}

PROCESSING_SECONDS = 4  # simulated transcription/processing time


class JobResponse(BaseModel):
    job_id: str


class JobStatus(BaseModel):
    status: str
    result: Optional[dict] = None


@app.post("/api/upload", response_model=JobResponse)
async def upload_feedback(
    file: Optional[UploadFile] = File(default=None),
    text: Optional[str] = Form(default=None),
):
    job_id = str(uuid.uuid4())
    submitted_at = time.time()

    if file is not None:
        dest = UPLOAD_DIR / f"{job_id}.webm"
        contents = await file.read()
        dest.write_bytes(contents)
        kind = "audio"
    else:
        kind = "text"

    JOBS[job_id] = {
        "status": "processing",
        "kind": kind,
        "text": text,
        "submitted_at": submitted_at,
        "result": None,
    }
    return {"job_id": job_id}


@app.get("/api/job/{job_id}", response_model=JobStatus)
async def get_job(job_id: str):
    job = JOBS.get(job_id)
    if job is None:
        return {"status": "failed", "result": {"error": "Job not found"}}

    elapsed = time.time() - job["submitted_at"]
    if job["status"] != "completed" and elapsed >= PROCESSING_SECONDS:
        job["status"] = "completed"
        job["result"] = {
            "kind": job["kind"],
            "summary": "Thanks — your feedback has been received and routed to the team.",
        }

    return {"status": job["status"], "result": job["result"]}


@app.get("/api/health")
async def health():
    return {"status": "ok"}

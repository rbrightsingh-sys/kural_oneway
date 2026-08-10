"""
Kural 1-Way — backend.

Implements the upload / job-polling contract the frontend expects,
performs real speech-to-text transcription + summarization via the
Gemini API (google-genai SDK), and persists every submission to MongoDB.

  POST /api/upload              -> accepts audio (multipart) or typed text, returns a job_id
  GET  /api/job/{job_id}        -> returns job status; "completed" once processing finishes
  GET  /api/dashboard/stats     -> overview counts + submissions-per-day trend
  GET  /api/dashboard/submissions -> paginated/filterable submissions table

Audio jobs are transcribed (and then summarized) by Gemini in a background
task so /api/upload returns immediately with a job_id, matching the polling
flow already built into the frontend (useJobPolling.js). Each submission is
stored as one document in the `feedback_submissions` MongoDB collection,
created as "processing" and updated in place once the background job
finishes.

"""

import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, Form, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel
from pymongo import MongoClient
from pymongo.collection import Collection
import certifi

load_dotenv()

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

# Hardcoded for now — will come from an auth/session/client-lookup once
# this product supports more than one client.
CLIENT_NAME = "Pothys"

# ---------------------------------------------------------------------------
# MongoDB
# ---------------------------------------------------------------------------

MONGODB_URI ="mongodb+srv://rbrightsingh_db_user:ilDuIl0FR0075hcA@cluster0.jviyzvf.mongodb.net/?appName=Cluster0"
#  os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME ="kural_oneway"
#  os.getenv("MONGODB_DB_NAME", "kural_one_way")

mongo_client = MongoClient(MONGODB_URI,tlsCAFile=certifi.where())
db = mongo_client[MONGODB_DB_NAME]
submissions: Collection = db["feedback_submissions"]


@app.on_event("startup")
def ensure_indexes():
    submissions.create_index("job_id", unique=True)
    submissions.create_index([("client_name", 1), ("created_at", -1)])


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_submission(job_id: str, kind: str, audio_url: Optional[str]) -> None:
    submissions.insert_one(
        {
            "job_id": job_id,
            "client_name": CLIENT_NAME,
            "kind": kind,
            "audio_url": audio_url,
            "status": "processing",
            "stt_raw_response": None,
            "transcript_text": None,
            "summary": None,
            "error": None,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
    )


def update_submission(job_id: str, **fields) -> None:
    submissions.update_one(
        {"job_id": job_id},
        {"$set": {**fields, "updated_at": utcnow()}},
    )


def get_submission(job_id: str) -> Optional[dict]:
    return submissions.find_one({"job_id": job_id})


# fix this hardcoded key and model in the code, and use the .env file instead

GEMINI_API_KEY =""
# 'AQ.Ab8RN6IMfsQvZxBFU1pnPH1liEL8CWDsnyRvluak_9f4OqFPjw' 
# os.getenv("GEMINI_API_KEY")
GEMINI_MODEL ="gemini-3.5-flash"
#  os.getenv("GEMINI_MODEL")

TRANSCRIBE_PROMPT = (
    "Please transcribe this audio file and provide the text content only, "
    "with no additional commentary or preamble."
)

SUMMARIZE_PROMPT_TEMPLATE = (
    "Summarize the following customer feedback in 1-2 concise sentences. "
    "Capture the key point and overall sentiment. Respond with the summary "
    "text only, no preamble.\n\nFeedback:\n{transcript}"
)

MIME_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".aac": "audio/aac",
    ".m4a": "audio/mp4",
}

_client: Optional[genai.Client] = None


def get_client() -> genai.Client:
    """Lazily create the Gemini client so a missing key only breaks
    transcription jobs, not the whole app (e.g. text-only demos still work)."""
    global _client
    if _client is None:
        if not GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to backend/.env (see .env.example)."
            )
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def guess_mime_type(filename: str, fallback: str = "audio/webm") -> str:
    ext = Path(filename).suffix.lower()
    return MIME_TYPES.get(ext, fallback)


def transcribe_audio(file_path: Path, mime_type: str):
    """Blocking Gemini call — safe to run in a background task since
    FastAPI/Starlette runs sync background tasks in a threadpool.
    Returns (transcript_text, raw_response_dict)."""
    client = get_client()
    audio_bytes = file_path.read_bytes()

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
            TRANSCRIBE_PROMPT,
        ],
    )
    transcript = (response.text or "").strip()
    raw_response = response.model_dump(mode="json")
    return transcript, raw_response


def summarize_transcript(transcript: str) -> str:
    """Second Gemini call: takes the transcript produced by transcribe_audio()
    and asks Gemini to condense it into a short summary."""
    client = get_client()
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[SUMMARIZE_PROMPT_TEMPLATE.format(transcript=transcript)],
    )
    return (response.text or "").strip()


# ---------------------------------------------------------------------------
# Background job processing
# ---------------------------------------------------------------------------


class JobResponse(BaseModel):
    job_id: str


class JobStatus(BaseModel):
    status: str
    result: Optional[dict] = None


def process_audio_job(job_id: str, file_path: Path, mime_type: str):
    try:
        transcript, raw_response = transcribe_audio(file_path, mime_type)
        print(f"\n📝 [job {job_id}] Transcript:\n{transcript}\n")

        summary = summarize_transcript(transcript)
        print(f"📋 [job {job_id}] Summary:\n{summary}\n")

        update_submission(
            job_id,
            status="completed",
            stt_raw_response=raw_response,
            transcript_text=transcript,
            summary=summary,
        )
    except Exception as exc:  # noqa: BLE001 — surfaced to the client via job status
        update_submission(job_id, status="failed", error=str(exc))
    #finally:
        #file_path.unlink(missing_ok=True)


def process_text_job(job_id: str, text: str):
    summary = "Thanks — your feedback has been received and routed to the team."
    update_submission(
        job_id,
        status="completed",
        transcript_text=text,
        summary=summary,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.post("/api/upload", response_model=JobResponse)
async def upload_feedback(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(default=None),
    text: Optional[str] = Form(default=None),
):
    job_id = str(uuid.uuid4())

    if file is not None:
        mime_type = file.content_type or guess_mime_type(file.filename or "feedback.webm")
        suffix = Path(file.filename or "feedback.webm").suffix or ".webm"
        dest = UPLOAD_DIR / f"{job_id}{suffix}"
        dest.write_bytes(await file.read())

        # Local path for now — point this at your bucket/CDN URL in production.
        audio_url = str(dest.resolve())

        create_submission(job_id, kind="audio", audio_url=audio_url)
        background_tasks.add_task(process_audio_job, job_id, dest, mime_type)

    elif text is not None and text.strip():
        create_submission(job_id, kind="text", audio_url=None)
        background_tasks.add_task(process_text_job, job_id, text.strip())

    else:
        create_submission(job_id, kind="unknown", audio_url=None)
        update_submission(job_id, status="failed", error="No audio file or text was provided.")

    return {"job_id": job_id}


@app.get("/api/job/{job_id}", response_model=JobStatus)
async def get_job(job_id: str):
    submission = get_submission(job_id)
    if submission is None:
        return {"status": "failed", "result": {"error": "Job not found"}}

    if submission["status"] == "failed":
        result = {"error": submission.get("error") or "Processing failed."}
    elif submission["status"] == "completed":
        result = {
            "kind": submission.get("kind"),
            "transcript": submission.get("transcript_text"),
            "summary": submission.get("summary"),
        }
    else:
        result = None

    return {"status": submission["status"], "result": result}


# ---------------------------------------------------------------------------
# Dashboard routes
#
# Both read-only, scoped to CLIENT_NAME (same field the
# `client_name + created_at` index was already built for — see handover.md
# §9). No auth yet, matching the rest of the API.
# ---------------------------------------------------------------------------

TREND_DAYS = 14


@app.get("/api/dashboard/stats")
async def dashboard_stats():
    match_client = {"$match": {"client_name": CLIENT_NAME}}

    status_counts = {
        doc["_id"]: doc["count"]
        for doc in submissions.aggregate(
            [match_client, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
        )
    }

    kind_counts = {
        doc["_id"]: doc["count"]
        for doc in submissions.aggregate(
            [match_client, {"$group": {"_id": "$kind", "count": {"$sum": 1}}}]
        )
    }

    # Submissions per day, last TREND_DAYS days (UTC calendar days, zero-filled).
    since = utcnow() - timedelta(days=TREND_DAYS - 1)
    trend_docs = list(
        submissions.aggregate(
            [
                {"$match": {"client_name": CLIENT_NAME, "created_at": {"$gte": since}}},
                {
                    "$group": {
                        "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                        "count": {"$sum": 1},
                    }
                },
            ]
        )
    )
    trend_by_day = {doc["_id"]: doc["count"] for doc in trend_docs}

    trend = []
    for i in range(TREND_DAYS):
        day = (since + timedelta(days=i)).strftime("%Y-%m-%d")
        trend.append({"date": day, "count": trend_by_day.get(day, 0)})

    total = sum(status_counts.values())

    return {
        "total": total,
        "completed": status_counts.get("completed", 0),
        "processing": status_counts.get("processing", 0),
        "failed": status_counts.get("failed", 0),
        "audio_count": kind_counts.get("audio", 0),
        "text_count": kind_counts.get("text", 0),
        "trend": trend,
    }


@app.get("/api/dashboard/submissions")
async def dashboard_submissions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    status: Optional[str] = Query(default=None),
    kind: Optional[str] = Query(default=None),
):
    query: dict = {"client_name": CLIENT_NAME}
    if status and status != "all":
        query["status"] = status
    if kind and kind != "all":
        query["kind"] = kind

    total = submissions.count_documents(query)

    cursor = (
        submissions.find(query)
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )

    items = [
        {
            "job_id": doc.get("job_id"),
            "kind": doc.get("kind"),
            "status": doc.get("status"),
            "transcript_text": doc.get("transcript_text"),
            "summary": doc.get("summary"),
            "error": doc.get("error"),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        }
        for doc in cursor
    ]

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@app.get("/api/health")
async def health():
    try:
        mongo_client.admin.command("ping")
        mongo_status = "connected"
    except Exception as exc:  # noqa: BLE001
        mongo_status = f"unreachable ({exc})"

    return {
        "status": "ok",
        "service": "Kural 1-Way API",
        "gemini_api_key": "loaded" if GEMINI_API_KEY else "missing",
        "model": GEMINI_MODEL,
        "mongodb": mongo_status,
    }

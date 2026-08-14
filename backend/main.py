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
from io import BytesIO
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, Body, FastAPI, File, Form, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
from pydantic import BaseModel
from pymongo import MongoClient
from pymongo.collection import Collection
import certifi
import requests

from report import build_report_pdf, parse_report_datetime

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
visitor_locations: Collection = db["visitor_locations"]


@app.on_event("startup")
def ensure_indexes():
    submissions.create_index("job_id", unique=True)
    submissions.create_index([("client_name", 1), ("created_at", -1)])
    visitor_locations.create_index([("created_at", -1)])

IST = timezone(timedelta(hours=5, minutes=30))
def ist_now() -> datetime:
    return datetime.now(IST)


def reverse_geocode_place_name(latitude: Optional[float], longitude: Optional[float]) -> Optional[str]:
    if latitude is None or longitude is None:
        return None

    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": latitude,
                "lon": longitude,
                "format": "jsonv2",
                "addressdetails": 1,
            },
            headers={"User-Agent": "KuralOneWay/1.0"},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        address = data.get("address") or {}

        local_place = next(
            (
                value
                for value in [
                    address.get("village"),
                    address.get("hamlet"),
                    address.get("locality"),
                    address.get("town"),
                    address.get("municipality"),
                    address.get("city"),
                    address.get("suburb"),
                    address.get("neighbourhood"),
                    address.get("quarter"),
                ]
                if value
            ),
            None,
        )

        place_parts = []
        if local_place:
            place_parts.append(local_place)

        for extra in [
            address.get("district"),
            address.get("county"),
            address.get("state"),
            address.get("country"),
        ]:
            if extra and extra != local_place:
                place_parts.append(extra)

        if place_parts:
            return ", ".join(place_parts)

        return data.get("display_name")
    except Exception as exc:  # noqa: BLE001
        print(f"⚠️ [geo] Reverse geocode failed for ({latitude}, {longitude}): {exc}")
        return None


def create_submission(
    job_id: str,
    kind: str,
    audio_url: Optional[str],
    geolocation: Optional[dict] = None,
) -> None:
    payload = {
        "job_id": job_id,
        "client_name": CLIENT_NAME,
        "kind": kind,
        "audio_url": audio_url,
        "status": "processing",
        "stt_raw_response": None,
        "transcript_text": None,
        "summary": None,
        "error": None,
        "gender": None,
        "created_at": ist_now(),
        "updated_at": ist_now(),
    }

    if geolocation:
        geolocation = dict(geolocation)
        place_name = geolocation.get("place_name") or reverse_geocode_place_name(
            geolocation.get("latitude"), geolocation.get("longitude")
        )
        if place_name:
            geolocation["place_name"] = place_name
            payload["place_name"] = place_name

        payload["geolocation"] = geolocation
        if geolocation.get("latitude") is not None:
            payload["latitude"] = geolocation["latitude"]
        if geolocation.get("longitude") is not None:
            payload["longitude"] = geolocation["longitude"]
        if geolocation.get("accuracy") is not None:
            payload["accuracy"] = geolocation["accuracy"]
        if geolocation.get("timestamp") is not None:
            payload["geo_timestamp"] = geolocation["timestamp"]

    submissions.insert_one(payload)


def update_submission(job_id: str, **fields) -> None:
    existing = get_submission(job_id) or {}
    for key in ("geolocation", "latitude", "longitude", "accuracy", "geo_timestamp", "place_name", "source"):
        if existing.get(key) is not None and key not in fields:
            fields[key] = existing[key]

    submissions.update_one(
        {"job_id": job_id},
        {"$set": {**fields, "updated_at": ist_now()}},
    )


def get_submission(job_id: str) -> Optional[dict]:
    return submissions.find_one({"job_id": job_id})


# fix this hardcoded key and model in the code, and use the .env file instead

GEMINI_API_KEY ='AQ.Ab8RN6Le5nHVSkYSvBMajfsEt8UYD4jUZYp802_CMT5WRGNchQ'
# 'AQ.Ab8RN6IpNJwQEcxzE_k6cqTIEICtN_tFeAVuzbZL8F9dM-1dlg'
# 'AQ.Ab8RN6IMfsQvZxBFU1pnPH1liEL8CWDsnyRvluak_9f4OqFPjw'
# "AQ.Ab8RN6LYGim4FShwxBmoscT8U-cQ-fga28TE_cg0oRug88wUKQ""

 
# os.getenv("GEMINI_API_KEY")
GEMINI_MODEL ="gemini-3.6-flash"
#  os.getenv("GEMINI_MODEL")

TRANSCRIBE_PROMPT = (
    "Transcribe the audio file and identify the apparent gender of the speaker "
    "based only on the voice characteristics in the audio. "
    "Do not infer gender from the content or words spoken. "
    "If the speaker's gender cannot be determined with reasonable confidence, "
    "use Unknown.\n\n"

    "Use exactly this format:\n"
    "Transcript: <transcribed text>\n"
    "Gender: <Male/Female/Unknown>\n\n"

    "Respond only in this format, with no additional commentary or preamble."
)


SUMMARIZE_PROMPT_TEMPLATE = (
    "Analyze the following customer feedback and provide a concise summary. "
    "Capture the key point and overall sentiment in 1-2 sentences. "
    "Also classify the feedback into a relevant category and assign an urgency score.\n\n"

    "Sentiment: Choose exactly one of: Positive, Negative, or Neutral.\n"

    "Urgency: Assign a number from 1-5 based on how urgently the issue requires attention:\n"
    "1 = Very low urgency, informational or minor feedback\n"
    "2 = Low urgency, can be addressed later\n"
    "3 = Moderate urgency, should be addressed in a reasonable timeframe\n"
    "4 = High urgency, requires prompt attention\n"
    "5 = Critical urgency, requires immediate attention\n"

    "Category: Choose the category that best represents the main topic of the feedback. "
    "Examples include Pricing, Quality, Service, Staff, Product, Delivery, Support, "
    "Technical Issue, Billing, Experience, or Other. "
    "The category is not limited to these examples; create a more appropriate category "
    "when necessary.\n\n"

    "Gender: Use the gender identified during audio transcription. "
    "Do not infer or modify the gender value.\n\n"

    "Use exactly this format:\n"
    "Summary: <1-2 sentence summary>\n"
    "Sentiment: <Positive/Negative/Neutral>\n"
    "Urgency: <1-5>\n"
    "Category: <category>\n"
    "Gender: <gender>\n\n"

    "Respond only in this format, with no additional commentary.\n\n"

    "Detected Gender: {gender}\n\n"
    "Feedback:\n{transcript}"
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
    """Blocking Gemini call.

    Returns:
        (transcript_text, gender, raw_response_dict)
    """
    client = get_client()
    audio_bytes = file_path.read_bytes()

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
            TRANSCRIBE_PROMPT,
        ],
    )

    raw_text = (response.text or "").strip()

    # Defaults in case Gemini returns an unexpected format
    transcript = raw_text
    gender = "Unknown"

    # Parse:
    # Transcript: ...
    # Gender: Male/Female/Unknown
    for line in raw_text.splitlines():
        line = line.strip()

        if line.lower().startswith("transcript:"):
            transcript = line.split(":", 1)[1].strip()

        elif line.lower().startswith("gender:"):
            detected_gender = line.split(":", 1)[1].strip()

            if detected_gender.lower() in {"male", "female", "unknown"}:
                gender = detected_gender.capitalize()

    raw_response = response.model_dump(mode="json")

    return transcript, gender, raw_response


def summarize_transcript(transcript: str, gender: str) -> str:
    """Second Gemini call: summarizes the transcript and uses
    the gender detected during audio transcription."""

    client = get_client()

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            SUMMARIZE_PROMPT_TEMPLATE.format(
                transcript=transcript,
                gender=gender,
            )
        ],
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


class GeoLocationPayload(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    timestamp: Optional[float] = None
    source: str = "home_page"
    place_name: Optional[str] = None


def save_geolocation(payload: GeoLocationPayload):
    place_name = payload.place_name or reverse_geocode_place_name(payload.latitude, payload.longitude)
    print(
        "\n📍 [geo] Received location: "
        f"source={payload.source}, "
        f"latitude={payload.latitude}, "
        f"longitude={payload.longitude}, "
        f"accuracy={payload.accuracy}, "
        f"timestamp={payload.timestamp}, "
        f"place_name={place_name}\n"
    )
    if place_name:
        print(f"📍 [geo] Place: {place_name}")

    location_data = {
        "source": payload.source,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "accuracy": payload.accuracy,
        "timestamp": payload.timestamp,
        "place_name": place_name,
        "created_at": ist_now(),
    }
    if payload.latitude is not None and payload.longitude is not None:
        location_data["coordinates"] = {
            "type": "Point",
            "coordinates": [payload.longitude, payload.latitude],
        }
    visitor_locations.insert_one(location_data)
    return location_data


def process_audio_job(job_id: str, file_path: Path, mime_type: str):
    try:
        transcript, gender, raw_response = transcribe_audio(
            file_path,
            mime_type
        )

        print(f"\n📝 [job {job_id}] Transcript:\n{transcript}\n")
        print(f"👤 [job {job_id}] Gender: {gender}\n")

        summary = summarize_transcript(
            transcript,
            gender
        )

        print(f"📋 [job {job_id}] Summary:\n{summary}\n")

        existing = get_submission(job_id) or {}
        place_name = existing.get("place_name") or existing.get("geolocation", {}).get("place_name")
        if place_name:
            print(f"✅ [job {job_id}] Completed place: {place_name}")

        update_submission(
            job_id,
            status="completed",
            stt_raw_response=raw_response,
            transcript_text=transcript,
            summary=summary,
            gender=gender,
        )

    except Exception as exc:  # noqa: BLE001 — surfaced to the client via job status
        existing = get_submission(job_id) or {}
        place_name = existing.get("place_name") or existing.get("geolocation", {}).get("place_name")
        if place_name:
            print(f"❌ [job {job_id}] Failed place: {place_name}")
        update_submission(
            job_id,
            status="failed",
            error=str(exc)
        )

    # finally:
    #     file_path.unlink(missing_ok=True)


def process_text_job(job_id: str, text: str):
    try:
        summary = "Thanks — your feedback has been received and routed to the team."
        existing = get_submission(job_id) or {}
        place_name = existing.get("place_name") or existing.get("geolocation", {}).get("place_name")
        if place_name:
            print(f"✅ [job {job_id}] Completed place: {place_name}")
        update_submission(
            job_id,
            status="completed",
            transcript_text=text,
            summary=summary,
            gender=None,
        )
    except Exception as exc:  # noqa: BLE001
        existing = get_submission(job_id) or {}
        place_name = existing.get("place_name") or existing.get("geolocation", {}).get("place_name")
        if place_name:
            print(f"❌ [job {job_id}] Failed place: {place_name}")
        update_submission(
            job_id,
            status="failed",
            error=str(exc)
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.post("/api/geo")
async def store_geolocation(payload: GeoLocationPayload = Body(...)):
    save_geolocation(payload)
    return {"message": "Geolocation stored successfully"}


@app.post("/api/upload", response_model=JobResponse)
async def upload_feedback(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(default=None),
    text: Optional[str] = Form(default=None),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    accuracy: Optional[float] = Form(default=None),
    geo_timestamp: Optional[float] = Form(default=None),
    source: Optional[str] = Form(default="feedback_submit"),
):
    job_id = str(uuid.uuid4())
    geolocation = None
    if latitude is not None or longitude is not None or accuracy is not None:
        geolocation = {
            "latitude": latitude,
            "longitude": longitude,
            "accuracy": accuracy,
            "timestamp": geo_timestamp,
            "source": source,
        }

    if file is not None:
        mime_type = file.content_type or guess_mime_type(file.filename or "feedback.webm")
        suffix = Path(file.filename or "feedback.webm").suffix or ".webm"
        dest = UPLOAD_DIR / f"{job_id}{suffix}"
        dest.write_bytes(await file.read())

        # Local path for now — point this at your bucket/CDN URL in production.
        audio_url = str(dest.resolve())

        create_submission(job_id, kind="audio", audio_url=audio_url, geolocation=geolocation)
        background_tasks.add_task(process_audio_job, job_id, dest, mime_type)

    elif text is not None and text.strip():
        create_submission(job_id, kind="text", audio_url=None, geolocation=geolocation)
        background_tasks.add_task(process_text_job, job_id, text.strip())

    else:
        create_submission(job_id, kind="unknown", audio_url=None, geolocation=geolocation)
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
    since = datetime.now(timezone.utc) - timedelta(days=TREND_DAYS - 1)
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
    date_from: Optional[str] = Query(default=None, description="YYYY-MM-DD, inclusive"),
    date_to: Optional[str] = Query(default=None, description="YYYY-MM-DD, inclusive"),
):
    query: dict = {"client_name": CLIENT_NAME}
    if status and status != "all":
        query["status"] = status
    if kind and kind != "all":
        query["kind"] = kind

    created_at_filter = {}
    if date_from:
        created_at_filter["$gte"] = parse_report_datetime(date_from)
    if date_to:
        created_at_filter["$lte"] = parse_report_datetime(date_to, end_of_day=True)
    if created_at_filter:
        query["created_at"] = created_at_filter

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
            "latitude": doc.get("latitude"),
            "longitude": doc.get("longitude"),
            "accuracy": doc.get("accuracy"),
            "place_name": doc.get("place_name"),
            "created_at": (
                doc.get("created_at").astimezone(IST).isoformat()
                if doc.get("created_at")
                else None
                ),
        }
        for doc in cursor
    ]

    return {"items": items, "total": total, "page": page, "page_size": page_size}


# ---------------------------------------------------------------------------
# PDF report generation — see report.py; main.py just calls it.
# ---------------------------------------------------------------------------


@app.get("/api/dashboard/report")
async def dashboard_report(
    date_from: Optional[str] = Query(default=None, description="YYYY-MM-DD, inclusive"),
    date_to: Optional[str] = Query(default=None, description="YYYY-MM-DD, inclusive"),
):
    pdf_bytes = build_report_pdf(submissions, CLIENT_NAME, date_from, date_to)
    bits = [b for b in (date_from, date_to) if b]
    filename = "kural-feedback-report" + (f"_{'_to_'.join(bits)}" if bits else "") + ".pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
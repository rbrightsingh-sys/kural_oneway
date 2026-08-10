# Kural 1-Way

Voice-first customer feedback collection. Say it once, we transcribe and route it — no forms, no friction.

```
kural-one-way/
├── frontend/                  React + Vite + Tailwind (this deliverable)
│   ├── src/
│   │   ├── components/        Modular UI pieces
│   │   ├── config/            API base URL config
│   │   ├── hooks/             useVoiceRecorder, useJobPolling
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
│
├── backend/                    FastAPI server (reserved / stubbed)
│   ├── main.py                  Minimal working stub matching the contract below
│   ├── requirements.txt
│   └── .env.example
│
└── README.md
```

## API contract (frontend ⇄ backend)

| Method | Path                  | Body / Params            | Response                                      |
|--------|------------------------|---------------------------|------------------------------------------------|
| POST   | `/api/upload`          | `multipart/form-data` with `file=feedback.webm` (or `text` field for typed feedback) | `{ "job_id": "..." }` |
| GET    | `/api/job/{job_id}`    | —                          | `{ "status": "pending" \| "processing" \| "completed" \| "failed", "result": {...} }` |

The frontend polls `/api/job/{job_id}` every 2 seconds until `status === "completed"` (or `"failed"`).

## Running the demo

### Backend

```bash
cd backend
<<<<<<< HEAD

>>deactivate
>> Remove-Item -Recurse -Force venv
>> py -3.11 -m venv venv
>> .\venv\Scripts\Activate.ps1
>> python --version
>> python -m pip install --upgrade pip
>> pip install -r requirements.txt
>>uvicorn main:app --reload --port 8000









python3 -m venv venv # (python 3.11 need to be used for smooth running)
# if you have any other version then you can use this "py install 3.11"  to set the terminal
.\venv\Scripts\Activate.ps1  # Windows: venv\Scripts\activate  (in terminal)
=======
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
#git bash: source .venv/Scripts/activate
>>>>>>> de1ce9509126d2c5c7ae8c22b5fb446a7a09a5cf
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```



### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://127.0.0.1:8000` for API calls (see `frontend/src/config/api.js`). Set `VITE_API_BASE_URL` in a `.env` file to point at a deployed backend instead.

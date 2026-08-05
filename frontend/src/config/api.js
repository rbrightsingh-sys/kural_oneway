// Central place to configure where the frontend talks to the FastAPI backend.
// Locally this defaults to the uvicorn dev server. In production, set
// VITE_API_BASE_URL (e.g. in a .env file or your hosting provider's env config)
// to point at the deployed backend instead.

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const ENDPOINTS = {
  upload: `${API_BASE_URL}/api/upload`,
  job: (jobId) => `${API_BASE_URL}/api/job/${jobId}`,
};

export const MAX_RECORDING_SECONDS = 30;
export const POLL_INTERVAL_MS = 2000;

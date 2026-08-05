import { useCallback, useRef, useState } from "react";
import { ENDPOINTS, POLL_INTERVAL_MS } from "../config/api";

/**
 * Polls GET /api/job/{job_id} on an interval until the job reaches
 * a terminal state ("completed" or "failed").
 */
export function useJobPolling() {
  const [status, setStatus] = useState("idle"); // idle | pending | processing | completed | failed
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pollJob = useCallback(
    async (jobId) => {
      const check = async () => {
        try {
          const res = await fetch(ENDPOINTS.job(jobId));
          if (!res.ok) throw new Error(`Job status request failed (${res.status})`);
          const data = await res.json();

          setStatus(data.status);
          if (data.status === "completed") {
            setResult(data.result || null);
            stopPolling();
          } else if (data.status === "failed") {
            setError(data.result?.error || "Processing failed. Please try again.");
            stopPolling();
          }
        } catch (err) {
          setError(err.message || "Lost connection while checking status.");
          stopPolling();
        }
      };

      setStatus("processing");
      setError(null);
      setResult(null);
      await check();
      intervalRef.current = setInterval(check, POLL_INTERVAL_MS);
    },
    [stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setStatus("idle");
    setResult(null);
    setError(null);
  }, [stopPolling]);

  return { status, result, error, pollJob, reset };
}

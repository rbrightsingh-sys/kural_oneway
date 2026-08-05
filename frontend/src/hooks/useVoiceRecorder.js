import { useCallback, useRef, useState } from "react";
import { MAX_RECORDING_SECONDS } from "../config/api";

/**
 * Wraps navigator.mediaDevices.getUserMedia + MediaRecorder.
 * Records audio/webm, enforces a hard cap at MAX_RECORDING_SECONDS,
 * and exposes a live countdown for the UI.
 */
export function useVoiceRecorder({ onRecordingComplete } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const [permissionError, setPermissionError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    setPermissionError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        cleanupStream();
        setIsRecording(false);
        setSecondsLeft(MAX_RECORDING_SECONDS);
        if (onRecordingComplete) onRecordingComplete(blob);
      };

      recorder.start();
      setIsRecording(true);
      setSecondsLeft(MAX_RECORDING_SECONDS);

      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setPermissionError(
        err && err.name === "NotAllowedError"
          ? "Microphone access was denied. Allow microphone access in your browser to record feedback."
          : "We couldn't access your microphone. Please check your device settings and try again."
      );
      cleanupStream();
      setIsRecording(false);
    }
  }, [cleanupStream, onRecordingComplete, stopRecording]);

  return {
    isRecording,
    secondsLeft,
    permissionError,
    startRecording,
    stopRecording,
  };
}

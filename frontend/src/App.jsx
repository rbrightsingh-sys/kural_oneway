import { useCallback, useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import RecordButton from "./components/RecordButton.jsx";
import StatusCaption from "./components/StatusCaption.jsx";
import ProcessingState from "./components/ProcessingState.jsx";
import SuccessModal from "./components/SuccessModal.jsx";
import ErrorBanner from "./components/ErrorBanner.jsx";
import TextFallbackToggle from "./components/TextFallbackToggle.jsx";
import TextFeedbackForm from "./components/TextFeedbackForm.jsx";
import VoiceFlowAnimation from "./components/VoiceFlowAnimation.jsx";
import TranslatedPhrasesPanel from "./components/TranslatedPhrasesPanel.jsx";
import EnterpriseInfo from "./components/Enterpriseinfo.jsx";
import EnterpriseFeedbackBanner from "./components/EnterpriseFeedbackBanner.jsx";
import { useVoiceRecorder } from "./hooks/useVoiceRecorder.js";
import { useJobPolling } from "./hooks/useJobPolling.js";
import { ENDPOINTS } from "./config/api";

// "ready" | "recording" | "uploading" | "processing" | "success" | "error"
const INITIAL_FLOW_STATE = "ready";

export default function App() {
  const [mode, setMode] = useState("voice"); // "voice" | "text"
  const [flowState, setFlowState] = useState(INITIAL_FLOW_STATE);
  const [uploadError, setUploadError] = useState(null);
  const [userGeo, setUserGeo] = useState(null);

  const { status: pollStatus, error: pollError, pollJob, reset: resetPolling } = useJobPolling();

  const requestUserGeo = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      console.log("Requesting user geolocation...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const geoPayload = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            source: "home_page",
          };

          console.log("Geolocation received from browser:", geoPayload);
          setUserGeo(geoPayload);

          try {
            const response = await fetch(ENDPOINTS.geo, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(geoPayload),
            });
            console.log("Geolocation backend response:", response.status, response.ok);
          } catch (error) {
            console.warn("Could not send geolocation to backend", error);
          }

          resolve(geoPayload);
        },
        (error) => {
          console.warn("Geolocation permission failed or was denied:", error.code, error.message);
          setUserGeo(null);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  useEffect(() => {
    requestUserGeo();
  }, [requestUserGeo]);

  const appendGeoLocation = useCallback((formData) => {
    if (!userGeo) return;

    const geoFields = {
      latitude: userGeo.latitude,
      longitude: userGeo.longitude,
      accuracy: userGeo.accuracy,
      geo_timestamp: userGeo.timestamp,
      source: userGeo.source,
    };

    Object.entries(geoFields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
  }, [userGeo]);

  const uploadFeedback = useCallback(
    async (formData) => {
      setUploadError(null);
      setFlowState("uploading");
      try {
        const geoReady = userGeo ?? (await requestUserGeo());
        if (geoReady) {
          setUserGeo(geoReady);
          const geoFields = {
            latitude: geoReady.latitude,
            longitude: geoReady.longitude,
            accuracy: geoReady.accuracy,
            geo_timestamp: geoReady.timestamp,
            source: geoReady.source,
          };

          Object.entries(geoFields).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              formData.append(key, String(value));
            }
          });
        }

        const res = await fetch(ENDPOINTS.upload, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        const data = await res.json();
        if (!data.job_id) throw new Error("No job id returned by server.");

        setFlowState("processing");
        pollJob(data.job_id);
      } catch (err) {
        setUploadError(err.message || "Something went wrong while uploading. Please try again.");
        setFlowState("error");
      }
    },
    [pollJob, requestUserGeo, userGeo]
  );

  const handleAudioReady = useCallback(
    (blob) => {
      const formData = new FormData();
      formData.append("file", blob, "feedback.webm");
      uploadFeedback(formData);
    },
    [uploadFeedback]
  );

  const handleTextSubmit = useCallback(
    (text) => {
      const formData = new FormData();
      formData.append("text", text);
      uploadFeedback(formData);
    },
    [uploadFeedback]
  );

  const {
    isRecording,
    secondsLeft,
    permissionError,
    startRecording,
    stopRecording,
  } = useVoiceRecorder({ onRecordingComplete: handleAudioReady });

  // Reflect polling status into the overall flow state.
  useEffect(() => {
    if (pollStatus === "completed") setFlowState("success");
    if (pollStatus === "failed") {
      setUploadError(pollError || "We couldn't process your feedback. Please try again.");
      setFlowState("error");
    }
  }, [pollStatus, pollError]);

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleReset = () => {
    setFlowState("ready");
    setUploadError(null);
    resetPolling();
  };

  const showRecordUI = mode === "voice" && (flowState === "ready" || flowState === "recording");
  const showProcessingUI = flowState === "uploading" || flowState === "processing";
  const showTextForm = mode === "text" && (flowState === "ready" || flowState === "error");
  const combinedError = permissionError || uploadError;

  // Drives the right-side voice-flow animation off the real submission lifecycle.
  const submissionStatus =
    flowState === "uploading" || flowState === "processing"
      ? "sending"
      : flowState === "success"
      ? "delivered"
      : "idle";

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Header />

      {/* Ambient side panels — decorative, hidden below xl so they never
          compete with the core flow on smaller screens. */}
      <aside className="pointer-events-none fixed left-10 top-1/2 hidden -translate-y-1/2 lg:block">
        {/* <EnterpriseInfo /> */}
        <EnterpriseFeedbackBanner/>
      </aside>
      <aside className="pointer-events-none fixed right-8 top-1/2 hidden -translate-y-1/2 lg:block">
        {/* <VoiceFlowAnimation status={submissionStatus} /> */}
            <TranslatedPhrasesPanel />

    
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex w-full flex-col items-center">
          {showProcessingUI && <ProcessingState />}

          {showRecordUI && !showProcessingUI && (
            <>
              <RecordButton
  isRecording={isRecording}
  secondsLeft={secondsLeft}
  onClick={handleRecordClick}
  disabled={showProcessingUI}
  client={{
    name: "Pothys",
    description: "Help Pothys improve their shopping experience.",
    logoUrl: "" // optional — falls back to initials avatar if omitted
  }}
/>
              <StatusCaption state={isRecording ? "recording" : "ready"} />
            </>
          )}

          {showTextForm && !showProcessingUI && (
            <TextFeedbackForm onSubmit={handleTextSubmit} disabled={showProcessingUI} />
          )}

          <ErrorBanner message={combinedError} onRetry={combinedError ? handleReset : undefined} />

          {!showProcessingUI && flowState !== "success" && (
            <TextFallbackToggle
              mode={mode}
              onToggle={() => setMode((m) => (m === "voice" ? "text" : "voice"))}
            />
          )}
        </div>
      </main>

      <Footer />

      {flowState === "success" && <SuccessModal onSubmitAnother={handleReset} />}
    </div>
  );
}

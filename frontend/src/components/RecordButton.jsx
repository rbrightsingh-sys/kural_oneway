import TimerRing from "./TimerRing.jsx";

const MicIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 0 0-7 0v5A3.5 3.5 0 0 0 12 15Z"
      fill="currentColor"
    />
    <path
      d="M6 11a1 1 0 1 0-2 0 8 8 0 0 0 7 7.94V21H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.06A8 8 0 0 0 20 11a1 1 0 1 0-2 0 6 6 0 0 1-12 0Z"
      fill="currentColor"
    />
  </svg>
);

const StopIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
  </svg>
);

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

/**
 * Small card identifying which client this feedback is being collected for.
 * Sits directly above the record button so the person knows exactly who
 * they're speaking to before they hit record.
 */
function ClientInfoCard({ client }) {
  if (!client) return null;
  const { name, description, logoUrl } = client;

  return (
    <div className="mb-8 flex w-full max-w-sm items-start gap-3.5 rounded-2xl border border-mist bg-white p-4 text-left shadow-card animate-fade-up">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-mist"
        />
      ) : (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-harbor/10 font-display text-sm text-harbor"
          aria-hidden="true"
        >
          {getInitials(name)}
        </div>
      )}
      <div className="min-w-0">
        
        <p className="mt-0.5 truncate font-display text-base text-ink">{name}</p>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-ink/55">{description}</p>
        )}
      </div>
    </div>
  );
}

export default function RecordButton({ isRecording, secondsLeft, onClick, disabled, client }) {
  return (
    <div className="flex flex-col items-center">
      <div className="block md:hidden w-full">
        <ClientInfoCard client={client} />
      </div>

      <div className="relative flex h-56 w-56 items-center justify-center">
        {isRecording && (
          <>
            <span className="absolute inset-0 rounded-full bg-signal/40 animate-ripple" />
            <span className="absolute inset-0 rounded-full bg-signal/30 animate-ripple-slow" />
          </>
        )}

        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={isRecording ? "Stop recording" : "Start recording your feedback"}
          className={`relative flex h-44 w-44 items-center justify-center rounded-full shadow-card transition-all duration-300 ease-out focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-60
            ${
              isRecording
                ? "bg-harbor scale-105"
                : "bg-signal hover:bg-signal-dark hover:scale-[1.03] active:scale-95"
            }`}
        >
          {isRecording ? (
            <>
              <TimerRing secondsLeft={secondsLeft} size={176} />
              <StopIcon className="h-9 w-9 text-white" />
            </>
          ) : (
            <MicIcon className="h-14 w-14 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}

import { Keyboard, Mic } from "lucide-react";

export default function TextFallbackToggle({ mode, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-10 inline-flex items-center gap-2 text-sm text-ink/45 transition hover:text-ink/70"
      aria-label={mode === "voice" ? "Prefer to type" : "Prefer to speak instead"}
    >
      {mode === "voice" ? (
        <>
          <Keyboard className="h-9 w-9" />
          {/* <span>Prefer to type?</span> */}
        </>
      ) : (
        <>
          <Mic className="h-9 w-9" />
          {/* <span>Prefer to speak instead?</span> */}
        </>
      )}
    </button>
  );
}

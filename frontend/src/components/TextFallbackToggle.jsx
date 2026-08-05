export default function TextFallbackToggle({ mode, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-10 text-sm text-ink/45 underline decoration-ink/20 underline-offset-4 transition hover:text-ink/70"
    >
      {mode === "voice" ? "Prefer to type?" : "Prefer to speak instead?"}
    </button>
  );
}

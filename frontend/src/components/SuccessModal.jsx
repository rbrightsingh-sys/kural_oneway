export default function SuccessModal({ onSubmitAnother }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 animate-fade-up"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-card animate-scale-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-signal/15">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-signal-dark" aria-hidden="true">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 id="success-title" className="mt-5 font-display text-2xl text-ink">
          Thank You!
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Thank you for taking the time to share your voice. Your kural has
          been sent to the team.
        </p>

        <button
          type="button"
          onClick={onSubmitAnother}
          className="mt-7 w-full rounded-full bg-harbor px-6 py-3 text-sm font-medium text-white transition hover:bg-harbor-dark"
    >
          Share your kural's
        </button>
      </div>
    </div>
  );
}

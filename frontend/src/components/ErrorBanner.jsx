export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="mt-6 flex w-full max-w-sm items-start gap-3 rounded-xl border border-flag/20 bg-flag/5 p-4 text-left animate-fade-up">
      <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-5 w-5 shrink-0 text-flag" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
      <div className="flex-1">
        <p className="text-sm text-ink/80">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1.5 text-sm font-medium text-flag underline underline-offset-2 hover:text-flag/80"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

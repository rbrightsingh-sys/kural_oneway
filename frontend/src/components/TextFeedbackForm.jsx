import { useState } from "react";

const MAX_LENGTH = 1000;

export default function TextFeedbackForm({ onSubmit, disabled }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm animate-fade-up">
      <label htmlFor="feedback-text" className="sr-only">
        Your feedback
      </label>
      <textarea
        id="feedback-text"
        value={text}
        maxLength={MAX_LENGTH}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell us what's on your mind…"
        rows={6}
        disabled={disabled}
        className="w-full resize-none rounded-2xl border border-mist bg-white p-4 text-[15px] leading-relaxed text-ink placeholder:text-ink/35 shadow-sm transition focus:border-harbor focus:outline-none focus:ring-2 focus:ring-harbor/15 disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-xs text-ink/35">
          {text.length}/{MAX_LENGTH}
        </span>
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="rounded-full bg-harbor px-6 py-2.5 text-sm font-medium text-white transition hover:bg-harbor-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send feedback
        </button>
      </div>
    </form>
  );
}

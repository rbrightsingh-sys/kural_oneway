const COPY = {
  ready: {
    title: "Tap to share your Kural",
    subtitle: "Up to 30 seconds. We're listening.",
  },
  recording: {
    title: "Recording…",
    subtitle: "Tap the square to finish early.",
  },
};

export default function StatusCaption({ state }) {
  const { title, subtitle } = COPY[state] ?? COPY.ready;

  return (
    <div className="mt-7 text-center animate-fade-up">
      <p className="font-display text-2xl text-ink">{title}</p>
      <p className="mt-1.5 text-sm text-ink/55">{subtitle}</p>
    </div>
  );
}

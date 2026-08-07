import { useEffect, useState } from "react";

const PHRASES = [
  {
    en: "Your opinion matters.",
    ta: "உங்கள் கருத்து முக்கியமானது.",
  },
  {
    en: "We value your voice.",
    ta: "உங்கள் குரலை நாங்கள் மதிக்கிறோம்.",
  },
  {
    en: "Your voice brings change.",
    ta: "உங்கள் குரல் மாற்றத்தைக் கொண்டுவருகிறது.",
  },
];

export default function TranslatedPhrasesPanel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
    }, 4200);

    return () => clearInterval(timer);
  }, []);

  const phrase = PHRASES[index];

  return (
    <div className="relative w-[420px]">

      {/* Ambient Glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-10 top-10 h-48 w-48 rounded-full bg-signal/15 blur-[90px]" />
        <div className="absolute right-6 bottom-6 h-56 w-56 rounded-full bg-harbor/10 blur-[110px]" />
      </div>

      <div
        key={index}
        className="animate-fade-up overflow-hidden rounded-[34px] border border-harbor/10 bg-white/70 p-10 shadow-card backdrop-blur-xl"
      >
        {/* Quote */}
        <div className="absolute left-8 top-3 font-display text-8xl leading-none text-harbor/5">
          "
        </div>

        {/* Label */}
        <div className="mb-8 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-signal animate-pulse" />

          <span className="font-body text-xs uppercase tracking-[0.35em] text-harbor/70">
            Customer Voice
          </span>
        </div>

        {/* English */}
        <h2 className="min-h-[120px] font-display text-4xl leading-tight text-harbor">
          {phrase.en}
        </h2>

        {/* Divider */}
        <div className="my-8 h-px w-full bg-gradient-to-r from-signal via-harbor/20 to-transparent" />

        {/* Tamil */}
        <p className="min-h-[72px] text-2xl font-medium leading-relaxed tracking-wide text-ink/80">
          {phrase.ta}
        </p>

        {/* Footer */}
        <div className="mt-10 flex items-center justify-between">

          <div className="flex items-center gap-2 rounded-full bg-signal/10 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-signal animate-pulse" />

            <span className="text-xs font-semibold tracking-wider text-signal-dark uppercase">
              Live Translation
            </span>
          </div>

          <div className="font-mono text-xs text-ink/30">
            AI Language Bridge
          </div>

        </div>
      </div>
    </div>
  );
}
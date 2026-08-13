import { useEffect, useState } from "react";
import { MapPin, Sparkles, ArrowRight } from "lucide-react";

/**
 * EnterpriseFeedbackBanner
 * ------------------------
 * Enterprise-identity banner shown above a customer feedback form.
 * Establishes who the brand is (name, heritage, footprint) and eases
 * the customer into "Share Your Experience".
 *
 * All copy is data-driven via props, defaulted to Pothys.
 * Colors are defined as local CSS variables (no dependency on a host
 * app's Tailwind theme tokens), so this file drops into any project.
 */

const DEFAULT_PHRASES = [
  { en: "pothys.", ta: "உங்கள் கருத்து முக்கியமானது." },
  { en: "We value your voice.", ta: "உங்கள் குரலை நாங்கள் மதிக்கிறோம்." },
  { en: "Your voice brings change.", ta: "உங்கள் குரல் மாற்றத்தைக் கொண்டுவருகிறது." },
];

const DEFAULT_FACTS = [
  { label: "Est.", value: "1923" },
  { label: "Heritage", value: "Silk & Weaving" },
  { label: "Showrooms", value: "13+ in South India" },
];

export default function EnterpriseFeedbackBanner({
  name = "POTHYS",
  location = "Chennai, Tamil Nadu",
  establishedYear = "1923",
  phrases = DEFAULT_PHRASES,
  facts = DEFAULT_FACTS,
  onStartFeedback,
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [phrases.length]);

  const phrase = phrases[index];

  return (
    <div className="relative w-full max-w-[440px]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;500;600&display=swap');
        .ebf-root {
          --ink: 34 20 25;
          --maroon: 107 30 43;
          --gold: 192 138 46;
          --thread: 47 107 94;
          --paper: 250 244 235;
          font-family: 'Manrope', sans-serif;
        }
        .ebf-display { font-family: 'Fraunces', serif; }
        .ebf-tamil { font-family: 'Noto Sans Tamil', sans-serif; }
        .ebf-fade { animation: ebfFade 0.6s ease both; }
        @keyframes ebfFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ebf-fade { animation: none; }
        }
      `}</style>

      {/* Ambient glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-6 -top-6 h-40 w-40 rounded-full bg-[rgb(var(--gold))]/20 blur-[80px]" />
        <div className="absolute -right-6 -bottom-6 h-48 w-48 rounded-full bg-[rgb(var(--maroon))]/15 blur-[100px]" />
      </div>

      <div className="ebf-root relative overflow-hidden rounded-[28px] border border-[rgb(var(--maroon))]/15 bg-[rgb(var(--paper))]/95 shadow-[0_20px_60px_-25px_rgba(107,30,43,0.35)] backdrop-blur-xl">
        {/* Top ornament strip */}
        <div className="h-2 w-full bg-gradient-to-r from-[rgb(var(--maroon))] via-[rgb(var(--gold))] to-[rgb(var(--thread))]" />

        <div className="p-8">
          {/* Header: brand + location + established badge */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="ebf-display text-[26px] font-semibold tracking-wide text-[rgb(var(--maroon))]">
                {name}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[13px] text-[rgb(var(--ink))]/60">
                <MapPin size={13} strokeWidth={2} />
                {location}
              </div>
            </div>
            <div className="shrink-0 rounded-full border border-[rgb(var(--gold))]/40 bg-[rgb(var(--gold))]/10 px-3 py-1 text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--gold))]">Est.</div>
              <div className="ebf-display text-sm font-semibold text-[rgb(var(--maroon))]">
                {establishedYear}
              </div>
            </div>
          </div>

          <KolamDivider className="my-6" />

          {/* Rotating trust phrase, bilingual */}
          <div key={index} className="ebf-fade min-h-[92px]">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[rgb(var(--thread))]">
              <Sparkles size={12} />
              Customer Voice
            </div>
            <div className="ebf-display mt-3 text-[26px] leading-tight text-[rgb(var(--ink))]">
              {phrase.en}
            </div>
            <div className="ebf-tamil mt-2 text-[16px] leading-relaxed text-[rgb(var(--ink))]/75">
              {phrase.ta}
            </div>
          </div>

          {/* Pagination, styled as kolam dots */}
          <div className="mt-5 flex items-center gap-1.5">
            {phrases.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-6 bg-[rgb(var(--gold))]"
                    : "w-1.5 bg-[rgb(var(--maroon))]/20"
                }`}
              />
            ))}
          </div>

          <KolamDivider className="my-6" />

          {/* Quick facts */}
          <div className="grid grid-cols-3 gap-3">
            {facts.map((f) => (
              <div
                key={f.label}
                className="rounded-2xl bg-[rgb(var(--maroon))]/5 px-3 py-2.5 text-center"
              >
                <div className="text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--ink))]/50">
                  {f.label}
                </div>
                <div className="ebf-display mt-0.5 text-[13px] font-medium leading-tight text-[rgb(var(--maroon))]">
                  {f.value}
                </div>
              </div>
            ))}
          </div>

          {/* CTA into the feedback form */}
         {/* <button
            onClick={onStartFeedback}
            className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--maroon))] px-5 py-3.5 text-[14px] font-semibold text-[rgb(var(--paper))] transition-transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gold))]"
          >
            Share Your Experience
            <span className="ebf-tamil font-normal text-[rgb(var(--paper))]/70">
              · கருத்து தெரிவிக்க
            </span>
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </button> */}
        </div>
      </div>
    </div>
  );
}

/** Thin dotted "kolam" rule — a nod to the Tamil Nadu threshold-art
 * motif drawn each morning to welcome guests. Doubles as a section
 * divider instead of a generic gradient line. */
function KolamDivider({ className = "" }) {
  return (
    <svg
      viewBox="0 0 400 16"
      className={`h-4 w-full ${className}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="0" y1="8" x2="400" y2="8" stroke="rgb(var(--maroon))" strokeOpacity="0.15" strokeWidth="1" />
      {Array.from({ length: 21 }).map((_, i) => {
        const x = (i / 20) * 400;
        const isGold = i % 4 === 0;
        return (
          <circle
            key={i}
            cx={x}
            cy={8}
            r={isGold ? 2.6 : 1.4}
            fill={isGold ? "rgb(var(--gold))" : "rgb(var(--maroon))"}
            fillOpacity={isGold ? 1 : 0.35}
          />
        );
      })}
    </svg>
  );
}

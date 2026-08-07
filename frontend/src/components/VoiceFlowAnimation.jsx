export default function VoiceFlowAnimation({ status = "idle" }) {
  const sending = status === "sending";
  const delivered = status === "delivered";

  return (
    <div className="w-80">

      {/* Scene frame — a little illustrated postcard instead of a stacked flow */}
      <div className="relative h-[440px] w-80 overflow-hidden rounded-[2rem] border-4 border-white bg-gradient-to-b from-[#CFEFEA] via-[#F3F7EC] to-[#FFF6E0] shadow-card">

        {/* Sun */}
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#FFC93C]/70 blur-md" />
        <div className="absolute right-2 top-2 h-14 w-14 rounded-full bg-[#FFC93C]" />

        {/* Clouds */}
        <div className="absolute left-4 top-6 h-6 w-16 rounded-full bg-white/80" />
        <div className="absolute left-10 top-3 h-8 w-12 rounded-full bg-white/80" />

        {/* Hills */}
        <div className="absolute -bottom-10 left-[-20%] h-40 w-[80%] rounded-[50%] bg-signal/15" />
        <div className="absolute -bottom-16 right-[-25%] h-48 w-[85%] rounded-[50%] bg-harbor/10" />

        {/* Winding path */}
        <svg viewBox="0 0 320 440" className="absolute inset-0 h-full w-full" fill="none">
          <path
            d="M64,86 C40,150 150,150 130,220 C112,286 250,270 250,360"
            stroke="currentColor"
            className="text-harbor/25"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="2 14"
          />
        </svg>

        {/* Station: Customer cottage */}
        <div className="absolute left-[10%] top-[8%] flex flex-col items-center">
          <div className={["relative flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-card", !delivered && "animate-[bounce_3.2s_ease-in-out_infinite]"].join(" ")}>
            <svg viewBox="0 0 24 24" className="h-9 w-9">
              <path d="M4 11l8-6 8 6v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" fill="#FFE7B0" stroke="#1F3B73" strokeWidth="1.2" strokeLinejoin="round" />
              <circle cx="12" cy="14.5" r="1" fill="#1F3B73" />
            </svg>
          </div>
          <p className="mt-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-harbor">
            Customer
          </p>
        </div>

        {/* Station: AI treehouse (brain) */}
        <div className="absolute left-[34%] top-[46%] flex flex-col items-center">
          <div
            className={[
              "relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white shadow-card transition-transform duration-500",
              sending && "scale-110",
            ].join(" ")}
          >
            {sending && (
              <>
                <span className="absolute inset-0 rounded-full bg-signal/25 animate-ripple" />
                <span className="absolute inset-0 rounded-full bg-signal/15 animate-ripple-slow" />
              </>
            )}
            <span className={["relative text-4xl", sending && "animate-bounce"].join(" ")}>🧠</span>
          </div>
          <p className="mt-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-harbor">
            AI Analysis
          </p>
        </div>

        {/* Station: Client mailbox */}
        <div className="absolute right-[9%] top-[76%] flex flex-col items-center">
          <div
            className={[
              "relative flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white shadow-card transition-colors duration-500",
              delivered ? "bg-signal/15" : "bg-white",
            ].join(" ")}
          >
            <svg viewBox="0 0 24 24" className="h-9 w-9">
              <rect x="4" y="9" width="16" height="10" rx="2" fill="#F3F7EC" stroke="#1F3B73" strokeWidth="1.2" />
              <rect
                x="6" y="4" width="7" height="6" rx="1"
                fill={delivered ? "#12B7A6" : "#D64545"}
                stroke="#1F3B73" strokeWidth="1.2"
                className={delivered ? "origin-bottom-left transition-transform duration-500 -rotate-45" : "transition-transform duration-500"}
              />
              <circle cx="12" cy="14" r="1.4" fill="#1F3B73" />
            </svg>
            {delivered && (
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-signal text-white shadow-card animate-scale-in">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </div>
          <p className="mt-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-harbor">
            Pothys
          </p>
        </div>

        {/* Traveling paper plane, flies along the winding path via CSS offset-path */}
        <div
          className="absolute h-8 w-8 text-2xl"
          style={{
            offsetPath: "path('M64,86 C40,150 150,150 130,220 C112,286 250,270 250,360')",
            offsetDistance: sending || delivered ? "100%" : "4%",
            offsetRotate: "0deg",
            transition: sending
              ? "offset-distance 2.6s cubic-bezier(.4,0,.2,1)"
              : "offset-distance .4s ease-out",
          }}
        >
          <span className={sending ? "inline-block animate-bounce" : "inline-block"}>
            ✈️
          </span>
        </div>

        {/* Confetti on delivered */}
        {delivered && (
          <>
            <span className="absolute right-[16%] top-[64%] animate-bounce text-lg">🎉</span>
            <span className="absolute right-[4%] top-[70%] animate-bounce text-sm [animation-delay:.2s]">⭐</span>
            <span className="absolute right-[22%] top-[80%] animate-bounce text-sm [animation-delay:.4s]">✨</span>
          </>
        )}

      </div>

      {/* Caption, like a postcard note below the scene */}
      <p className="mt-3 max-w-xs text-center text-sm text-ink/50">

        {status === "idle" &&
          "Ready to receive meaningful customer insights."}

        {sending &&
          "Understanding the customer's voice and generating AI-powered insights."}

        {delivered &&
          "Insights successfully delivered to your dashboard."}

      </p>

    </div>
  );
}

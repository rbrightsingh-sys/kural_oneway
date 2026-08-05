import { MAX_RECORDING_SECONDS } from "../config/api";

/**
 * SVG progress ring that drains as recording time elapses, plus the
 * numeric mm:ss countdown at its center.
 */
export default function TimerRing({ secondsLeft, size = 200 }) {
  const strokeWidth = 3;
  const radius = size / 2 - strokeWidth * 2;
  const circumference = 2 * Math.PI * radius;
  const progress = secondsLeft / MAX_RECORDING_SECONDS;
  const offset = circumference * (1 - progress);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const urgent = secondsLeft <= 5;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.25"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={urgent ? "#FDE4E4" : "#FFFFFF"}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
      <text
        x="50%"
        y="50%"
        dy="0.35em"
        textAnchor="middle"
        className={`font-mono text-lg ${urgent ? "fill-white" : "fill-white/90"}`}
      >
        {mm}:{ss}
      </text>
    </svg>
  );
}

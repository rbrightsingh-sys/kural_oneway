/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F5F6F2",
        ink: "#12141C",
        harbor: {
          DEFAULT: "#1F3B73",
          light: "#2C4F94",
          dark: "#152A54",
        },
        signal: {
          DEFAULT: "#12B7A6",
          light: "#5FDCCC",
          dark: "#0C8A7D",
        },
        mist: "#E4E7EE",
        flag: "#D64545",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(18,20,28,0.04), 0 12px 32px -12px rgba(18,20,28,0.12)",
      },
      keyframes: {
        ripple: {
          "0%": { transform: "scale(1)", opacity: "0.55" },
          "100%": { transform: "scale(1.85)", opacity: "0" },
        },
        "ripple-slow": {
          "0%": { transform: "scale(1)", opacity: "0.35" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "travel-down": {
          "0%": { top: "0%", opacity: "0" },
          "10%": { opacity: "1" },
          "88%": { opacity: "1" },
          "100%": { top: "100%", opacity: "0" },
        },
        "receive-pulse": {
          "0%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(18,183,166,0.45)" },
          "70%": { transform: "scale(1.12)", boxShadow: "0 0 0 14px rgba(18,183,166,0)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(18,183,166,0)" },
        },
      },
      animation: {
        ripple: "ripple 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite",
        "ripple-slow": "ripple-slow 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite 0.5s",
        "fade-up": "fade-up 0.5s ease-out both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "travel-down": "travel-down 1.6s ease-in-out infinite",
        "receive-pulse": "receive-pulse 0.9s cubic-bezier(0.16,1,0.3,1) 1",
      },
    },
  },
  plugins: [],
};

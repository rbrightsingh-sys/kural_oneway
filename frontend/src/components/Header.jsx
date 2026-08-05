export default function Header() {
  return (
    <header className="flex items-center justify-center gap-2.5 py-8">
      <span className="font-display text-xl text-ink tracking-tight">Kural</span>
      <span
        className="font-display text-xl text-signal-dark"
        lang="ta"
        aria-hidden="true"
      >
        குரல்
      </span>
      {/*<span className="ml-1 rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink/50">
        <img src="kural_logo1.png" alt="Kural AI logo" className="h-5 w-5" />

      </span>*/}
      <img src="kural_logo1.png" alt="Kural AI logo" className="h-5 w-5" />
    </header>
  );
}

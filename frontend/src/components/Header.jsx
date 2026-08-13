import Icon from './Icon'; // Update this path to match your project structure

export default function Header() {
  return (
    // Added 'relative' to the header so the absolute child stays contained
    <header className="relative flex items-center justify-center py-8 px-4">
      
      {/* Mic Icon Container - Pinned to the left */}
      <div className="absolute left-4 md:left-8">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-signal/10 text-signal ring-1 ring-signal/30">
          <Icon name="mic" className="w-4.5 h-4.5" />
          <span className="absolute inset-0 rounded-full ring-1 ring-signal/40 animate-pulseRing" />
        </span>
      </div>

      {/* Title - Remains perfectly centered */}
      <span className="font-display text-xl text-ink tracking-tight">
        Kural 1-Way
      </span>
      
    </header>
  );
}

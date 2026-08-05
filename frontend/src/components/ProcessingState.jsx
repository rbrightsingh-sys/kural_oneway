export default function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center py-4 animate-fade-up">
      <div className="relative flex h-44 w-44 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-mist" />
        <div className="absolute inset-0 rounded-full border-2 border-harbor border-t-transparent animate-spin" />
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-harbor/70 animate-bounce [animation-delay:-0.2s]" />
          <span className="h-2 w-2 rounded-full bg-harbor/70 animate-bounce [animation-delay:-0.1s]" />
          <span className="h-2 w-2 rounded-full bg-harbor/70 animate-bounce" />
        </div>
      </div>
      <p className="mt-7 font-display text-2xl text-ink">Processing your feedback</p>
      <p className="mt-1.5 text-sm text-ink/55">This usually takes a few seconds.</p>
    </div>
  );
}

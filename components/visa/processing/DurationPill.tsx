export default function DurationPill({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-[26px] items-center whitespace-nowrap rounded-full border border-line bg-paper-sunk px-3 text-[12px] font-semibold tabular-nums ${
        muted ? "text-mute" : "text-ink-900"
      }`}
    >
      {children}
    </span>
  );
}

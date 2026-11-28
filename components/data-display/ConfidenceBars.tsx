export default function ConfidenceBars({
  bars,
  label,
}: {
  bars: 0 | 1 | 2 | 3;
  label: string;
}) {
  return (
    <div className="flex items-end gap-1" role="img" aria-label={label}>
      {[1, 2, 3].map((idx) => (
        <span
          key={idx}
          className={`w-1.5 rounded-sm ${idx === 1 ? "h-2" : idx === 2 ? "h-3" : "h-4"} ${
            idx <= bars
              ? bars === 3
                ? "bg-emerald-500"
                : bars === 2
                  ? "bg-blue-500"
                  : "bg-amber-500"
              : "bg-neutral-200 dark:bg-[#272727]"
          }`}
        />
      ))}
    </div>
  );
}

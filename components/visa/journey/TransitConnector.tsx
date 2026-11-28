export default function TransitConnector({
  orientation,
  completed,
  className = "",
}: {
  orientation: "horizontal" | "vertical";
  completed: boolean;
  className?: string;
}) {
  if (orientation === "horizontal") {
    return (
      <span
        aria-hidden="true"
        data-connector="horizontal"
        className={`pointer-events-none block h-0 w-full ${
          completed
            ? "border-t-2 border-solid border-emerald-600/80 dark:border-emerald-400/80"
            : "border-t-2 border-dashed border-neutral-300 dark:border-neutral-700"
        } ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      data-connector="vertical"
      className={`pointer-events-none block h-full w-0 ${
        completed
          ? "border-l-2 border-solid border-emerald-600/80 dark:border-emerald-400/80"
          : "border-l-2 border-dashed border-neutral-300 dark:border-neutral-700"
      } ${className}`}
    />
  );
}

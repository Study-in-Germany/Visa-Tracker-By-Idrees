export function AnalyticsRow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-12 ${className}`}>
      {children}
    </div>
  );
}

export function AnalyticsCol({
  span = 12,
  children,
  className = "",
}: {
  span?: 4 | 6 | 8 | 12;
  children: React.ReactNode;
  className?: string;
}) {
  const spanClass =
    span === 4
      ? "xl:col-span-4"
      : span === 6
        ? "xl:col-span-6"
        : span === 8
          ? "xl:col-span-8"
          : "xl:col-span-12";
  return <div className={`min-w-0 ${spanClass} ${className}`}>{children}</div>;
}

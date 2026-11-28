export default function AnalyticsSection({
  title,
  description,
  actions,
  children,
  className = "",
  testId,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section data-testid={testId} aria-label={title} className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-2.5 pt-1">
        <div className="min-w-0">
          <h2 className="text-[18px] font-bold tracking-tight text-ink-900 sm:text-[21px]">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[12px] text-mute sm:text-[13px]">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

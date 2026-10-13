export default function Panel({ title, description, children, actions, className = "" }: { title?: string; description?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-xs font-semibold uppercase tracking-wider text-mute">{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink-700">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Label + control + optional hint/error, so every form lays out the same way. */
export default function Field({ label, htmlFor, required, hint, error, children, className = "" }: { label: string; htmlFor?: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="text-clay-500"> *</span>}
      </label>
      {children}
      {error ? <p role="alert" className="mt-1 text-xs text-red-700">{error}</p> : hint ? <p className="mt-1 text-xs text-mute">{hint}</p> : null}
    </div>
  );
}

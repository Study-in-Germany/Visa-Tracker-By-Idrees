export default function GermanFlagBar({ className = "" }: { className?: string }) {
  return (
    <div className={`grid h-[3px] w-full shrink-0 grid-cols-3 ${className}`} aria-hidden="true">
      <span className="bg-[#000000]" />
      <span className="bg-[#DD0000]" />
      <span className="bg-[#FFCE00]" />
    </div>
  );
}

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function ArrowRightIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function ArrowUpRightIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5.5 14.5 14.5 5.5m0 0H7.5m7 0v7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function PlusMinusIcon({ open, size = 18 }: { open: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <path
        d="M10 4v12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        style={{
          transformOrigin: "10px 10px",
          transform: open ? "scaleY(0)" : "scaleY(1)",
          transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </svg>
  );
}

export function WhatsAppGlyph({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 21a9 9 0 1 0-7.79-4.5L3 21l4.64-1.15A8.96 8.96 0 0 0 12 21Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      <path
        d="M9.4 8.7c-.2-.45-.4-.46-.6-.47h-.5c-.18 0-.47.07-.72.34-.25.28-.95.92-.95 2.25s.97 2.61 1.1 2.79c.14.18 1.88 3 4.65 4.08 2.3.9 2.77.72 3.27.68.5-.05 1.6-.65 1.83-1.29.22-.63.22-1.18.15-1.29-.06-.11-.25-.18-.52-.31-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.19-1.35-.81-.72-1.36-1.61-1.52-1.88-.16-.27-.02-.42.12-.55.12-.12.27-.32.4-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.59-1.46-.83-1.99Z"
        fill="currentColor"
      />
    </svg>
  );
}

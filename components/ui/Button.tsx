import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "warning" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#FAFAFA] dark:text-[#0A0A0A] dark:hover:bg-[#E5E5E5] focus-visible:ring-neutral-500",
  secondary: "bg-paper-raised text-ink-800 border border-line-strong hover:bg-[rgb(var(--hover))] focus-visible:ring-neutral-500",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500",
  warning: "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500",
  ghost: "bg-transparent text-ink-700 hover:bg-[rgb(var(--hover))] hover:text-ink-900 focus-visible:ring-neutral-500",
  outline: "bg-transparent border border-line-strong text-ink-800 hover:bg-[rgb(var(--hover))] focus-visible:ring-neutral-500",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-[34px] px-3 py-1.5 text-xs",
  md: "min-h-[38px] px-4 py-2 text-[13px]",
  lg: "min-h-[44px] px-5 py-2.5 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className = "",
  disabled,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

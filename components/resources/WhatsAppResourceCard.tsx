import Icon from "@/components/ui/Icon";
import WhatsAppBrandIcon from "@/components/whatsapp/WhatsAppBrandIcon";

export interface WhatsAppResourceCardProps {
  kind: "channel" | "group";
  classification: string;
  title: string;
  description: string;
  metaLabel: string;
  metaIcon: "radio" | "messagesSquare";
  ctaLabel: string;
  href: string;
  variant: "filled" | "outlined";
  compact?: boolean;
}

export default function WhatsAppResourceCard({
  kind,
  classification,
  title,
  description,
  metaLabel,
  metaIcon,
  ctaLabel,
  href,
  variant,
  compact = false,
}: WhatsAppResourceCardProps) {
  const buttonClasses =
    variant === "filled"
      ? "bg-[#25D366] text-[#082D17] hover:bg-[#1EC65D] active:bg-[#19B252]"
      : "border-[1.5px] border-[#128C7E] bg-transparent text-[#075E54] hover:bg-[#25D366]/10 active:bg-[#25D366]/20 dark:border-[#25D366]/80 dark:text-[#25D366] dark:hover:bg-[#25D366]/12 dark:active:bg-[#25D366]/22";

  return (
    <article
      data-whatsapp-kind={kind}
      className={`group relative flex flex-col rounded-[18px] border border-line ${compact ? "bg-paper-sunk p-4 sm:p-5" : "bg-card p-4 sm:p-5"} transition-colors duration-150 hover:border-[#128C7E]/45 dark:hover:border-[#25D366]/40`}
    >
      {/* Top platform metadata row + circular external-link indicator */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* Official Meta WhatsApp Digital Glyph Green vector preserved at exact proportions */}
          <WhatsAppBrandIcon size={40} variant="green" className="shrink-0" />
          {!compact && <div className="min-w-0">
            <span className="block truncate text-[13px] font-semibold leading-tight text-ink-900">
              WhatsApp
            </span>
            <span className="mt-0.5 block truncate text-[12px] leading-tight text-mute">
              {classification}
            </span>
          </div>}
        </div>

        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-paper-sunk text-ink-700 transition-colors group-hover:border-[#128C7E]/40 group-hover:text-[#075E54] dark:group-hover:border-[#25D366]/45 dark:group-hover:text-[#25D366]"
        >
          <Icon
            name="arrowUpRight"
            size={16}
            className="transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </span>
      </div>

      {/* Main content */}
      <div className={`${compact ? "mt-3" : "mt-4"} flex-1`}>
        <h3 className={`${compact ? "text-[15px]" : "text-[18px] sm:text-[19px]"} font-semibold leading-snug tracking-tight text-ink-900`}>
          {title}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-mute">
          {description}
        </p>
      </div>

      {/* Supporting classification metadata */}
      {!compact && <div className="mt-4 flex items-center gap-2 text-[12.5px] font-medium text-ink-700">
        <Icon
          name={metaIcon}
          size={15}
          className="shrink-0 text-[#128C7E] dark:text-[#25D366]"
        />
        <span>{metaLabel}</span>
      </div>}

      {/* Single accessible navigation action covering the card */}
      <div className="mt-4">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${ctaLabel} — ${title} on WhatsApp (opens in new tab)`}
          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors after:absolute after:inset-0 after:rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075E54] focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-[#25D366] ${buttonClasses}`}
        >
          <Icon name={metaIcon} size={17} strokeWidth={2.1} />
          <span>{ctaLabel}</span>
        </a>
      </div>
    </article>
  );
}

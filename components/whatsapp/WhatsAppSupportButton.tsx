import { whatsappSupportUrl } from "@/lib/whatsapp";
import WhatsAppBrandIcon from "./WhatsAppBrandIcon";

/**
 * Reusable direct WhatsApp support action consuming centralized whatsappSupportUrl.
 */
export default function WhatsAppSupportButton({
  label = "Chat with us on WhatsApp",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={whatsappSupportUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-[#082D17] transition-colors hover:bg-[#1EC65D] active:bg-[#19B252] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075E54] focus-visible:ring-offset-2 ${className}`}
    >
      <WhatsAppBrandIcon size={18} variant="green" className="shrink-0 brightness-0" />
      <span>{label}</span>
    </a>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { whatsappSupportUrl } from "@/lib/whatsapp";
import WhatsAppBrandIcon from "./WhatsAppBrandIcon";

/**
 * Global floating circular WhatsApp support button across public and authenticated applicant pages.
 * - Automatically hides whenever a modal, filter drawer, bottom sheet, or overlay is active.
 * - Sits cleanly above mobile bottom navigation + safe areas and above desktop /tracker pagination.
 */
export default function FloatingWhatsAppButton({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname();
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const checkOverlay = () => {
      const hasModal = Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
      const bodyLocked = document.body.style.overflow === "hidden";
      setOverlayOpen(hasModal || bodyLocked);
    };

    checkOverlay();
    const observer = new MutationObserver(checkOverlay);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "aria-modal", "role"],
    });
    return () => observer.disconnect();
  }, []);

  if (hidden || overlayOpen) return null;

  const isTracker = pathname === "/tracker";

  return (
    <a
      data-testid="floating-whatsapp-button"
      href={whatsappSupportUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Chat with us on WhatsApp"
      aria-label="Chat with us on WhatsApp"
      className={`fixed right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-md transition-all duration-150 hover:scale-[1.03] hover:bg-[#1EC65D] hover:shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075E54] focus-visible:ring-offset-2 focus-visible:ring-offset-paper md:right-6 md:h-[50px] md:w-[50px] bottom-[calc(4.75rem+env(safe-area-inset-bottom))] ${
        isTracker ? "md:bottom-[72px]" : "md:bottom-6"
      }`}
    >
      <WhatsAppBrandIcon size={26} variant="white" />
    </a>
  );
}

"use client";

import Modal from "@/components/ui/Modal";

export default function AnalyticsDetailsDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size={size} variant="drawer">
      <div className="space-y-4">
        {subtitle && (
          <p className="text-[12px] leading-relaxed text-mute">{subtitle}</p>
        )}
        {children}
      </div>
    </Modal>
  );
}

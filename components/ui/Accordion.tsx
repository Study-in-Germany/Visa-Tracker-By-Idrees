"use client";

import { useState, useId, ReactNode } from "react";
import Icon from "./Icon";

export interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "neutral";
  icon?: string;
  content: ReactNode;
  defaultOpen?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  className?: string;
}

export default function Accordion({
  items,
  allowMultiple = true,
  className = "",
}: AccordionProps) {
  const baseId = useId();
  const [openIds, setOpenIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    items.forEach((item) => {
      if (item.defaultOpen) initial[item.id] = true;
    });
    return initial;
  });

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      if (allowMultiple) {
        return { ...prev, [id]: !prev[id] };
      }
      return prev[id] ? {} : { [id]: true };
    });
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    items.forEach((it) => (all[it.id] = true));
    setOpenIds(all);
  };

  const collapseAll = () => {
    setOpenIds({});
  };

  const allOpen = items.length > 0 && items.every((it) => !!openIds[it.id]);

  return (
    <div className={`space-y-3 ${className}`}>
      {items.length > 2 && (
        <div className="flex justify-end gap-2 text-xs mb-1">
          <button
            type="button"
            onClick={allOpen ? collapseAll : expandAll}
            className="text-mute hover:text-ink-900 transition-colors font-medium px-2 py-0.5 rounded hover:bg-paper-sunk"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        </div>
      )}

      {items.map((item, idx) => {
        const isOpen = !!openIds[item.id];
        const headingId = `${baseId}-head-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;

        const badgeClass =
          item.badgeVariant === "success"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            : item.badgeVariant === "warning"
            ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
            : item.badgeVariant === "neutral"
            ? "bg-paper-sunk text-mute border-line dark:bg-paper-sunk dark:text-mute"
            : "bg-ink-100 text-ink-800 border-line-strong dark:bg-ink-100 dark:text-ink-900";

        return (
          <div
            key={item.id}
            className={`card overflow-hidden transition-all duration-200 ${
              isOpen ? "border-line-strong shadow-sm" : "border-line hover:border-line-strong"
            }`}
          >
            <h3>
              <button
                type="button"
                id={headingId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left bg-card hover:bg-paper-raised transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {item.icon && (
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isOpen
                          ? "bg-ink-800 text-paper-raised dark:bg-ink-100 dark:text-ink-900"
                          : "bg-paper-sunk text-mute"
                      }`}
                    >
                      <Icon name={item.icon as any} size={18} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm sm:text-base text-ink-900 tracking-tight">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeClass}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-mute mt-0.5 truncate">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-mute transition-transform duration-200 flex-shrink-0 ${
                    isOpen ? "rotate-180 text-ink-900 bg-paper-sunk" : "hover:bg-paper-sunk"
                  }`}
                >
                  <Icon name="chevronDown" size={16} />
                </div>
              </button>
            </h3>

            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headingId}
                className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 text-ink-800 border-t border-line/60 animate-in fade-in-50 duration-150"
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


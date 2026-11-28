"use client";

import { useEffect, useState } from "react";
import {
  DARK_ANALYTICS_PALETTE,
  LIGHT_ANALYTICS_PALETTE,
  type AnalyticsChartPalette,
} from "@/lib/analytics/chart-tokens";

export function useAnalyticsChartPalette(): AnalyticsChartPalette {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark ? DARK_ANALYTICS_PALETTE : LIGHT_ANALYTICS_PALETTE;
}

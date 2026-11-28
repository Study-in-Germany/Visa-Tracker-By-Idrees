import { notFound } from "next/navigation";
import AnalyticsVisualFixtures from "@/components/visual/AnalyticsVisualFixtures";

export const dynamic = "force-dynamic";

export default function AnalyticsVisualFixturesPage({
  searchParams,
}: {
  searchParams?: { theme?: string; variant?: string };
}) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_VISUAL_FIXTURES !== "1") {
    notFound();
  }

  return (
    <AnalyticsVisualFixtures
      dark={searchParams?.theme === "dark"}
      variant={searchParams?.variant || "complete"}
    />
  );
}

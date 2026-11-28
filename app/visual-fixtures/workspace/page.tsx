import { notFound } from "next/navigation";
import WorkspaceVisualFixtures from "@/components/visual/WorkspaceVisualFixtures";

export const dynamic = "force-dynamic";

export default function WorkspaceVisualFixturesPage({
  searchParams,
}: {
  searchParams?: { theme?: string };
}) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_VISUAL_FIXTURES !== "1") {
    notFound();
  }

  return <WorkspaceVisualFixtures dark={searchParams?.theme === "dark"} />;
}

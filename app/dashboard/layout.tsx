import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireApplicantPage } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My dashboard",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-vt-pathname") || "/dashboard";
  await requireApplicantPage(pathname);
  return <>{children}</>;
}

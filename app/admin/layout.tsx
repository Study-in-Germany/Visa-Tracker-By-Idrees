import { headers } from "next/headers";
import { requireAdminPage } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-vt-pathname") || "/admin";
  if (pathname !== "/admin/login") {
    await requireAdminPage(pathname);
  }
  return <>{children}</>;
}

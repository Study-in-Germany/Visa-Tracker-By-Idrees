"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";
import SearchInput from "@/components/ui/SearchInput";
import { useSession } from "@/hooks/useSession";
import { getRouteMeta } from "@/lib/navigation";

/** Desktop top-bar search following centralized route metadata. */
export default function HeaderSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const session = useSession();
  const meta = getRouteMeta(pathname, session.role ?? "guest");

  if (meta.searchMode === "none") return null;
  if (meta.searchMode === "global") return <GlobalSearch />;

  const onChange = (q: string) => {
    const next = new URLSearchParams(sp.toString());
    if (q) next.set("q", q);
    else next.delete("q");
    next.delete("page");
    router.replace(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  return (
    <SearchInput
      key={pathname}
      className="w-full min-w-0 max-w-sm flex-1"
      value={sp.get("q") ?? ""}
      onChange={onChange}
      placeholder={meta.searchPlaceholder || "Search…"}
      label={meta.searchLabel || "Search"}
    />
  );
}

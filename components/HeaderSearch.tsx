"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";
import SearchInput from "@/components/ui/SearchInput";
import { chromeFor } from "@/lib/chrome";

/** Top-bar search that follows the page: filters the current list on /universities and /accommodation, otherwise searches the tracker. */
export default function HeaderSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const { search } = chromeFor(pathname);

  if (search.kind === "tracker") return <GlobalSearch />;

  const onChange = (q: string) => {
    const next = new URLSearchParams(sp.toString());
    if (q) next.set("q", q); else next.delete("q");
    next.delete("page");
    router.replace(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
  };
  // key: remount when the page changes so the box never shows another page's text
  return <SearchInput key={pathname} className="w-full min-w-0 max-w-sm flex-1" value={sp.get("q") ?? ""} onChange={onChange} placeholder={search.placeholder} label={search.label} />;
}

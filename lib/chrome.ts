import type { IconName } from "@/components/ui/Icon";

/**
 * What the top bar offers on each page: where search goes and which primary action is shown.
 * `query` pages filter their own list through the ?q= URL parameter; everything else uses the tracker search.
 */
export type Chrome = {
  search: { kind: "query"; placeholder: string; label: string } | { kind: "tracker" };
  action?: { href: string; label: string; icon: IconName };
};

const SUBMIT = { href: "/submit", label: "Submit entry", icon: "plus" as IconName };
const POST = { href: "/accommodation/new", label: "Post a place", icon: "plus" as IconName };

export function chromeFor(pathname: string): Chrome {
  // Admin lists are filtered from the top bar through ?q=; the dashboard keeps the tracker search.
  if (pathname === "/admin/universities") return { search: { kind: "query", placeholder: "Search universities, cities or programmes", label: "Search universities" } };
  if (pathname === "/admin/applicants") return { search: { kind: "query", placeholder: "Search ID, name, university or embassy", label: "Search applicants" } };
  if (pathname === "/admin/accommodation") return { search: { kind: "query", placeholder: "Search listings by title, city or area", label: "Search listings" } };
  if (pathname === "/admin/announcements") return { search: { kind: "query", placeholder: "Search announcements", label: "Search announcements" } };
  if (pathname === "/universities") return { search: { kind: "query", placeholder: "Search universities, cities or programmes", label: "Search universities" }, action: SUBMIT };
  if (pathname === "/programmes") return { search: { kind: "query", placeholder: "Search programmes, universities or subjects", label: "Search programmes" }, action: SUBMIT };
  if (pathname === "/accommodation") return { search: { kind: "query", placeholder: "Search city, area or keyword", label: "Search accommodation" }, action: POST };
  if (pathname === "/dashboard/listings") return { search: { kind: "tracker" }, action: POST };
  return { search: { kind: "tracker" }, action: SUBMIT };
}

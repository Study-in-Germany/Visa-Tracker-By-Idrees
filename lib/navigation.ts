import type { IconName } from "@/components/ui/Icon";
import type { SessionInfo } from "@/hooks/useSession";

export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: IconName;
  exact?: boolean;
  badge?: "pending" | "moderation";
  external?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export type HeaderKind = "main" | "secondary" | "focused";
export type SearchMode = "global" | "local" | "none";

export interface RouteMeta {
  title: string;
  headerKind: HeaderKind;
  searchMode: SearchMode;
  searchPlaceholder?: string;
  searchLabel?: string;
  showBottomNav: boolean;
  parentLabel?: string;
  parentHref?: string;
  contextualAction?: { href: string; label: string; icon: IconName };
}

const AUTH_VISA_TRACKING: NavSection = {
  title: "Visa tracking",
  items: [
    { href: "/", label: "Overview", icon: "grid", exact: true },
    { href: "/dashboard", label: "My dashboard", icon: "dashboard", exact: true },
    { href: "/tracker", label: "My Journey", icon: "route" },
    { href: "/analytics", label: "Analytics", icon: "chart" },
    { href: "/queue-progress", label: "Queue progress", icon: "queue" },
    { href: "/calculator", label: "Timeline calculator", icon: "calculator" },
    { href: "/announcements", label: "Announcements", icon: "megaphone" },
  ],
};

const AUTH_MY_ACCOUNT: NavSection = {
  title: "My account",
  items: [
    { href: "/dashboard/information", label: "My information", icon: "user" },
    { href: "/dashboard/updates", label: "My updates", icon: "history" },
    { href: "/dashboard/listings", label: "My listings", icon: "house" },
  ],
};

const COMMUNITY_SECTION: NavSection = {
  title: "Community",
  items: [
    { href: "/universities", label: "Universities", icon: "school" },
    { href: "/programmes", label: "Programmes", icon: "book" },
    { href: "/accommodation", label: "Accommodation", icon: "building" },
    { href: "/resources", label: "Resources", icon: "folder" },
    { href: "/about", label: "About", icon: "info" },
  ],
};

const GUEST_VISA_TRACKING: NavSection = {
  title: "Visa tracking",
  items: [
    { href: "/", label: "Overview", icon: "grid", exact: true },
    { href: "/tracker", label: "My Journey", icon: "route" },
    { href: "/analytics", label: "Analytics", icon: "chart" },
    { href: "/queue-progress", label: "Queue progress", icon: "queue" },
    { href: "/calculator", label: "Timeline calculator", icon: "calculator" },
    { href: "/announcements", label: "Announcements", icon: "megaphone" },
    { href: "/submit", label: "Submit your entry", icon: "filePlus" },
  ],
};

const ADMIN_SECTIONS: NavSection[] = [
  { title: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: "dashboard", exact: true }] },
  { title: "People", items: [{ href: "/admin/applicants", label: "Applicants", icon: "users", badge: "pending" }] },
  {
    title: "Directory",
    items: [
      { href: "/admin/universities", label: "Universities", icon: "school" },
      { href: "/admin/accommodation", label: "Accommodation", icon: "building", badge: "moderation" },
    ],
  },
  { title: "Content", items: [{ href: "/admin/announcements", label: "Announcements", icon: "megaphone" }] },
  {
    title: "System",
    items: [
      { href: "/admin/imports", label: "Update data", icon: "layers" },
      { href: "/admin/import", label: "Import applicants", icon: "upload" },
      { href: "/admin/forecasting", label: "Forecasting", icon: "chart" },
      { href: "/admin/settings", label: "Settings", icon: "settings" },
    ],
  },
  {
    title: "Public site",
    items: [
      { href: "/", label: "Overview", icon: "grid", exact: true, external: true },
      { href: "/tracker", label: "My Journey", icon: "route", external: true },
      { href: "/analytics", label: "Analytics", icon: "chart", external: true },
    ],
  },
];

export function getNavSections(inAdmin: boolean, role: SessionInfo["role"]): NavSection[] {
  if (inAdmin) return ADMIN_SECTIONS;
  if (role === "applicant") return [AUTH_VISA_TRACKING, AUTH_MY_ACCOUNT, COMMUNITY_SECTION];
  return [GUEST_VISA_TRACKING, COMMUNITY_SECTION];
}

export function getMobileBottomNavItems(role: SessionInfo["role"]): NavItem[] {
  if (role === "applicant") {
    return [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
      { href: "/", label: "Overview", icon: "grid", exact: true },
      { href: "/tracker", label: "My Journey", icon: "route" },
      { href: "/analytics", label: "Analytics", icon: "chart" },
      { href: "/more", label: "More", icon: "menu" },
    ];
  }
  return [
    { href: "/", label: "Overview", icon: "grid", exact: true },
    { href: "/tracker", label: "My Journey", icon: "route" },
    { href: "/analytics", label: "Analytics", icon: "chart" },
    { href: "/calculator", label: "Timeline", icon: "calculator" },
    { href: "/more", label: "More", icon: "menu" },
  ];
}

const FOCUSED_ROUTES = new Set([
  "/submit",
  "/login",
  "/register",
  "/admin/login",
  "/forgot-access-code",
  "/unsubscribe",
  "/accommodation/new",
  "/landing-page",
]);

export function isFocusedWorkflowRoute(pathname: string): boolean {
  if (FOCUSED_ROUTES.has(pathname)) return true;
  if (/^\/accommodation\/[^/]+\/edit$/.test(pathname)) return true;
  return false;
}

const SUBMIT_ACTION = { href: "/submit", label: "Submit entry", icon: "filePlus" as IconName };
const POST_LISTING_ACTION = { href: "/accommodation/new", label: "Post a place", icon: "filePlus" as IconName };

export function getRouteMeta(pathname: string, role: SessionInfo["role"]): RouteMeta {
  // Focused full-screen workflows
  if (pathname === "/submit") {
    return {
      title: "Submit entry",
      headerKind: "focused",
      searchMode: "none",
      showBottomNav: false,
      parentLabel: "Overview",
      parentHref: "/",
    };
  }
  if (pathname === "/accommodation/new" || /^\/accommodation\/[^/]+\/edit$/.test(pathname)) {
    return {
      title: pathname === "/accommodation/new" ? "Post a place" : "Edit listing",
      headerKind: "secondary",
      searchMode: "none",
      showBottomNav: false,
      parentLabel: "Accommodation",
      parentHref: "/accommodation",
    };
  }

  // Admin routes
  if (pathname.startsWith("/admin/applicants/") && pathname.split("/").length >= 4) {
    return {
      title: "Applicant details",
      headerKind: "secondary",
      searchMode: "none",
      showBottomNav: true,
      parentLabel: "Applicants",
      parentHref: "/admin/applicants",
    };
  }
  if (pathname === "/admin/applicants") {
    return {
      title: "Applicants",
      headerKind: "main",
      searchMode: "local",
      searchPlaceholder: "Search ID, name, university or embassy",
      searchLabel: "Search applicants",
      showBottomNav: true,
    };
  }
  if (pathname === "/admin/universities") {
    return {
      title: "Universities",
      headerKind: "main",
      searchMode: "local",
      searchPlaceholder: "Search universities, cities or programmes",
      searchLabel: "Search universities",
      showBottomNav: true,
    };
  }
  if (pathname === "/admin/accommodation") {
    return {
      title: "Accommodation",
      headerKind: "main",
      searchMode: "local",
      searchPlaceholder: "Search listings by title, city or area",
      searchLabel: "Search listings",
      showBottomNav: true,
    };
  }
  if (pathname === "/admin/announcements") {
    return {
      title: "Announcements",
      headerKind: "main",
      searchMode: "local",
      searchPlaceholder: "Search announcements",
      searchLabel: "Search announcements",
      showBottomNav: true,
    };
  }
  if (pathname === "/admin/imports") return { title: "Update data", headerKind: "main", searchMode: "none", showBottomNav: true };
  if (pathname === "/admin/import") return { title: "Import applicants", headerKind: "main", searchMode: "none", showBottomNav: true };
  if (pathname === "/admin/forecasting") return { title: "Forecasting & evidence", headerKind: "main", searchMode: "none", showBottomNav: true };
  if (pathname === "/admin/settings") return { title: "Settings", headerKind: "main", searchMode: "none", showBottomNav: true };
  if (pathname === "/admin") return { title: "Dashboard", headerKind: "main", searchMode: "global", showBottomNav: true };

  // Secondary applicant account screens
  if (pathname === "/dashboard/information") {
    return {
      title: "My information",
      headerKind: "secondary",
      searchMode: "none",
      showBottomNav: true,
      parentLabel: "My dashboard",
      parentHref: "/dashboard",
    };
  }
  if (pathname === "/dashboard/updates") {
    return {
      title: "My updates",
      headerKind: "secondary",
      searchMode: "none",
      showBottomNav: true,
      parentLabel: "My dashboard",
      parentHref: "/dashboard",
    };
  }
  if (pathname === "/dashboard/listings") {
    return {
      title: "My listings",
      headerKind: "secondary",
      searchMode: "none",
      showBottomNav: true,
      parentLabel: "My dashboard",
      parentHref: "/dashboard",
      contextualAction: POST_LISTING_ACTION,
    };
  }

  // Primary applicant / public tabs
  if (pathname === "/dashboard") {
    return {
      title: "My dashboard",
      headerKind: "main",
      searchMode: "global",
      showBottomNav: true,
    };
  }
  if (pathname === "/more") {
    return {
      title: "More",
      headerKind: "main",
      searchMode: "none",
      showBottomNav: true,
    };
  }
  if (pathname === "/tracker") {
    return {
      title: "My Journey",
      headerKind: "main",
      searchMode: "local",
      searchPlaceholder: "Search ID, university, embassy…",
      searchLabel: "Search My Journey",
      showBottomNav: true,
      contextualAction: role === "guest" ? SUBMIT_ACTION : undefined,
    };
  }
  if (pathname.startsWith("/tracker/") && pathname.split("/").length >= 3) {
    return {
      title: decodeURIComponent(pathname.split("/")[2] || "Entry"),
      headerKind: "secondary",
      searchMode: "none",
      showBottomNav: true,
      parentLabel: "My Journey",
      parentHref: "/tracker",
    };
  }
  if (pathname === "/analytics") {
    return { title: "Analytics", headerKind: "main", searchMode: "global", showBottomNav: true };
  }
  if (pathname === "/calculator") {
    return { title: "Timeline calculator", headerKind: "main", searchMode: "none", showBottomNav: true };
  }
  if (pathname === "/queue-progress") {
    return { title: "Queue progress", headerKind: "secondary", searchMode: "global", showBottomNav: true, parentLabel: "Overview", parentHref: "/" };
  }
  if (pathname === "/announcements") {
    return { title: "Announcements", headerKind: "secondary", searchMode: "none", showBottomNav: true, parentLabel: "Overview", parentHref: "/" };
  }
  if (pathname === "/universities") {
    return {
      title: "Universities",
      headerKind: "secondary",
      searchMode: "local",
      searchPlaceholder: "Search universities, cities or programmes",
      searchLabel: "Search universities",
      showBottomNav: true,
      parentLabel: "More",
      parentHref: "/more",
    };
  }
  if (pathname.startsWith("/universities/") && pathname.split("/").length >= 3) {
    return {
      title: "University",
      headerKind: "secondary",
      searchMode: "none",
      showBottomNav: true,
      parentLabel: "Universities",
      parentHref: "/universities",
    };
  }
  if (pathname === "/programmes/compare") {
    return {
      title: "Compare programmes",
      headerKind: "secondary",
      searchMode: "none",
      showBottomNav: true,
      parentLabel: "Programmes",
      parentHref: "/programmes",
    };
  }
  if (pathname === "/programmes") {
    return {
      title: "Programmes",
      headerKind: "secondary",
      searchMode: "local",
      searchPlaceholder: "Search programmes, universities or subjects",
      searchLabel: "Search programmes",
      showBottomNav: true,
      parentLabel: "More",
      parentHref: "/more",
    };
  }
  if (pathname.startsWith("/programmes/") && pathname.split("/").length >= 3) {
    return {
      title: "Programme",
      headerKind: "secondary",
      searchMode: "none",
      showBottomNav: true,
      parentLabel: "Programmes",
      parentHref: "/programmes",
    };
  }
  if (pathname === "/accommodation") {
    return {
      title: "Accommodation",
      headerKind: "secondary",
      searchMode: "local",
      searchPlaceholder: "Search city, area or keyword",
      searchLabel: "Search accommodation",
      showBottomNav: true,
      parentLabel: "More",
      parentHref: "/more",
      contextualAction: POST_LISTING_ACTION,
    };
  }
  if (pathname.startsWith("/accommodation/") && pathname.split("/").length >= 3) {
    return {
      title: "Listing details",
      headerKind: "secondary",
      searchMode: "none",
      showBottomNav: true,
      parentLabel: "Accommodation",
      parentHref: "/accommodation",
    };
  }
  if (pathname === "/resources") {
    return { title: "Resources", headerKind: "secondary", searchMode: "none", showBottomNav: true, parentLabel: "More", parentHref: "/more" };
  }
  if (pathname === "/about") {
    return { title: "About", headerKind: "secondary", searchMode: "none", showBottomNav: true, parentLabel: "More", parentHref: "/more" };
  }

  // Default: Overview (`/`)
  return {
    title: "Overview",
    headerKind: "main",
    searchMode: "global",
    showBottomNav: true,
    contextualAction: role === "guest" ? SUBMIT_ACTION : undefined,
  };
}

import test from "node:test";
import assert from "node:assert/strict";
import {
  getMobileBottomNavItems,
  getNavSections,
  getRouteMeta,
  isFocusedWorkflowRoute,
} from "../lib/navigation";

test("authenticated desktop sidebar renders expected sections and exact item order", () => {
  const sections = getNavSections(false, "applicant");
  assert.deepEqual(
    sections.map((s) => s.title),
    ["Visa tracking", "My account", "Community"],
  );
  assert.deepEqual(
    sections[0].items.map((i) => i.label),
    [
      "Overview",
      "My dashboard",
      "My Journey",
      "Analytics",
      "Queue progress",
      "Timeline calculator",
      "Announcements",
    ],
  );
  assert.deepEqual(
    sections[1].items.map((i) => i.label),
    ["My information", "My updates", "My listings"],
  );
  assert.deepEqual(
    sections[2].items.map((i) => i.label),
    ["Universities", "Programmes", "Accommodation", "Resources", "About"],
  );
});

test("guest desktop sidebar hides My account and shows Submit your entry", () => {
  const sections = getNavSections(false, "guest");
  assert.deepEqual(
    sections.map((s) => s.title),
    ["Visa tracking", "Community"],
  );
  assert.deepEqual(
    sections[0].items.map((i) => i.label),
    [
      "Overview",
      "My Journey",
      "Analytics",
      "Queue progress",
      "Timeline calculator",
      "Announcements",
      "Submit your entry",
    ],
  );
});

test("mobile bottom navigation returns 5 tabs tailored to authentication role", () => {
  const authed = getMobileBottomNavItems("applicant");
  assert.equal(authed.length, 5);
  assert.deepEqual(
    authed.map((i) => ({ label: i.label, href: i.href })),
    [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Overview", href: "/" },
      { label: "My Journey", href: "/tracker" },
      { label: "Analytics", href: "/analytics" },
      { label: "More", href: "/more" },
    ],
  );

  const guest = getMobileBottomNavItems("guest");
  assert.equal(guest.length, 5);
  assert.deepEqual(
    guest.map((i) => ({ label: i.label, href: i.href })),
    [
      { label: "Overview", href: "/" },
      { label: "My Journey", href: "/tracker" },
      { label: "Analytics", href: "/analytics" },
      { label: "Timeline", href: "/calculator" },
      { label: "More", href: "/more" },
    ],
  );
});

test("focused workflow routes exclude shell chrome and hide bottom navigation", () => {
  for (const path of ["/submit", "/login", "/register", "/accommodation/new", "/accommodation/abc/edit"]) {
    assert.equal(isFocusedWorkflowRoute(path), true, `expected ${path} to be a focused workflow route`);
  }
  assert.equal(isFocusedWorkflowRoute("/tracker"), false);
  assert.equal(isFocusedWorkflowRoute("/more"), false);

  const submitMeta = getRouteMeta("/submit", "guest");
  assert.equal(submitMeta.headerKind, "focused");
  assert.equal(submitMeta.searchMode, "none");
  assert.equal(submitMeta.showBottomNav, false);
  assert.equal(submitMeta.contextualAction, undefined);
});

test("route metadata assigns global, local, and secondary headers consistently", () => {
  const overviewGuest = getRouteMeta("/", "guest");
  assert.equal(overviewGuest.headerKind, "main");
  assert.equal(overviewGuest.searchMode, "global");
  assert.equal(overviewGuest.contextualAction?.href, "/submit");

  const overviewAuthed = getRouteMeta("/", "applicant");
  assert.equal(overviewAuthed.contextualAction, undefined);

  const trackerMeta = getRouteMeta("/tracker", "applicant");
  assert.equal(trackerMeta.headerKind, "main");
  assert.equal(trackerMeta.searchMode, "local");

  for (const [path, expectedParent] of [
    ["/dashboard/information", "/dashboard"],
    ["/tracker/DEMO-0001", "/tracker"],
    ["/accommodation/123", "/accommodation"],
  ]) {
    const meta = getRouteMeta(path, "applicant");
    assert.equal(meta.headerKind, "secondary", `expected secondary header for ${path}`);
    assert.equal(meta.parentHref, expectedParent, `expected parentHref ${expectedParent} for ${path}`);
  }
});

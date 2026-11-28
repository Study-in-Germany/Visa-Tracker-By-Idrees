"use client";

import { useState } from "react";
import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";
import ApplicantProfileCard from "@/components/ApplicantProfileCard";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";

interface RowItem {
  href: string;
  label: string;
  hint?: string;
  icon: IconName;
}

function MoreSection({ title, items }: { title: string; items: RowItem[] }) {
  return (
    <section aria-label={title} className="space-y-1.5">
      <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-mute">{title}</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex min-h-[48px] items-center gap-3 px-3.5 py-2.5 text-[13px] font-medium text-ink-900 transition-colors hover:bg-[rgb(var(--hover))] active:bg-[rgb(var(--hover))]"
            >
              <Icon name={item.icon} size={19} className="shrink-0 text-mute" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.label}</span>
                {item.hint && <span className="block truncate text-[11px] font-normal text-mute">{item.hint}</span>}
              </span>
              <Icon name="chevronRight" size={16} className="shrink-0 text-mute" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function MorePage() {
  const session = useSession();
  const { theme, setTheme } = useTheme();
  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const isApplicant = session.role === "applicant";
  const isAdmin = session.role === "admin";
  const isAuthed = isApplicant || isAdmin;

  const visaTools: RowItem[] = [
    { href: "/queue-progress", label: "Queue progress", hint: "Monthly cohorts and average waiting stages", icon: "queue" },
    ...(isApplicant
      ? [{ href: "/calculator", label: "Timeline calculator", hint: "Run custom what-if scenario estimates", icon: "calculator" as IconName }]
      : []),
    { href: "/announcements", label: "Announcements", hint: "Community and embassy notices", icon: "megaphone" },
    ...(!isAuthed
      ? [{ href: "/submit", label: "Submit your entry", hint: "Share your visa timeline anonymously", icon: "filePlus" as IconName }]
      : []),
  ];

  const myAccount: RowItem[] = [
    { href: "/dashboard/information", label: "My information", hint: "Edit profile, email OTP, and privacy", icon: "user" },
    { href: "/dashboard/updates", label: "My updates", hint: "Status change and milestone history", icon: "history" },
    { href: "/dashboard/listings", label: "My listings", hint: "Manage your posted rooms and apartments", icon: "house" },
  ];

  const community: RowItem[] = [
    { href: "/universities", label: "Universities", hint: "German university directory", icon: "school" },
    { href: "/programmes", label: "Programmes", hint: "Search Bachelor, Master & PhD degrees", icon: "book" },
    { href: "/accommodation", label: "Accommodation", hint: "Student housing board", icon: "building" },
    { href: "/resources", label: "Resources", hint: "Guides and checklists", icon: "folder" },
  ];

  async function confirmLogout() {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      const result = await session.logout({
        asAdmin: isAdmin,
        redirectTo: isAdmin ? "/admin/login" : "/",
      });
      if (!result.ok) {
        setLogoutError(result.error || "Could not revoke your server session. Please retry.");
        return;
      }
      setShowLogout(false);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {isApplicant && (
        <ApplicantProfileCard
          session={{
            role: session.role ?? "guest",
            publicId: session.publicId,
            email: session.email,
            name: session.name,
            university: session.university,
            consulate: session.consulate,
            visaStatus: session.visaStatus,
            loading: session.loading,
          }}
          className="p-3"
        />
      )}

      <MoreSection title="Visa tools" items={visaTools} />

      {isApplicant && <MoreSection title="My account" items={myAccount} />}

      <MoreSection title="Community" items={community} />

      {/* Preferences & support */}
      <section aria-label="Preferences and support" className="space-y-1.5">
        <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-mute">Preferences &amp; support</h2>
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
          {/* Appearance switcher */}
          <div className="flex min-h-[52px] items-center justify-between gap-3 px-3.5 py-2.5">
            <div className="flex items-center gap-3">
              <Icon name={theme === "dark" ? "moon" : "sun"} size={19} className="shrink-0 text-mute" />
              <div>
                <p className="text-[13px] font-medium text-ink-900">Appearance</p>
                <p className="text-[11px] text-mute">Theme saved on this device</p>
              </div>
            </div>
            <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-lg border border-line bg-paper-sunk p-0.5 text-xs">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  onClick={() => setTheme(t)}
                  className={`min-h-[32px] rounded-md px-2.5 font-semibold capitalize transition-colors ${
                    theme === t ? "bg-paper-raised text-ink-900 shadow-xs" : "text-mute hover:text-ink-900"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/about"
            className="flex min-h-[48px] items-center gap-3 px-3.5 py-2.5 text-[13px] font-medium text-ink-900 transition-colors hover:bg-[rgb(var(--hover))]"
          >
            <Icon name="info" size={19} className="shrink-0 text-mute" />
            <span className="flex-1">About Visa Tracker</span>
            <Icon name="chevronRight" size={16} className="shrink-0 text-mute" />
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="flex min-h-[48px] items-center gap-3 px-3.5 py-2.5 text-[13px] font-medium text-blue-600 transition-colors hover:bg-[rgb(var(--hover))] dark:text-blue-400"
            >
              <Icon name="shield" size={19} className="shrink-0" />
              <span className="flex-1">Admin console</span>
              <Icon name="chevronRight" size={16} className="shrink-0 text-mute" />
            </Link>
          )}

          {isAuthed ? (
            <button
              type="button"
              onClick={() => setShowLogout(true)}
              className="flex min-h-[48px] w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Icon name="logout" size={19} className="shrink-0" />
              <span className="flex-1">Log out{session.publicId ? ` (${session.publicId})` : ""}</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex min-h-[48px] items-center gap-3 px-3.5 py-2.5 text-[13px] font-medium text-ink-900 transition-colors hover:bg-[rgb(var(--hover))]"
            >
              <Icon name="logIn" size={19} className="shrink-0 text-mute" />
              <span className="flex-1">Applicant login</span>
              <Icon name="chevronRight" size={16} className="shrink-0 text-mute" />
            </Link>
          )}
        </div>
      </section>

      <ConfirmationModal
        isOpen={showLogout}
        onClose={() => {
          if (loggingOut) return;
          setShowLogout(false);
          setLogoutError(null);
        }}
        onConfirm={confirmLogout}
        title="Log out?"
        message="Are you sure you want to log out of your account?"
        confirmText={logoutError ? "Retry log out" : "Log out"}
        cancelText="Cancel"
        variant="danger"
        icon="logout"
        isLoading={loggingOut}
        error={logoutError}
      />
    </div>
  );
}

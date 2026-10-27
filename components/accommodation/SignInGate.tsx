"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { LoadingBlock } from "@/components/ui/States";
import { useSession } from "@/hooks/useSession";

/** Renders children only for signed-in applicants; everyone else gets a clear next step instead of a failing form. */
export default function SignInGate({ next, children }: { next: string; children: React.ReactNode }) {
  const { role, loading } = useSession();
  if (loading && !role) return <LoadingBlock />;
  if (role === "applicant") return <>{children}</>;
  return (
    <div className="card w-full px-5 py-12 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-paper-sunk text-ink-700"><Icon name="user" /></span>
      <h2 className="mt-3 text-[15px] font-semibold">{role === "admin" ? "Use an applicant account" : "Sign in to post a place"}</h2>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-mute">
        {role === "admin"
          ? "Listings are posted by applicants. As an admin you can review and edit them from the moderation page."
          : "Use your Tracking ID and Access Code. If you don't have an entry yet, submit one first. It only takes a few minutes."}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {role === "admin" ? (
          <Link href="/admin/accommodation" className="btn-primary">Open moderation</Link>
        ) : (
          <>
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-primary">Sign in</Link>
            <Link href="/submit" className="btn-secondary">Submit an entry</Link>
          </>
        )}
      </div>
    </div>
  );
}

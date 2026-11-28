"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { invalidateApi, resetApiCache, useApi } from "./useApi";
import { broadcastAuthEvent, useAuthLifecycleSync } from "./useSessionSync";

export type SessionInfo = {
  role: "admin" | "applicant" | "guest";
  publicId?: string;
  email?: string;
  name?: string;
  university?: string | null;
  consulate?: string | null;
  visaStatus?: string | null;
};

export type LogoutResult = {
  ok: boolean;
  error?: string;
};

type SessionContextValue = SessionInfo & {
  loading: boolean;
  signedIn: boolean;
  refresh: () => void;
  logout: (opts?: { asAdmin?: boolean; redirectTo?: string }) => Promise<LogoutResult>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const GUEST_SESSION: SessionInfo = { role: "guest" };

function redirectToAuthGateIfProtected(role: SessionInfo["role"]) {
  if (typeof window === "undefined") return;
  const pathname = window.location.pathname;
  if (pathname.startsWith("/dashboard") && role !== "applicant") {
    window.location.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
  } else if (pathname.startsWith("/admin") && pathname !== "/admin/login" && role !== "admin") {
    window.location.replace(`/admin/login?next=${encodeURIComponent(pathname + window.location.search)}`);
  }
}

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession: SessionInfo;
  children: ReactNode;
}) {
  const [forcedGuest, setForcedGuest] = useState(false);
  const loggingOutRef = useRef(false);
  const { data, loading, reload } = useApi<SessionInfo>("/api/session");

  // Sync forcedGuest if a fresh server response confirms an authenticated session after login
  useEffect(() => {
    if (loggingOutRef.current) return;
    if (data && data.role !== "guest") {
      setForcedGuest(false);
    }
    if (data) {
      redirectToAuthGateIfProtected(data.role);
    }
  }, [data]);

  const refresh = useCallback(() => {
    setForcedGuest(false);
    invalidateApi("/api/session");
    reload();
  }, [reload]);

  const handleLifecycleSync = useCallback(
    (reason: "LOGOUT" | "LOGIN" | "RESUME" | "BFCACHE") => {
      if (loggingOutRef.current) return;
      if (reason === "LOGOUT") {
        setForcedGuest(true);
        resetApiCache();
        if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "CLEAR_USER_CACHE" });
        }
        redirectToAuthGateIfProtected("guest");
        invalidateApi("/api/session");
        reload();
        return;
      }
      // On bfcache restore, PWA resume, or cross-tab login: revalidate from network
      invalidateApi("/api/session");
      reload();
    },
    [reload]
  );

  useAuthLifecycleSync(handleLifecycleSync);

  const logout = useCallback(
    async (opts?: { asAdmin?: boolean; redirectTo?: string }): Promise<LogoutResult> => {
      const asAdmin = opts?.asAdmin ?? (data?.role === "admin" || initialSession.role === "admin");
      const endpoint = asAdmin ? "/api/admin/logout" : "/api/applicant/logout";
      const target = opts?.redirectTo ?? (asAdmin ? "/admin/login" : "/");
      loggingOutRef.current = true;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });

        // Clear local presentation state immediately regardless of server status
        setForcedGuest(true);
        resetApiCache();

        if (!res.ok) {
          loggingOutRef.current = false;
          const body = await res.json().catch(() => null);
          return {
            ok: false,
            error: body?.error || "Could not revoke your server session. Please try logging out again.",
          };
        }

        if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "CLEAR_USER_CACHE" });
        }
        broadcastAuthEvent("LOGOUT");
        // Hard navigation guarantees Next.js Client Router Cache and bfcache state are completely reset
        if (typeof window !== "undefined") {
          window.location.assign(target);
        }
        return { ok: true };
      } catch {
        loggingOutRef.current = false;
        setForcedGuest(true);
        resetApiCache();
        return {
          ok: false,
          error: "Unable to reach the server to complete sign-out. Check your connection and retry.",
        };
      }
    },
    [data?.role, initialSession.role]
  );

  const value = useMemo<SessionContextValue>(() => {
    const active = forcedGuest ? GUEST_SESSION : (data ?? initialSession);
    return {
      role: active.role,
      publicId: active.publicId,
      email: active.email,
      name: active.name,
      university: active.university,
      consulate: active.consulate,
      visaStatus: active.visaStatus,
      loading: !forcedGuest && !data && loading,
      signedIn: active.role !== "guest",
      refresh,
      logout,
    };
  }, [data, forcedGuest, initialSession, loading, logout, refresh]);

  return createElement(SessionContext.Provider, { value }, children);
}

/** Current viewer's role, synchronized with server-hydrated initial session + `/api/session`. */
export function useSession() {
  const ctx = useContext(SessionContext);
  const fallback = useApi<SessionInfo>(ctx ? null : "/api/session");
  if (ctx) return ctx;
  return {
    role: fallback.data?.role,
    publicId: fallback.data?.publicId,
    email: fallback.data?.email,
    name: fallback.data?.name,
    university: fallback.data?.university,
    consulate: fallback.data?.consulate,
    visaStatus: fallback.data?.visaStatus,
    loading: fallback.loading,
    signedIn: !!fallback.data && fallback.data.role !== "guest",
    refresh: () => {
      invalidateApi("/api/session");
      fallback.reload();
    },
    logout: async (opts?: { asAdmin?: boolean; redirectTo?: string }): Promise<LogoutResult> => {
      const asAdmin = opts?.asAdmin ?? fallback.data?.role === "admin";
      try {
        const res = await fetch(asAdmin ? "/api/admin/logout" : "/api/applicant/logout", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
        resetApiCache();
        if (!res.ok) return { ok: false, error: "Could not complete sign-out." };
        broadcastAuthEvent("LOGOUT");
        if (typeof window !== "undefined") {
          window.location.assign(opts?.redirectTo ?? (asAdmin ? "/admin/login" : "/"));
        }
        return { ok: true };
      } catch {
        resetApiCache();
        return { ok: false, error: "Unable to reach the server to complete sign-out." };
      }
    },
  };
}

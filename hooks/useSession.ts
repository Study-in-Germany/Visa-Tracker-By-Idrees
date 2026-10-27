"use client";

import { useApi } from "./useApi";

export type SessionInfo = { role: "admin" | "applicant" | "guest"; publicId?: string };

/** Current viewer's role. `role` is undefined until the first response arrives. */
export function useSession() {
  const { data, loading } = useApi<SessionInfo>("/api/session");
  return { role: data?.role, publicId: data?.publicId, loading, signedIn: !!data && data.role !== "guest" };
}

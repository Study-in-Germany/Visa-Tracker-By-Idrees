export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Fetch JSON and turn non-2xx responses into ApiError with the server's message. */
export async function apiFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "same-origin", ...init });
  } catch (e: any) {
    if (e?.name === "AbortError") throw e;
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const raw = body?.error;
    const fields = raw && typeof raw === "object" ? (raw.fieldErrors as Record<string, string[]> | undefined) : undefined;
    const fieldText = fields
      ? Object.entries(fields).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ")
      : "";
    const message =
      typeof raw === "string" ? raw : fieldText || (res.status >= 500 ? "The server hit a problem. Please try again." : "Request failed.");
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export const jsonInit = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

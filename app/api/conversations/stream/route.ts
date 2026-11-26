import { NextRequest } from "next/server";
import { getApplicantSession } from "@/lib/auth";
import { subscribeApplicant, RealtimeEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getApplicantSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const applicantId = session.applicantId;
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let keepAliveTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: new Date().toISOString() })}\n\n`)
      );

      // Subscribe to real-time events for this applicant
      unsubscribe = subscribeApplicant(applicantId, (event: RealtimeEvent) => {
        try {
          const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream might have closed
        }
      });

      // Keepalive heartbeat every 25 seconds
      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          if (keepAliveTimer) clearInterval(keepAliveTimer);
        }
      }, 25000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (keepAliveTimer) clearInterval(keepAliveTimer);
    },
  });

  req.signal.addEventListener("abort", () => {
    if (unsubscribe) unsubscribe();
    if (keepAliveTimer) clearInterval(keepAliveTimer);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}


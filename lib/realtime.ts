import { EventEmitter } from "events";

// Global singleton event emitter for in-process real-time event broadcasting
declare global {
  var __realtimeEmitter: EventEmitter | undefined;
}

const emitter: EventEmitter = global.__realtimeEmitter || new EventEmitter();
emitter.setMaxListeners(1000);
if (process.env.NODE_ENV !== "production") {
  global.__realtimeEmitter = emitter;
}

export type RealtimeEvent = {
  type: "new_message" | "message_read" | "conversation_updated";
  conversationId: string;
  recipientApplicantId?: string;
  senderApplicantId?: string;
  payload: any;
  timestamp: string;
};

/**
 * Broadcast an event to real-time subscribers.
 */
export function broadcastEvent(event: RealtimeEvent) {
  // Emit on specific applicant channels and conversation channel
  if (event.recipientApplicantId) {
    emitter.emit(`applicant:${event.recipientApplicantId}`, event);
  }
  if (event.senderApplicantId) {
    emitter.emit(`applicant:${event.senderApplicantId}`, event);
  }
  emitter.emit(`conversation:${event.conversationId}`, event);
}

/**
 * Subscribe to events for a specific applicant.
 */
export function subscribeApplicant(applicantId: string, listener: (event: RealtimeEvent) => void) {
  const channel = `applicant:${applicantId}`;
  emitter.on(channel, listener);
  return () => {
    emitter.off(channel, listener);
  };
}

/**
 * Subscribe to events for a specific conversation.
 */
export function subscribeConversation(conversationId: string, listener: (event: RealtimeEvent) => void) {
  const channel = `conversation:${conversationId}`;
  emitter.on(channel, listener);
  return () => {
    emitter.off(channel, listener);
  };
}


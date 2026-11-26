"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import { useSession } from "@/hooks/useSession";

interface MessageItem {
  id: string;
  clientMessageId?: string;
  senderId: string;
  content: string;
  createdAt: string;
  isSelf: boolean;
  status?: "pending" | "sent" | "failed";
}

interface ConversationItem {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  lastMessageAt: string;
  unreadCount: number;
  lastMessage?: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  otherParticipant: {
    applicantId: string;
    publicId?: string;
    displayName: string;
    university?: string;
    program?: string;
    destinationCity?: string;
    inGermany?: boolean;
  };
}

function formatMessageTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatConversationDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const urlConvId = searchParams.get("conversationId");

  const session = useSession();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(urlConvId);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [loadingConvList, setLoadingConvList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [tabFilter, setTabFilter] = useState<"all" | "requests">("all");

  // Moderation state
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!session.signedIn) return;
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        const items: ConversationItem[] = data.items || [];
        setConversations(items);

        if (!activeConvId && items.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
          setActiveConvId(items[0].id);
        }
      }
    } catch {
    } finally {
      setLoadingConvList(false);
    }
  }, [session.signedIn, activeConvId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (urlConvId && urlConvId !== activeConvId) {
      setActiveConvId(urlConvId);
    }
  }, [urlConvId, activeConvId]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          (data.items || []).map((m: any) => ({
            ...m,
            status: "sent",
          }))
        );

        fetch(`/api/conversations/${convId}/read`, { method: "POST" }).catch(() => {});
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch {
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time EventSource (SSE)
  useEffect(() => {
    if (!session.signedIn) return;

    const connectSSE = () => {
      const es = new EventSource("/api/conversations/stream");
      eventSourceRef.current = es;

      es.addEventListener("new_message", (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data);
          const payload = event.payload;

          if (payload.conversationId === activeConvId) {
            setMessages((prev) => {
              const alreadyExists = prev.some(
                (m) =>
                  m.id === payload.id ||
                  (m.clientMessageId && m.clientMessageId === payload.clientMessageId)
              );
              if (alreadyExists) {
                return prev.map((m) =>
                  m.clientMessageId === payload.clientMessageId
                    ? { ...payload, isSelf: payload.senderId === session.publicId, status: "sent" }
                    : m
                );
              }
              return [
                ...prev,
                {
                  id: payload.id,
                  clientMessageId: payload.clientMessageId,
                  senderId: payload.senderId,
                  content: payload.content,
                  createdAt: payload.createdAt,
                  isSelf: false,
                  status: "sent",
                },
              ];
            });

            fetch(`/api/conversations/${activeConvId}/read`, { method: "POST" }).catch(() => {});
          }

          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === payload.conversationId) {
                return {
                  ...c,
                  lastMessageAt: payload.createdAt,
                  unreadCount: c.id === activeConvId ? 0 : c.unreadCount + 1,
                  lastMessage: {
                    id: payload.id,
                    content: payload.content,
                    createdAt: payload.createdAt,
                    senderId: payload.senderId,
                  },
                };
              }
              return c;
            })
          );
        } catch {}
      });

      es.addEventListener("conversation_updated", () => {
        loadConversations();
      });

      es.onerror = () => {
        es.close();
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    const pollInterval = setInterval(() => {
      loadConversations();
    }, 8000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearInterval(pollInterval);
    };
  }, [session.signedIn, activeConvId, loadConversations, session.publicId]);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConvId || sending) return;

    const content = inputText.trim();
    const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const tempCreatedAt = new Date().toISOString();

    setInputText("");
    setSending(true);

    const optimisticMsg: MessageItem = {
      id: clientMessageId,
      clientMessageId,
      senderId: session.publicId || "me",
      content,
      createdAt: tempCreatedAt,
      isSelf: true,
      status: "pending",
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, clientMessageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deliver message.");

      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId
            ? { ...m, id: data.id, createdAt: data.createdAt, status: "sent" }
            : m
        )
      );

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                lastMessageAt: data.createdAt,
                lastMessage: {
                  id: data.id,
                  content,
                  createdAt: data.createdAt,
                  senderId: session.publicId || "me",
                },
              }
            : c
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.clientMessageId === clientMessageId ? { ...m, status: "failed" } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAcceptRequest = async () => {
    if (!activeConvId) return;
    try {
      const res = await fetch(`/api/conversations/${activeConvId}/accept`, { method: "POST" });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, status: "ACCEPTED" } : c))
        );
      }
    } catch {}
  };

  const handleDeclineRequest = async () => {
    if (!activeConvId) return;
    if (!confirm("Decline this conversation request?")) return;
    try {
      const res = await fetch(`/api/conversations/${activeConvId}/decline`, { method: "POST" });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, status: "DECLINED" } : c))
        );
      }
    } catch {}
  };

  const handleBlockUser = async () => {
    const activeConv = conversations.find((c) => c.id === activeConvId);
    if (!activeConv) return;
    try {
      const res = await fetch(`/api/users/${activeConv.otherParticipant.applicantId}/block`, {
        method: "POST",
      });
      if (res.ok) {
        alert("User blocked.");
        setBlockModalOpen(false);
        setActiveConvId(null);
        loadConversations();
      }
    } catch {}
  };

  const handleReportUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeConv = conversations.find((c) => c.id === activeConvId);
    if (!activeConv || !reportReason.trim()) return;
    setReporting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedApplicantId: activeConv.otherParticipant.applicantId,
          conversationId: activeConv.id,
          reason: reportReason,
        }),
      });
      if (res.ok) {
        alert("Report submitted.");
        setReportModalOpen(false);
        setReportReason("");
      }
    } catch {
    } finally {
      setReporting(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      !searchFilter ||
      c.otherParticipant.displayName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (c.otherParticipant.university &&
        c.otherParticipant.university.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (c.lastMessage && c.lastMessage.content.toLowerCase().includes(searchFilter.toLowerCase()));

    const matchesTab = tabFilter === "all" || (tabFilter === "requests" && c.status === "PENDING");
    return matchesSearch && matchesTab;
  });

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  if (!session.signedIn) {
    return (
      <>
        <PageHeader
          title="Private Student Messages"
          description="Direct, secure messaging with other Pakistani students heading to German universities."
        />
        <div className="card p-12 text-center max-w-md mx-auto space-y-4 my-8 bg-paper-raised">
          <div className="w-12 h-12 rounded-full bg-paper-sunk text-mute flex items-center justify-center mx-auto">
            <Icon name="inbox" size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-ink-900">Sign In Required</h3>
            <p className="text-xs text-mute leading-relaxed">
              Please sign in using your applicant tracking ID and access code to access your conversations.
            </p>
          </div>
          <Link href="/dashboard" className="btn-primary inline-flex text-xs py-2 px-4 font-semibold">
            Sign In with Access Code
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Student Messages & Conversations"
        description="Encrypted, durable direct communication with students attending your German university."
        actions={
          <Link href="/connect" className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
            <Icon name="users" size={14} />
            <span>Discover Students</span>
          </Link>
        }
      />

      {/* Main Chat Container */}
      <div className="card p-0 overflow-hidden border border-line-strong h-[75vh] min-h-[520px] flex shadow-xs mb-8 bg-card">
        {/* Left Panel: Conversations List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-line flex flex-col bg-card flex-shrink-0 ${
            activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search & Tabs */}
          <div className="p-3 border-b border-line space-y-2 bg-paper-raised">
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="input pl-8 text-xs placeholder:text-mute"
              />
              <div className="absolute left-2.5 top-2.5 text-mute">
                <Icon name="search" size={13} />
              </div>
            </div>

            <div className="flex gap-1 text-xs">
              <button
                type="button"
                onClick={() => setTabFilter("all")}
                className={`flex-1 py-1 px-2 rounded-md font-medium text-center transition-colors cursor-pointer ${
                  tabFilter === "all"
                    ? "bg-ink-800 text-paper-raised dark:bg-ink-100 dark:text-ink-900"
                    : "text-mute hover:text-ink-900 hover:bg-paper-sunk"
                }`}
              >
                All Messages
              </button>
              <button
                type="button"
                onClick={() => setTabFilter("requests")}
                className={`flex-1 py-1 px-2 rounded-md font-medium text-center transition-colors cursor-pointer ${
                  tabFilter === "requests"
                    ? "bg-ink-800 text-paper-raised dark:bg-ink-100 dark:text-ink-900"
                    : "text-mute hover:text-ink-900 hover:bg-paper-sunk"
                }`}
              >
                Requests ({conversations.filter((c) => c.status === "PENDING").length})
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-line">
            {loadingConvList ? (
              <div className="p-8 text-center text-xs text-mute">
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-mute">
                <p className="text-xs">No conversations yet.</p>
                <Link href="/connect" className="text-xs text-blue-500 font-semibold hover:underline block">
                  Find peers in the directory
                </Link>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.id === activeConvId;
                const initials = c.otherParticipant.displayName.slice(0, 2).toUpperCase();

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveConvId(c.id)}
                    className={`w-full p-3.5 flex items-start gap-3 text-left transition-colors cursor-pointer ${
                      isActive
                        ? "bg-paper-sunk border-l-4 border-l-ink-800"
                        : "hover:bg-paper-raised"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-paper-sunk text-ink-900 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-semibold text-xs text-ink-900 truncate">
                          {c.otherParticipant.displayName}
                        </h4>
                        <span className="text-[10px] text-mute flex-shrink-0">
                          {c.lastMessageAt ? formatConversationDate(c.lastMessageAt) : ""}
                        </span>
                      </div>

                      <p className="text-[11px] text-mute truncate">
                        {c.otherParticipant.university || "University Student"}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <p className="text-[11px] text-mute truncate">
                          {c.lastMessage ? c.lastMessage.content : "Conversation opened"}
                        </p>
                        {c.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Active Chat */}
        <div
          className={`flex-1 flex flex-col bg-paper ${
            !activeConvId ? "hidden md:flex items-center justify-center" : "flex"
          }`}
        >
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="p-3 px-4 bg-card border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden text-mute hover:text-ink-900 p-1 -ml-1 rounded"
                    aria-label="Back"
                  >
                    <Icon name="arrowLeft" size={16} />
                  </button>

                  <div className="w-8 h-8 rounded-full bg-paper-sunk text-ink-900 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    {activeConversation.otherParticipant.displayName.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-semibold text-xs text-ink-900 truncate">
                      {activeConversation.otherParticipant.displayName}
                    </h3>
                    <p className="text-[11px] text-mute truncate">
                      {activeConversation.otherParticipant.university || "Student"}{" "}
                      {activeConversation.otherParticipant.destinationCity &&
                        `• ${activeConversation.otherParticipant.destinationCity}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBlockModalOpen(true)}
                    className="text-xs text-mute hover:text-red-700 px-2 py-1 rounded cursor-pointer"
                  >
                    Block
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(true)}
                    className="text-xs text-mute hover:text-ink-900 px-2 py-1 rounded cursor-pointer"
                  >
                    Report
                  </button>
                </div>
              </div>

              {/* Message Request Banner */}
              {activeConversation.status === "PENDING" && (
                <div className="p-3 bg-paper-raised border-b border-line flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-ink-900 font-medium">
                    Message request pending. Accept to start direct conversation.
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAcceptRequest}
                      className="btn-primary text-xs py-1 px-3"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclineRequest}
                      className="btn-secondary text-xs py-1 px-3"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="text-center text-xs text-mute py-8">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-mute py-12 space-y-1">
                    <p>No messages yet.</p>
                    <p>Send a message to introduce yourself!</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id || m.clientMessageId}
                      className={`flex flex-col ${m.isSelf ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                          m.isSelf
                            ? "bg-ink-800 text-paper-raised dark:bg-ink-100 dark:text-ink-900"
                            : "bg-card text-ink-900 border border-line"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-mute">
                        <span>{formatMessageTime(m.createdAt)}</span>
                        {m.isSelf && (
                          <span>
                            {m.status === "pending" ? (
                              "• sending..."
                            ) : m.status === "failed" ? (
                              <span className="text-red-500 font-semibold">Failed</span>
                            ) : (
                              <Icon name="check" size={10} className="text-emerald-600 inline" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="p-3 bg-card border-t border-line">
                {activeConversation.status === "DECLINED" ? (
                  <div className="p-2.5 bg-paper-sunk rounded-lg text-center text-xs text-mute">
                    This conversation was declined.
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <textarea
                      rows={1}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                      className="input text-xs resize-none max-h-28 py-2"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || sending}
                      className="btn-primary p-2 rounded-lg flex-shrink-0 disabled:opacity-50"
                      aria-label="Send message"
                    >
                      <Icon name="send" size={14} />
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="text-center p-8 space-y-2 text-mute">
              <div className="w-10 h-10 rounded-full bg-paper-sunk flex items-center justify-center mx-auto text-mute">
                <Icon name="inbox" size={18} />
              </div>
              <h4 className="font-semibold text-xs text-ink-900">Select a Conversation</h4>
              <p className="text-xs max-w-xs mx-auto">
                Select an existing conversation from the list or contact peers in the directory.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Block Modal */}
      {blockModalOpen && activeConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="card p-5 max-w-sm w-full space-y-3 bg-card shadow-xl border-line-strong">
            <h4 className="font-semibold text-ink-900 text-sm">Block this student?</h4>
            <p className="text-xs text-mute leading-relaxed">
              They will no longer be able to message you or view your direct profile details.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setBlockModalOpen(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlockUser}
                className="btn-danger text-xs py-1.5 px-3"
              >
                Block User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModalOpen && activeConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form onSubmit={handleReportUser} className="card p-5 max-w-md w-full space-y-3 bg-card shadow-xl border-line-strong">
            <h4 className="font-semibold text-ink-900 text-sm">Report Conversation</h4>
            <p className="text-xs text-mute leading-relaxed">
              Help keep our student community safe and supportive. Please describe the violation.
            </p>
            <textarea
              required
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Explain the reason for reporting..."
              className="input text-xs"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reporting || !reportReason.trim()}
                className="btn-primary text-xs py-1.5 px-3"
              >
                {reporting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

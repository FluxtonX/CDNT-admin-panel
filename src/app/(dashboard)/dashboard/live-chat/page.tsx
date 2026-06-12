"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Send,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type AdminUser } from "@/lib/data/users";
import { supabase } from "@/lib/supabase";

type ChatStatus = "Active" | "Waiting" | "Resolved";

type Message = {
  id: string;
  sender: "Client" | "Admin";
  text: string;
  timestamp: string;
};

type ChatThread = {
  threadId: string;
  user: AdminUser;
  status: ChatStatus;
  unreadCount: number;
  unreadCountUser: number;
  lastMessageTime: string;
  messages: Message[];
  lastMessageAtISO: string;
};

const BRAND_GRADIENT = "linear-gradient(135deg, #0A3D91 0%, #1650AB 100%)";

function StatusIndicator({ status }: { status: ChatStatus }) {
  const map: Record<ChatStatus, string> = {
    Active: "bg-green-500",
    Waiting: "bg-amber-500",
    Resolved: "bg-gray-400",
  };
  return <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", map[status])} />;
}

export default function LiveChatSupportPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch threads from Supabase
  useEffect(() => {
    async function fetchThreads() {
      setLoading(true);
      try {
        // Fetch threads
        const { data, error } = await supabase
          .from("support_threads")
          .select(`
            id,
            status,
            unread_count_admin,
            unread_count_user,
            last_message_at,
            user_id,
            profiles:user_id (
              id,
              full_name
            )
          `)
          .order("last_message_at", { ascending: false });

        // Fetch auth users to get emails (profiles may not store email)
        let authUsersMap: Record<string, string> = {};
        try {
          const res = await fetch("/api/support/users");
          if (res.ok) {
            const usersData = await res.json();
            authUsersMap = usersData.reduce((acc: Record<string, string>, u: { id: string; email: string }) => {
              acc[u.id] = u.email;
              return acc;
            }, {});
          }
        } catch { /* silently fallback */ }

        if (error) throw error;

        if (data) {
          const mappedThreads: ChatThread[] = data.map((t: any) => {
            const profile = t.profiles;
            const adminUser: AdminUser = {
              id: profile?.id || t.user_id,
              name: profile?.full_name || authUsersMap[t.user_id]?.split("@")[0] || "User",
              email: authUsersMap[t.user_id] || "N/A",
              phone: "N/A",
              kyc: "Not Started",
              account: "Active",
              balance: 0,
              joinedDate: "",
              risk: "Low Risk",
              dateOfBirth: "",
              street: "",
              city: "",
              postalCode: "",
              country: "",
              lastLogin: "",
              twoFactor: false,
              lastIp: "",
            };

            return {
              threadId: t.id,
              user: adminUser,
              status: t.status as ChatStatus,
              unreadCount: t.unread_count_admin,
              unreadCountUser: t.unread_count_user,
              lastMessageTime: new Date(t.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              messages: [],
              lastMessageAtISO: t.last_message_at,
            };
          });

          setThreads(mappedThreads);

          if (mappedThreads.length > 0) {
            setActiveThreadId(mappedThreads[0].threadId);
          }
        }
      } catch (err) {
        console.error("Error loading chat threads:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchThreads();
  }, []);

  // Fetch messages dynamically when selected thread changes
  useEffect(() => {
    if (!activeThreadId) return;

    async function fetchMessages() {
      try {
        const { data, error } = await supabase
          .from("support_messages")
          .select("*")
          .eq("thread_id", activeThreadId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (data) {
          const mappedMsgs: Message[] = data.map((m: any) => ({
            id: m.id,
            sender: m.sender as "Client" | "Admin",
            text: m.text,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }));

          setThreads((current) =>
            current.map((t) => (t.threadId === activeThreadId ? { ...t, messages: mappedMsgs } : t))
          );
        }

        // Reset admin unread count
        const thread = threads.find((t) => t.threadId === activeThreadId);
        if (thread && thread.unreadCount > 0) {
          await supabase
            .from("support_threads")
            .update({ unread_count_admin: 0 })
            .eq("id", activeThreadId);

          setThreads((current) =>
            current.map((t) => (t.threadId === activeThreadId ? { ...t, unreadCount: 0 } : t))
          );
        }
      } catch (err) {
        console.error("Error fetching messages for thread:", activeThreadId, err);
      }
    }

    fetchMessages();
  }, [activeThreadId]);

  // Real-Time Subscriptions
  useEffect(() => {
    // 1. Listen for new messages
    const messagesChannel = supabase
      .channel("support_messages_admin")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        (payload) => {
          const newMsg = payload.new as any;
          const msgThreadId = newMsg.thread_id;

          const formattedMsg: Message = {
            id: newMsg.id,
            sender: newMsg.sender as "Client" | "Admin",
            text: newMsg.text,
            timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

          setThreads((current) =>
            current.map((t) => {
              if (t.threadId === msgThreadId) {
                const alreadyHas = t.messages.some((m) => m.id === newMsg.id);
                if (alreadyHas) return t;
                return {
                  ...t,
                  messages: [...t.messages, formattedMsg],
                };
              }
              return t;
            })
          );

          // If the message is in the active thread and from Client, clear unread count
          if (newMsg.sender === "Client" && msgThreadId === activeThreadId) {
            supabase
              .from("support_threads")
              .update({ unread_count_admin: 0 })
              .eq("id", activeThreadId)
              .then();
          }
        }
      )
      .subscribe();

    // 2. Listen for support_threads changes (e.g. status changes, new threads, last message time updates)
    const threadsChannel = supabase
      .channel("support_threads_admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_threads",
        },
        async (payload) => {
          const updatedRow = payload.new as any;
          const eventType = payload.eventType;

          if (eventType === "DELETE") {
            setThreads((current) => current.filter((t) => t.threadId !== payload.old.id));
            if (activeThreadId === payload.old.id) {
              setActiveThreadId("");
            }
            return;
          }

          // Fetch profiles detail for join
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", updatedRow.user_id)
            .single();

          const adminUser: AdminUser = {
            id: profile?.id || updatedRow.user_id,
            name: profile?.full_name || "User",
            email: "N/A",
            phone: "N/A",
            kyc: "Not Started",
            account: "Active",
            balance: 0,
            joinedDate: "",
            risk: "Low Risk",
            dateOfBirth: "",
            street: "",
            city: "",
            postalCode: "",
            country: "",
            lastLogin: "",
            twoFactor: false,
            lastIp: "",
          };

          const mappedThread: ChatThread = {
            threadId: updatedRow.id,
            user: adminUser,
            status: updatedRow.status as ChatStatus,
            unreadCount: updatedRow.id === activeThreadId ? 0 : updatedRow.unread_count_admin,
            unreadCountUser: updatedRow.unread_count_user,
            lastMessageTime: new Date(updatedRow.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            messages: [],
            lastMessageAtISO: updatedRow.last_message_at,
          };

          setThreads((current) => {
            const index = current.findIndex((t) => t.threadId === updatedRow.id);
            if (index !== -1) {
              const existingMessages = current[index].messages;
              const updated = {
                ...mappedThread,
                messages: existingMessages,
              };

              const nextList = [...current];
              nextList[index] = updated;

              return nextList.sort((a, b) => new Date(b.lastMessageAtISO).getTime() - new Date(a.lastMessageAtISO).getTime());
            } else {
              return [mappedThread, ...current].sort((a, b) => new Date(b.lastMessageAtISO).getTime() - new Date(a.lastMessageAtISO).getTime());
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(threadsChannel);
    };
  }, [activeThreadId]);

  /* Get Active Thread */
  const activeThread = useMemo(() => {
    return threads.find((t) => t.threadId === activeThreadId) || null;
  }, [threads, activeThreadId]);

  /* Scroll to bottom */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages, typingUser]);

  /* Filter threads */
  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    return threads.filter((t) => {
      return (
        !query ||
        t.user.name.toLowerCase().includes(query) ||
        t.user.id.toLowerCase().includes(query) ||
        t.messages.some((m) => m.text.toLowerCase().includes(query))
      );
    });
  }, [threads, search]);

  /* Send Admin Message */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeThread) return;

    const messageText = inputText.trim();
    setInputText("");

    try {
      const { data: newMsg, error } = await supabase
        .from("support_messages")
        .insert({
          thread_id: activeThread.threadId,
          sender: "Admin",
          text: messageText,
        })
        .select()
        .single();

      if (error) throw error;

      const formattedMsg: Message = {
        id: newMsg.id,
        sender: "Admin",
        text: newMsg.text,
        timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setThreads((current) =>
        current.map((t) => {
          if (t.threadId === activeThread.threadId) {
            const alreadyHas = t.messages.some((m) => m.id === newMsg.id);
            if (alreadyHas) return t;
            return {
              ...t,
              messages: [...t.messages, formattedMsg],
            };
          }
          return t;
        })
      );
    } catch (err) {
      console.error("Error sending support response:", err);
    }
  };

  /* Toggle Chat Status override */
  const handleSetStatus = async (status: ChatStatus) => {
    if (!activeThread) return;
    try {
      const { error } = await supabase
        .from("support_threads")
        .update({ status })
        .eq("id", activeThread.threadId);

      if (error) throw error;

      setThreads((current) =>
        current.map((t) => (t.threadId === activeThread.threadId ? { ...t, status } : t))
      );
    } catch (err) {
      console.error("Error setting support thread status:", err);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6 flex flex-col h-[calc(100vh-130px)] max-h-[850px]"
      >
        {/* Header */}
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-gray-900 sm:text-[30px]">Live Chat Support</h1>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">Manage customer support conversations in real-time</p>
        </div>

        {/* Chat Interface Container */}
        <div className="flex-1 flex overflow-hidden border border-gray-200 rounded-2xl bg-white shadow-sm min-h-[400px]">
          {/* Sidebar - Threads list */}
          <div className={cn("w-full md:w-[320px] shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/20", activeThreadId ? "hidden md:flex" : "flex")}>
            {/* Search */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-xs text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-16 bg-white rounded-xl animate-pulse border border-gray-100" />
                ))
              ) : filteredThreads.length === 0 ? (
                <div className="p-4 text-center text-xs font-semibold text-gray-400">
                  No conversations found.
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const isActive = thread.threadId === activeThreadId;
                  const lastMsg = thread.messages[thread.messages.length - 1];

                  return (
                    <button
                      key={thread.threadId}
                      onClick={() => setActiveThreadId(thread.threadId)}
                      className={cn(
                        "w-full text-left p-3.5 border rounded-2xl transition-all flex items-start gap-3.5 cursor-pointer",
                        isActive
                          ? "bg-white border-blue-200 shadow-md ring-2 ring-blue-50"
                          : "bg-transparent border-transparent hover:bg-gray-100/60"
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative">
                        <div className="h-9 w-9 rounded-xl bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-600 font-bold font-mono text-sm shrink-0">
                          {thread.user.name[0]}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-white">
                          <StatusIndicator status={thread.status} />
                        </span>
                      </div>

                      {/* Snippet info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-gray-900 text-xs truncate max-w-[120px]">{thread.user.name}</span>
                          <span className="text-[9px] text-gray-400 font-bold font-mono shrink-0">{thread.lastMessageTime}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium truncate pr-1">
                          {lastMsg ? lastMsg.text : "No messages yet"}
                        </p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[9px] text-gray-400 font-mono uppercase tracking-tight">{thread.user.id.substring(0, 8)}</span>
                          {thread.status === "Waiting" && (
                            <span className="text-[8px] bg-amber-50 text-amber-700 font-bold uppercase px-1 rounded">waiting</span>
                          )}
                        </div>
                      </div>

                      {/* Unread badge */}
                      {thread.unreadCount > 0 && (
                        <span className="h-5 w-5 rounded-full bg-red-600 text-white font-mono font-black text-[9px] flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                          {thread.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane - Chat window */}
          <div className={cn("flex-1 flex flex-col bg-gray-50/30", activeThreadId ? "flex" : "hidden md:flex")}>
            {activeThread ? (
              <>
                {/* Chat Pane Header */}
                <div className="px-4 py-3 sm:px-6 sm:py-4.5 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setActiveThreadId("")}
                      className="md:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-500 mr-1 shrink-0 cursor-pointer"
                      aria-label="Back to threads"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="h-10 w-10 rounded-xl bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-600 font-bold font-mono text-base">
                      {activeThread.user.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-gray-900 text-sm leading-none">{activeThread.user.name}</h4>
                        <span className="flex items-center gap-1 bg-gray-100 text-gray-500 font-bold uppercase px-2 py-0.5 rounded-full text-[9px] tracking-wide border border-gray-150 font-mono">
                          <StatusIndicator status={activeThread.status} />
                          {activeThread.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono mt-1 block">{activeThread.user.id.substring(0, 8)} • {activeThread.user.email}</span>
                    </div>
                  </div>

                  {/* Header Action Status Set */}
                  <div className="flex items-center gap-1.5 border border-gray-200 bg-gray-50 p-1 rounded-xl">
                    {(["Active", "Waiting", "Resolved"] as ChatStatus[]).map((st) => {
                      const active = activeThread.status === st;
                      return (
                        <button
                          key={st}
                          onClick={() => handleSetStatus(st)}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                            active
                              ? "bg-white text-gray-800 shadow-sm"
                              : "text-gray-400 hover:text-gray-650"
                          )}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Messages log list */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                  {activeThread.messages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-xs text-gray-400 font-semibold">
                      No message history in this thread.
                    </div>
                  )}
                  {activeThread.messages.map((msg) => {
                    const isAdmin = msg.sender === "Admin";
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex items-end gap-2.5 max-w-[80%]",
                          isAdmin ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                      >
                        {/* Avatar */}
                        <div className="h-7 w-7 rounded-lg bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-600 font-bold font-mono text-xs shrink-0 select-none">
                          {isAdmin ? "A" : activeThread.user.name[0]}
                        </div>

                        {/* Bubble */}
                        <div className="space-y-1">
                          <div
                            className={cn(
                              "p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm",
                              isAdmin
                                ? "text-white rounded-br-none"
                                : "bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200"
                            )}
                            style={isAdmin ? { background: BRAND_GRADIENT } : {}}
                          >
                            {msg.text}
                          </div>
                          <div className={cn(
                            "text-[8px] text-gray-400 font-bold font-mono flex items-center gap-1.5 mt-0.5",
                            isAdmin ? "justify-end" : "justify-start"
                          )}>
                            <span>{msg.timestamp}</span>
                            {isAdmin && (
                              <CheckCheck className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                activeThread.unreadCountUser === 0
                                  ? "text-sky-400 font-bold"
                                  : "text-white/40"
                              )} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </div>

                {/* Footer Message Compose Area */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex items-center gap-3">
                  <button
                    type="button"
                    className="h-10 w-10 flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
                    title="Attach Files"
                  >
                    <Paperclip className="h-4.5 w-4.5 stroke-[1.8]" />
                  </button>

                  <input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your message..."
                    className="h-10 flex-1 px-4 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 text-gray-800 placeholder:text-gray-400 bg-gray-50/20"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="h-10 px-4.5 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    style={{ background: BRAND_GRADIENT }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 font-semibold text-xs">
                Select a conversation thread to start chatting.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}


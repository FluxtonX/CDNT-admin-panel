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
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { USERS_DATA, type AdminUser } from "@/lib/data/users";

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
  lastMessageTime: string;
  messages: Message[];
};

const BRAND_GRADIENT = "linear-gradient(135deg, #0A3D91 0%, #1650AB 100%)";

const INITIAL_THREADS: ChatThread[] = [
  {
    threadId: "CHT-101",
    user: USERS_DATA.find((u) => u.id === "USR-2024-12458") || USERS_DATA[0],
    status: "Active",
    unreadCount: 2,
    lastMessageTime: "11:30 a.m.",
    messages: [
      { id: "m1", sender: "Client", text: "Hello, I made a withdrawal request 2 hours ago.", timestamp: "11:28 a.m." },
      { id: "m2", sender: "Client", text: "I need help with my withdrawal, it's still pending.", timestamp: "11:30 a.m." },
    ],
  },
  {
    threadId: "CHT-102",
    user: USERS_DATA.find((u) => u.id === "USR-2024-12457") || USERS_DATA[1],
    status: "Waiting",
    unreadCount: 1,
    lastMessageTime: "11:15 a.m.",
    messages: [
      { id: "m3", sender: "Client", text: "When will my KYC be approved?", timestamp: "11:15 a.m." },
    ],
  },
  {
    threadId: "CHT-103",
    user: USERS_DATA.find((u) => u.id === "USR-2024-12456") || USERS_DATA[2],
    status: "Resolved",
    unreadCount: 0,
    lastMessageTime: "10:00 a.m.",
    messages: [
      { id: "m4", sender: "Client", text: "Can you clarify the fees?", timestamp: "09:50 a.m." },
      { id: "m5", sender: "Admin", text: "Withdrawal fees are 0.5% for CAD Interac and network fees apply for crypto.", timestamp: "09:55 a.m." },
      { id: "m6", sender: "Client", text: "Thank you for your help!", timestamp: "10:00 a.m." },
    ],
  },
];

const getContextualReply = (messageText: string, thread: ChatThread): string => {
  const text = messageText.toLowerCase();
  const threadId = thread.threadId;

  const isKyc = threadId === "CHT-102" || text.includes("kyc") || text.includes("document") || text.includes("id ") || text.includes("passport") || text.includes("photo") || text.includes("utility") || text.includes("verification");
  const isFinance = threadId === "CHT-101" || text.includes("withdrawal") || text.includes("payout") || text.includes("interac") || text.includes("transaction") || text.includes("wallet") || text.includes("money") || text.includes("transfer") || text.includes("sent") || text.includes("btc") || text.includes("crypto") || text.includes("fee") || text.includes("charge");

  if (text.includes("hello") || text.includes("hi ") || text.startsWith("hi") || text.includes("hey") || text.includes("greetings")) {
    if (isKyc) return "Hi! Yes, I wanted to ask when my KYC verification will be approved. It has been pending since yesterday.";
    if (isFinance) return "Hello! Thanks for replying. I'm checking on my pending withdrawal request. Can you help me check if it's processed?";
    return "Hello! Thanks for reaching out. I have a question regarding my account.";
  }

  if (text.includes("approve") || text.includes("approved") || text.includes("verified") || text.includes("success") || text.includes("done") || text.includes("processed") || text.includes("complete") || text.includes("sent")) {
    if (isKyc) return "Awesome! Thank you so much for verifying my account. I will log in now and check the dashboard.";
    if (isFinance) return "Perfect! I see the transaction is marked as completed on the dashboard. I'll check my wallet/bank account. Thank you for the quick transfer.";
    return "Thank you! I see that it has been updated now. I appreciate the fast support.";
  }

  if (text.includes("reject") || text.includes("decline") || text.includes("fail") || text.includes("error") || text.includes("invalid") || text.includes("denied")) {
    if (isKyc) return "Oh, I see. What was the exact reason for rejection? Should I re-upload a higher quality scan of my ID?";
    if (isFinance) return "Oh no, why did the payout fail? Should I check my banking details or Interac email again?";
    return "That's unfortunate. Could you explain what went wrong and how I can fix it?";
  }

  if (text.includes("upload") || text.includes("re-upload") || text.includes("send ") || text.includes("attach") || text.includes("clearer") || text.includes("quality") || text.includes("bill") || text.includes("passport")) {
    return "Understood. I will take a new, high-quality picture of my document and upload it right away through the portal.";
  }

  if (text.includes("fee") || text.includes("charge") || text.includes("cost") || text.includes("percentage") || text.includes("percent")) {
    return "Understood, that makes sense. Thank you for explaining the transaction fees.";
  }

  if (text.includes("wait") || text.includes("delay") || text.includes("pending") || text.includes("process") || text.includes("hour") || text.includes("minute") || text.includes("day") || text.includes("time")) {
    return "Okay, I will wait for updates. Please keep me posted once it is processed.";
  }

  if (text.includes("anything else") || text.includes("help you with") || text.includes("further questions") || text.includes("resolved") || text.includes("have a great day") || text.includes("bye")) {
    return "No, that's all. You've answered everything. Thanks again for your great help!";
  }

  if (isKyc) return "Thank you for checking that. I hope my KYC verification gets cleared soon so I can start trading.";
  if (isFinance) return "I appreciate you looking into this transaction. It's important for me to get this payout settled.";

  return "Thanks for the details. I will follow your instructions and let you know if I run into any issues.";
};


function StatusIndicator({ status }: { status: ChatStatus }) {
  const map: Record<ChatStatus, string> = {
    Active: "bg-green-500",
    Waiting: "bg-amber-500",
    Resolved: "bg-gray-400",
  };
  return <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", map[status])} />;
}

export default function LiveChatSupportPage() {
  const [threads, setThreads] = useState<ChatThread[]>(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string>("CHT-101");
  const [search, setSearch] = useState("");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* Simulated Loading */
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  /* Get Active Thread */
  const activeThread = useMemo(() => {
    return threads.find((t) => t.threadId === activeThreadId) || null;
  }, [threads, activeThreadId]);

  /* Clear Unread Badge when selecting a thread */
  useEffect(() => {
    if (activeThreadId) {
      setThreads((current) =>
        current.map((t) =>
          t.threadId === activeThreadId ? { ...t, unreadCount: 0 } : t
        )
      );
    }
  }, [activeThreadId]);

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
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeThread) return;

    const messageText = inputText.trim();
    setInputText("");

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: "Admin",
      text: messageText,
      timestamp: timeString,
    };

    // Append message to active thread
    setThreads((current) =>
      current.map((t) => {
        if (t.threadId === activeThread.threadId) {
          return {
            ...t,
            lastMessageTime: timeString,
            messages: [...t.messages, newMsg],
          };
        }
        return t;
      })
    );

    // Simulate real-time Client reply
    const activeId = activeThread.threadId;
    const clientName = activeThread.user.name;

    // Phase 1: Show "User is typing..." indicator after 1.5s
    setTimeout(() => {
      setTypingUser(clientName);
    }, 1500);

    // Phase 2: Dispatch reply after 3s total
    setTimeout(() => {
      const replyText = getContextualReply(messageText, activeThread);
      const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const replyMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: "Client",
        text: replyText,
        timestamp: replyTime,
      };

      setThreads((current) =>
        current.map((t) => {
          if (t.threadId === activeId) {
            // If user is currently looking at this thread, keep unread count at 0
            const isViewing = activeThreadId === activeId;
            return {
              ...t,
              lastMessageTime: replyTime,
              unreadCount: isViewing ? 0 : t.unreadCount + 1,
              messages: [...t.messages, replyMsg],
            };
          }
          return t;
        })
      );

      setTypingUser(null);
    }, 3200);
  };

  /* Toggle Chat Status override */
  const handleSetStatus = (status: ChatStatus) => {
    if (!activeThread) return;
    setThreads((current) =>
      current.map((t) =>
        t.threadId === activeThread.threadId ? { ...t, status } : t
      )
    );
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
                          <span className="text-[9px] text-gray-400 font-mono uppercase tracking-tight">{thread.user.id}</span>
                          {thread.status === "Waiting" && (
                            <span className="text-[8px] bg-amber-50 text-amber-700 font-bold uppercase px-1 rounded">waiting</span>
                          )}
                        </div>
                      </div>

                      {/* Unread badge */}
                      {thread.unreadCount > 0 && (
                        <span className="h-5 w-5 rounded-full bg-red-650 text-white font-mono font-black text-[9px] flex items-center justify-center shrink-0 shadow-sm animate-pulse">
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
                        <h4 className="font-bold text-gray-950 text-sm leading-none">{activeThread.user.name}</h4>
                        <span className="flex items-center gap-1 bg-gray-100 text-gray-500 font-bold uppercase px-2 py-0.5 rounded-full text-[9px] tracking-wide border border-gray-150 font-mono">
                          <StatusIndicator status={activeThread.status} />
                          {activeThread.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono mt-1 block">{activeThread.user.id} • {activeThread.user.email}</span>
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
                                : "bg-white text-gray-800 rounded-bl-none border border-gray-150"
                            )}
                            style={isAdmin ? { background: BRAND_GRADIENT } : {}}
                          >
                            {msg.text}
                          </div>
                          <span className={cn(
                            "text-[8px] text-gray-400 font-bold font-mono block",
                            isAdmin ? "text-right" : "text-left"
                          )}>
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {typingUser && (
                    <div className="flex items-center gap-2.5 mr-auto max-w-[80%]">
                      <div className="h-7 w-7 rounded-lg bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-600 font-bold font-mono text-xs shrink-0 select-none animate-pulse">
                        {activeThread.user.name[0]}
                      </div>
                      <div className="bg-white border border-gray-150 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}

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

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, BellRing, Volume2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendDesktopNotification,
  soundManager,
} from "@/lib/notifications";

export function SupportNotificationWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [dismissBanner, setDismissBanner] = useState(false);
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) return;

    const currentPerm = getNotificationPermission();
    setPermission(currentPerm);

    // If permission is default and user hasn't dismissed before in this session
    if (currentPerm === "default") {
      const dismissed = sessionStorage.getItem("cdnt_notif_banner_dismissed");
      if (!dismissed) {
        setShowPromptBanner(true);
      }
    }
  }, []);

  // Real-time Global Message & Thread Listener
  useEffect(() => {
    const channel = supabase
      .channel("global_support_alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        async (payload) => {
          const newMsg = payload.new as any;
          // Only notify for messages from clients
          if (newMsg.sender !== "Client") return;

          try {
            // Fetch thread details to know the user & ticket
            const { data: thread } = await supabase
              .from("support_threads")
              .select("id, user_id, ticket_id, category")
              .eq("id", newMsg.thread_id)
              .maybeSingle();

            let senderName = "Client";
            if (thread?.user_id) {
              try {
                const res = await fetch(`/api/support/users?ids=${thread.user_id}`);
                if (res.ok) {
                  const users = await res.json();
                  if (users && users.length > 0) {
                    senderName = users[0].full_name || users[0].email || "Client";
                  }
                }
              } catch {
                // fallback
              }
            }

            const ticketLabel = thread?.ticket_id ? ` (#${thread.ticket_id})` : "";
            const categoryLabel = thread?.category ? ` [${thread.category}]` : "";

            sendDesktopNotification({
              title: `💬 New Message: ${senderName}${ticketLabel}`,
              body: `${categoryLabel ? categoryLabel + "\n" : ""}${newMsg.text || "Sent a message"}`,
              tag: `thread-${newMsg.thread_id}`,
              onClick: () => {
                router.push(`/dashboard/live-chat?thread=${newMsg.thread_id}`);
              },
              playSound: true,
            });
          } catch (err) {
            console.error("Error handling support notification:", err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, pathname]);

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    setShowPromptBanner(false);
    if (perm === "granted") {
      sendDesktopNotification({
        title: "🔔 Notifications Enabled!",
        body: "You will now receive desktop alerts & sound chimes when clients message.",
        tag: "cdnt-welcome",
        playSound: true,
      });
    }
  };

  const handleDismiss = () => {
    setDismissBanner(true);
    setShowPromptBanner(false);
    sessionStorage.setItem("cdnt_notif_banner_dismissed", "true");
  };

  const handleTestSound = () => {
    soundManager.play();
  };

  if (!showPromptBanner || dismissBanner || permission === "granted") {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm z-50">
      <div className="flex items-center gap-2.5">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-700/60 text-blue-200">
          <BellRing className="h-4 w-4 animate-pulse" />
        </div>
        <div>
          <span className="font-bold">Enable Desktop Notifications:</span>{" "}
          <span className="text-blue-100 text-xs hidden sm:inline">
            Get instant PC pop-up alerts and audio chimes whenever clients reply or open support tickets.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleTestSound}
          className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-800/80 hover:bg-blue-700 text-blue-200 text-xs font-semibold transition-colors"
          title="Test audio chime"
        >
          <Volume2 className="h-3.5 w-3.5" />
          Test Sound
        </button>
        <button
          onClick={handleEnableNotifications}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 shadow-sm transition-all cursor-pointer"
        >
          <Bell className="h-3.5 w-3.5" />
          Enable Notifications
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

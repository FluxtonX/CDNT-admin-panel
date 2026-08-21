"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendDesktopNotification,
} from "@/lib/notifications";

export function SupportNotificationWatcher() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 1. Auto-request native browser permission on first user interaction (required by browser security policies)
  useEffect(() => {
    if (!isNotificationSupported()) return;

    const askPermissionOnGesture = async () => {
      if (getNotificationPermission() === "default") {
        try {
          await requestNotificationPermission();
        } catch {
          // ignore
        }
      }
    };

    // Try immediately (in case browser allows it)
    if (getNotificationPermission() === "default") {
      askPermissionOnGesture();
    }

    // Also attach to first user gesture (Chrome / Safari strictly require a click or keydown to display the permission dialog)
    window.addEventListener("click", askPermissionOnGesture, { once: true });
    window.addEventListener("keydown", askPermissionOnGesture, { once: true });

    return () => {
      window.removeEventListener("click", askPermissionOnGesture);
      window.removeEventListener("keydown", askPermissionOnGesture);
    };
  }, []);

  // 2. Real-time Listener for ALL Admin Notifications & Client Support Messages
  useEffect(() => {
    // A. Listen for Client Support Messages
    const supportChannel = supabase
      .channel("global_support_messages_alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender !== "Client") return;

          try {
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
                // ignore
              }
            }

            const ticketLabel = thread?.ticket_id ? ` (#${thread.ticket_id})` : "";
            const categoryLabel = thread?.category ? ` [${thread.category}]` : "";

            sendDesktopNotification({
              title: `💬 New Message: ${senderName}${ticketLabel}`,
              body: `${categoryLabel ? categoryLabel + "\n" : ""}${newMsg.text || "Sent a new message"}`,
              tag: `support-${newMsg.thread_id}`,
              onClick: () => {
                router.push(`/dashboard/live-chat?thread=${newMsg.thread_id}`);
              },
              playSound: true,
            });
          } catch (err) {
            console.error("Error displaying support notification:", err);
          }
        }
      )
      .subscribe();

    // B. Listen for Platform Admin Notifications (Local bank, deposits, withdrawals, KYC, etc.)
    const adminNotifChannel = supabase
      .channel("global_admin_platform_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = payload.new as any;
          
          // Trigger for admin-audience notifications or general platform notifications
          const isForAdmin =
            !newNotif.user_id ||
            newNotif.audience === "Admin" ||
            newNotif.audience === "admin" ||
            newNotif.type === "ADMIN_ALERT" ||
            newNotif.type === "BANK_ACCOUNT_CREATED" ||
            newNotif.type === "DEPOSIT" ||
            newNotif.type === "WITHDRAWAL";

          if (isForAdmin) {
            // Update Header notification badge
            queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });

            sendDesktopNotification({
              title: `🔔 ${newNotif.title || "New Admin Notification"}`,
              body: newNotif.message || "New activity recorded on the platform",
              tag: `notif-${newNotif.id}`,
              onClick: () => {
                if (newNotif.link) {
                  router.push(newNotif.link);
                } else if (newNotif.title?.toLowerCase().includes("bank")) {
                  router.push("/dashboard/bank-accounts");
                } else if (newNotif.title?.toLowerCase().includes("withdraw")) {
                  router.push("/dashboard/withdrawals");
                } else if (newNotif.title?.toLowerCase().includes("deposit")) {
                  router.push("/dashboard/transactions");
                } else {
                  router.push("/dashboard/notifications");
                }
              },
              playSound: true,
            });
          }
        }
      )
      .subscribe();

    // C. Listen for direct User Bank Account Submissions
    const bankChannel = supabase
      .channel("global_bank_account_alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_bank_accounts",
        },
        (payload) => {
          const newBank = payload.new as any;
          queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });

          sendDesktopNotification({
            title: "🏦 New Bank Account Added",
            body: `Bank: ${newBank.bank_name || "Bank Account"} (${newBank.account_holder_name || "User"})`,
            tag: `bank-${newBank.id}`,
            onClick: () => {
              router.push("/dashboard/bank-accounts");
            },
            playSound: true,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(supportChannel);
      supabase.removeChannel(adminNotifChannel);
      supabase.removeChannel(bankChannel);
    };
  }, [router, queryClient]);

  // Headless component - no visible UI banners
  return null;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ShieldCheck, ArrowDownToLine,
  ArrowLeftRight, Wallet, PieChart, Banknote, Bell,
  MessageCircle, BarChart3, UserCog, ShieldAlert, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "dashboard",     label: "Dashboard",           href: "/dashboard",              icon: LayoutDashboard },
  { id: "users",         label: "Users",                href: "/dashboard/users",         icon: Users },
  { id: "kyc",           label: "KYC Verification",    href: "/dashboard/kyc",           icon: ShieldCheck },
  { id: "withdrawals",   label: "Withdrawal Requests", href: "/dashboard/withdrawals",   icon: ArrowDownToLine },
  { id: "transactions",  label: "Transactions",         href: "/dashboard/transactions",  icon: ArrowLeftRight },
  { id: "wallets",       label: "Wallets",              href: "/dashboard/wallets",       icon: Wallet },
  { id: "portfolio",     label: "Portfolio Management", href: "/dashboard/portfolio",     icon: PieChart },
  { id: "interac",       label: "Interac Payouts",      href: "/dashboard/interac",       icon: Banknote },
  { id: "notifications", label: "Notifications",        href: "/dashboard/notifications", icon: Bell },
  { id: "live-chat",     label: "Live Chat",            href: "/dashboard/live-chat",     icon: MessageCircle },
  { id: "reports",       label: "Reports & Analytics",  href: "/dashboard/reports",       icon: BarChart3 },
  { id: "admin-roles",   label: "Admin Roles",          href: "/dashboard/admin-roles",   icon: UserCog },
  { id: "security",      label: "Security Logs",        href: "/dashboard/security",      icon: ShieldAlert },
  { id: "settings",      label: "Settings",             href: "/dashboard/settings",      icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-[220px] shrink-0 h-screen sticky top-0 bg-white border-r border-gray-200 overflow-hidden z-30">
      {/* Brand */}
      <div className="flex flex-col px-4 py-5 border-b border-gray-100 gap-1.5 justify-center">
        <img
          src="/CDNTlogo.png"
          alt="CDNT Logo"
          className="h-9 w-auto object-contain self-start"
        />
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5">Admin Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group",
                isActive
                  ? "text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              style={
                isActive
                  ? { background: "linear-gradient(135deg, #0A3D91 0%, #1650AB 100%)" }
                  : {}
              }
            >
              <Icon
                className={cn("h-[15px] w-[15px] shrink-0", isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600")}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

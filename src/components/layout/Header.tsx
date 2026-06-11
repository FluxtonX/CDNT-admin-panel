"use client";

import { Search, Bell, ChevronDown, Menu } from "lucide-react";

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 px-5 py-3 bg-white border-b border-gray-200 shrink-0">
      {/* Menu toggle for mobile screens */}
      <button
        onClick={onMenuToggle}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        aria-label="Toggle Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users, transactions, requests..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Notification bell */}
        <button
          aria-label="Notifications"
          className="relative h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
        </button>

        {/* User info */}
        <div className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors">
          <div className="h-8 w-8 rounded-full bg-orange-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
            AD
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-none">Admin User</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-none">Super Admin</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden sm:block" />
        </div>
      </div>
    </header>
  );
}

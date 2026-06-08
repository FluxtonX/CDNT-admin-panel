"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Lock,
  Shield,
  Activity,
  Search,
  Download,
  ChevronDown,
  Calendar,
  X,
  Eye,
  LogIn,
  SlidersHorizontal,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type LogCategory = "Auth" | "Account" | "Transaction" | "Admin" | "Security" | "Kyc";
type LogSeverity = "Info" | "Warning" | "Critical";

type SecurityLog = {
  id: string;
  timestamp: string;
  action: string;
  category: LogCategory;
  severity: LogSeverity;
  user: string;
  userId: string;
  ipAddress: string;
  details: string;
  userAgent: string;
  performedByAdmin?: string; // e.g. "ADM-001"
};

// Initial Mock logs matching the screenshots exactly + additional entries for a rich logs list
const INITIAL_LOGS: SecurityLog[] = [
  {
    id: "LOG-2024-54321",
    timestamp: "Jun 2, 2026, 11:30:00 a.m.",
    action: "Failed Login Attempt",
    category: "Auth",
    severity: "Warning",
    user: "James Wilson",
    userId: "USR-2024-12455",
    ipAddress: "192.168.1.100",
    details: "Incorrect password - 3rd failed attempt",
    userAgent: "Chrome 126.0 (Windows)"
  },
  {
    id: "LOG-2024-54320",
    timestamp: "Jun 2, 2026, 11:15:00 a.m.",
    action: "Account Frozen",
    category: "Admin",
    severity: "Critical",
    user: "Olivia Martinez",
    userId: "USR-2024-12454",
    ipAddress: "10.0.0.1",
    details: "Account frozen due to suspicious activity",
    userAgent: "Admin Portal",
    performedByAdmin: "ADM-001"
  },
  {
    id: "LOG-2024-54319",
    timestamp: "Jun 2, 2026, 10:45:00 a.m.",
    action: "Withdrawal Request",
    category: "Transaction",
    severity: "Warning",
    user: "Olivia Martinez",
    userId: "USR-2024-12454",
    ipAddress: "192.168.1.100",
    details: "Withdrawal of $12,500 CAD requested via Interac",
    userAgent: "Safari 17.4 (macOS)"
  },
  {
    id: "LOG-2024-54318",
    timestamp: "Jun 2, 2026, 10:30:00 a.m.",
    action: "2FA Disabled",
    category: "Security",
    severity: "Critical",
    user: "Emma Thompson",
    userId: "USR-2024-12456",
    ipAddress: "192.168.1.100",
    details: "Two-factor authentication disabled via email confirmation bypass",
    userAgent: "Firefox 125.0 (Ubuntu Linux)"
  },
  {
    id: "LOG-2024-54317",
    timestamp: "Jun 2, 2026, 09:15:00 a.m.",
    action: "KYC Documents Approved",
    category: "Kyc",
    severity: "Info",
    user: "Marcus Chen",
    userId: "USR-2024-12457",
    ipAddress: "10.0.0.1",
    details: "Identity verification documents checked and cleared",
    userAgent: "Admin Portal",
    performedByAdmin: "ADM-002"
  },
  {
    id: "LOG-2024-54316",
    timestamp: "Jun 2, 2026, 08:00:00 a.m.",
    action: "API Key Created",
    category: "Security",
    severity: "Info",
    user: "James Wilson",
    userId: "USR-2024-12455",
    ipAddress: "192.168.1.100",
    details: "Read-only API access key generated",
    userAgent: "Chrome 126.0 (Windows)"
  },
  {
    id: "LOG-2024-54315",
    timestamp: "Jun 1, 2026, 05:40:00 p.m.",
    action: "Wallet Override Applied",
    category: "Admin",
    severity: "Critical",
    user: "Emma Thompson",
    userId: "USR-2024-12456",
    ipAddress: "10.0.0.1",
    details: "Hot wallet withdrawal limits modified by administrative request",
    userAgent: "Admin Portal",
    performedByAdmin: "ADM-001"
  }
];

const BRAND_GRADIENT = "linear-gradient(135deg, #0A3D91 0%, #1650AB 100%)";

export default function SecurityLogsAuditTrailPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("All");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState("Today");
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simulated mount loading (700ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExport = () => {
    if (exporting) return;
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      triggerToast("Security Audit Trail downloaded as audit-trail-report.csv");
    }, 1200);
  };

  const selectDateRange = (range: string) => {
    setDateRange(range);
    setIsDateDropdownOpen(false);
    triggerToast(`Filter applied: ${range}`);
  };

  // Category Icon Resolver
  const CategoryIcon = ({ cat }: { cat: LogCategory }) => {
    switch (cat) {
      case "Auth":
        return <LogIn className="h-3.5 w-3.5" />;
      case "Admin":
        return <Shield className="h-3.5 w-3.5" />;
      case "Transaction":
        return <Activity className="h-3.5 w-3.5" />;
      case "Security":
        return <Lock className="h-3.5 w-3.5" />;
      case "Account":
        return <LogIn className="h-3.5 w-3.5" />; // fallback
      case "Kyc":
        return <ShieldAlert className="h-3.5 w-3.5" />;
    }
  };

  // Category Colors Resolver
  const categoryStyles: Record<LogCategory, string> = {
    Auth: "bg-purple-50 text-purple-700 border-purple-100",
    Admin: "bg-blue-50 text-blue-700 border-blue-100",
    Transaction: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Security: "bg-indigo-50 text-indigo-700 border-indigo-100",
    Account: "bg-pink-50 text-pink-700 border-pink-100",
    Kyc: "bg-amber-50 text-amber-700 border-amber-100"
  };

  // Severity Colors Resolver
  const severityStyles: Record<LogSeverity, string> = {
    Info: "bg-gray-100 text-gray-700 border-gray-200",
    Warning: "bg-amber-50 text-amber-700 border-amber-200",
    Critical: "bg-red-50 text-red-700 border-red-200"
  };

  // Filtering Logic
  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return INITIAL_LOGS.filter((log) => {
      // Search matches
      const matchesSearch =
        !q ||
        log.id.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q) ||
        log.userId.toLowerCase().includes(q) ||
        log.ipAddress.toLowerCase().includes(q);

      // Category matches
      const matchesCategory =
        selectedCategory === "All" || log.category === selectedCategory;

      // Severity matches
      const matchesSeverity =
        selectedSeverity === "All" || log.severity === selectedSeverity;

      return matchesSearch && matchesCategory && matchesSeverity;
    });
  }, [search, selectedCategory, selectedSeverity]);

  // Selected Log Details Object
  const selectedLog = useMemo(() => {
    return INITIAL_LOGS.find((l) => l.id === selectedLogId) || null;
  }, [selectedLogId]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-lg text-xs font-semibold text-gray-800"
          >
            <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 leading-tight">Security Logs & Audit Trail</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor security events and audit all platform activities</p>
        </div>

        {/* Export & Calendar Filters */}
        <div className="flex items-center gap-3">
          {/* Calendar Selector */}
          <div className="relative">
            <button
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="flex items-center gap-2 px-4 h-10 border border-gray-200 rounded-xl bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer select-none"
            >
              <Calendar className="h-4 w-4 text-gray-400" />
              {dateRange}
              <ChevronDown className="h-4 w-4 text-gray-400 transition-transform" style={{ transform: isDateDropdownOpen ? "rotate(180deg)" : "rotate(0)" }} />
            </button>
            <AnimatePresence>
              {isDateDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-35" onClick={() => setIsDateDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-40"
                  >
                    {["Today", "Yesterday", "Last 7 Days", "Last 30 Days"].map((r) => (
                      <button
                        key={r}
                        onClick={() => selectDateRange(r)}
                        className={cn(
                          "w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors",
                          dateRange === r ? "text-blue-600 bg-blue-50/20" : "text-gray-500"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Export Action */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4.5 h-10 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
            style={{ background: BRAND_GRADIENT }}
          >
            {exporting ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm h-28 animate-pulse" />
          ))
        ) : (
          <>
            {/* Critical Events */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider font-mono">Critical Events</span>
                <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-gray-900 leading-none">3</p>
                <p className="text-[10px] text-red-600 font-extrabold mt-1.5 uppercase tracking-wide">Requires immediate attention</p>
              </div>
            </div>

            {/* Warnings */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider font-mono">Warnings</span>
                <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-gray-900 leading-none">2</p>
                <p className="text-[10px] text-amber-600 font-extrabold mt-1.5 uppercase tracking-wide">Monitor closely</p>
              </div>
            </div>

            {/* Auth Failures */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider font-mono">Auth Failures</span>
                <div className="h-9 w-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                  <Lock className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-gray-900 leading-none">2</p>
                <p className="text-[10px] text-gray-400 font-bold mt-1.5 font-mono">Last 24 hours</p>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider font-mono">Admin Actions</span>
                <div className="h-9 w-9 rounded-xl bg-blue-50/70 flex items-center justify-center text-blue-600 border border-blue-100">
                  <Shield className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-gray-900 leading-none">1</p>
                <p className="text-[10px] text-gray-400 font-bold mt-1.5 font-mono">Last 24 hours</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Advanced Filtering & Search */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, user, ID, or IP address..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-xs font-semibold text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50"
          />
        </div>

        {/* Filter Badges Row */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          {/* Category */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-extrabold text-gray-700 mr-1">Category:</span>
            {["All", "Auth", "Account", "Transaction", "Admin", "Security", "Kyc"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer",
                  selectedCategory === cat
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Severity */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-extrabold text-gray-700 mr-1">Severity:</span>
            {["All", "Info", "Warning", "Critical"].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer",
                  selectedSeverity === sev
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Action</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Severity</th>
                <th className="py-4 px-6">User</th>
                <th className="py-4 px-6">IP Address</th>
                <th className="py-4 px-6 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 w-32 bg-gray-100 rounded" /></td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-28 bg-gray-100 rounded mb-1" />
                      <div className="h-3 w-20 bg-gray-50 rounded" />
                    </td>
                    <td className="py-4 px-6"><div className="h-6 w-16 bg-gray-100 rounded" /></td>
                    <td className="py-4 px-6"><div className="h-6 w-16 bg-gray-100 rounded" /></td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-24 bg-gray-100 rounded mb-1" />
                      <div className="h-3 w-16 bg-gray-50 rounded" />
                    </td>
                    <td className="py-4 px-6"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                    <td className="py-4 px-6"><div className="h-8 w-8 bg-gray-100 rounded-full mx-auto" /></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center font-bold text-gray-400">
                    No security audit logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLogId(log.id)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    {/* Timestamp */}
                    <td className="py-4.5 px-6 font-mono text-[11px] text-gray-500 font-bold whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    {/* Action & ID */}
                    <td className="py-4.5 px-6">
                      <p className="font-extrabold text-gray-900 leading-tight">{log.action}</p>
                      <span className="text-[10px] text-gray-500 font-mono mt-0.5 block font-bold">{log.id}</span>
                    </td>

                    {/* Category */}
                    <td className="py-4.5 px-6 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold font-mono uppercase",
                        categoryStyles[log.category]
                      )}>
                        <CategoryIcon cat={log.category} />
                        {log.category}
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="py-4.5 px-6 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-extrabold uppercase",
                        severityStyles[log.severity]
                      )}>
                        {log.severity}
                      </span>
                    </td>

                    {/* User & UserID */}
                    <td className="py-4.5 px-6">
                      <p className="font-extrabold text-gray-900 leading-tight">{log.user}</p>
                      <span className="text-[10px] text-gray-500 font-mono mt-0.5 block font-bold">{log.userId}</span>
                    </td>

                    {/* IP Address */}
                    <td className="py-4.5 px-6 font-mono font-bold text-gray-500 whitespace-nowrap">
                      {log.ipAddress}
                    </td>

                    {/* Review icon */}
                    <td className="py-4.5 px-6 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedLogId(log.id)}
                        className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors mx-auto cursor-pointer"
                        title="View Log Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Log Details Modal */}
      <AnimatePresence>
        {selectedLogId && selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-6 shadow-xl space-y-5 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base leading-none">Security Log Details</h3>
                  <span className="text-[10px] text-gray-500 font-mono mt-1.5 block font-bold">{selectedLog.id}</span>
                </div>
                <button
                  onClick={() => setSelectedLogId(null)}
                  className="p-1 text-gray-400 hover:text-gray-750 hover:bg-gray-50 rounded-lg cursor-pointer shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Badges Row */}
              <div className="flex items-center gap-2">
                {/* Category */}
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-bold font-mono uppercase",
                  categoryStyles[selectedLog.category]
                )}>
                  <CategoryIcon cat={selectedLog.category} />
                  {selectedLog.category}
                </span>

                {/* Severity */}
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded border text-[10px] font-extrabold uppercase",
                  severityStyles[selectedLog.severity]
                )}>
                  {selectedLog.severity}
                </span>
              </div>

              {/* Action Title */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider font-mono">Action</span>
                <h4 className="text-base font-black text-gray-900">{selectedLog.action}</h4>
              </div>

              {/* Details Text */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider font-mono">Details</span>
                <p className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-100 rounded-xl p-3.5 leading-relaxed">
                  {selectedLog.details}
                </p>
              </div>

              {/* Grid Metadata details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* User */}
                <div>
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider font-mono">User</span>
                  <p className="font-extrabold text-gray-900 mt-0.5 leading-tight">{selectedLog.user}</p>
                  <span className="text-[9px] text-gray-500 font-mono font-bold mt-0.5 block">{selectedLog.userId}</span>
                </div>

                {/* Timestamp */}
                <div>
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider font-mono">Timestamp</span>
                  <p className="font-bold font-mono text-gray-800 mt-0.5">{selectedLog.timestamp}</p>
                </div>

                {/* IP Address */}
                <div>
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider font-mono">IP Address</span>
                  <p className="font-bold font-mono text-gray-800 mt-0.5">{selectedLog.ipAddress}</p>
                </div>

                {/* User Agent */}
                <div>
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider font-mono">User Agent</span>
                  <p className="font-bold text-gray-800 mt-0.5">{selectedLog.userAgent}</p>
                </div>
              </div>

              {/* Conditional Admin Warning Box Banner */}
              {selectedLog.performedByAdmin && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1">
                  <p className="text-xs font-black text-blue-700">Admin Action</p>
                  <p className="text-[10px] text-blue-600 font-semibold">
                    Performed by Admin User ({selectedLog.performedByAdmin})
                  </p>
                </div>
              )}

              {/* Close Button */}
              <div className="pt-2">
                <button
                  onClick={() => setSelectedLogId(null)}
                  className="w-full h-10 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition-colors cursor-pointer flex items-center justify-center"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

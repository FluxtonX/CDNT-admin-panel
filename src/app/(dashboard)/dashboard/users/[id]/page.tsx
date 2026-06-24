"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { RequirePermission } from "@/components/layout/RequirePermission";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, FileEdit, Download, Lock, Unlock,
  CheckCircle2, Clock, XCircle, AlertTriangle, Shield,
  User, Mail, Phone, Calendar, MapPin, Activity,
  Smartphone, Globe, Wallet, BarChart3, FileText,
  MessageCircle, History, Monitor, LogOut, RefreshCw,
  Eye,
} from "lucide-react";
import { cn, fetchLiveCADRates } from "@/lib/utils";
import { type KycStatus, type AccountStatus, type RiskLevel } from "@/lib/data/users";

export const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

/* ─── Badge helpers ──────────────────────────────────────────────── */
function KycBadge({ status }: { status: KycStatus }) {
  const map: Record<KycStatus, { cls: string; icon: React.ReactNode }> = {
    "Verified":    { cls: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2  className="h-3.5 w-3.5" /> },
    "Pending":     { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock         className="h-3.5 w-3.5" /> },
    "Rejected":    { cls: "bg-red-50   text-red-700   border-red-200",   icon: <XCircle       className="h-3.5 w-3.5" /> },
    "Not Started": { cls: "bg-gray-100 text-gray-600  border-gray-200",  icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  };
  const s = map[status] || map["Not Started"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border", s.cls)}>
      {s.icon}{status}
    </span>
  );
}

function AccountBadge({ status }: { status: AccountStatus }) {
  const map: Record<AccountStatus, string> = {
    "Active":    "bg-green-50 text-green-700 border-green-200",
    "Suspended": "bg-red-50   text-red-700   border-red-200",
    "Frozen":    "bg-blue-50  text-blue-700  border-blue-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border", map[status] || map["Active"])}>
      {status === "Frozen" && <Lock className="h-3.5 w-3.5" />}
      {status}
    </span>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const map: Record<RiskLevel, string> = {
    "Low Risk":    "bg-green-50 text-green-700 border-green-200",
    "Medium Risk": "bg-amber-50 text-amber-700 border-amber-200",
    "High Risk":   "bg-red-50   text-red-700   border-red-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border", map[level] || map["Low Risk"])}>
      {level === "High Risk" && <AlertTriangle className="h-3.5 w-3.5" />}
      {level}
    </span>
  );
}

/* ─── Info Field ─────────────────────────────────────────────────── */
function InfoField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-gray-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-600 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value || "N/A"}</p>
      </div>
    </div>
  );
}

/* ─── Tabs config ────────────────────────────────────────────────── */
const TABS = [
  { id: "overview",     label: "Overview",     icon: User },
  { id: "portfolio",    label: "Portfolio",    icon: BarChart3 },
  { id: "transactions", label: "Transactions", icon: Activity },
  { id: "security",     label: "Security",     icon: Shield },
  { id: "documents",    label: "Documents",    icon: FileText },
  { id: "support",      label: "Support",      icon: MessageCircle },
  { id: "audit-logs",   label: "Audit Logs",   icon: History },
];

/* ─── Freeze Account Modal ───────────────────────────────────────── */
function FreezeModal({ onConfirm, onClose }: { onConfirm: (r: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const hasError = touched && !reason.trim();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: "spring", damping: 28, stiffness: 340 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Lock className="h-6 w-6 text-amber-500" />
            </div>
            <div className="pt-0.5">
              <h2 className="text-[17px] font-bold text-gray-900">Freeze Account</h2>
              <p className="text-sm text-gray-600 mt-0.5">This action will suspend all account activity</p>
            </div>
          </div>
          <div className="mb-5">
            <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              Reason for freezing <span className="text-red-500">*</span>
            </label>
            <textarea rows={4} placeholder="Enter the reason for freezing this account..."
              value={reason}
              onChange={(e) => { setReason(e.target.value); setTouched(true); }}
              onBlur={() => setTouched(true)}
              className={cn("w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-500 outline-none resize-none transition-all",
                hasError ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100"
                         : "border-gray-200 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-50")}
            />
            {hasError && <p className="text-xs text-red-500 mt-1">Please provide a reason for freezing.</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => { setTouched(true); if (reason.trim()) onConfirm(reason); }}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
              style={{ background: "#F59E0B" }}>
              Freeze Account
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Add Admin Note Modal ───────────────────────────────────────── */
function NoteModal({ onConfirm, onClose }: { onConfirm: (n: string) => void; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const hasError = touched && !note.trim();

  const handleSubmit = async () => {
    setTouched(true);
    if (!note.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    onConfirm(note);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: "spring", damping: 28, stiffness: 340 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <FileEdit className="h-6 w-6 text-blue-600" />
            </div>
            <div className="pt-0.5">
              <h2 className="text-[17px] font-bold text-gray-900">Add Admin Note</h2>
              <p className="text-sm text-gray-600 mt-0.5">Internal note visible only to admins</p>
            </div>
          </div>
          <div className="mb-5">
            <textarea rows={4} placeholder="Enter your note..."
              value={note}
              onChange={(e) => { setNote(e.target.value); setTouched(true); }}
              className={cn("w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder:text-gray-500 outline-none resize-none transition-all",
                hasError ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-100"
                         : "border-gray-200 bg-blue-50/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-50")}
            />
            {hasError && <p className="text-xs text-red-500 mt-1">Please enter a note before saving.</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-70 transition-all"
              style={{ background: "linear-gradient(135deg,#0A3D91,#1650AB)" }}>
              {loading ? "Saving…" : "Add Note"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Tab Content Components ─────────────────────────────────────── */

function OverviewTab({ user }: { user: any }) {
  return (
    <div className="space-y-7">
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
          <InfoField icon={User}     label="Full Name"     value={user.name} />
          <InfoField icon={Calendar} label="Date of Birth" value={user.dateOfBirth} />
          <InfoField icon={Mail}     label="Email Address" value={user.email} />
          <InfoField icon={Phone}    label="Phone Number"  value={user.phone} />
        </div>
      </div>
      <div className="h-px bg-gray-100" />
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-4">Address Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
          <InfoField icon={MapPin} label="Street Address" value={user.street} />
          <InfoField icon={MapPin} label="City"           value={user.city} />
          <InfoField icon={MapPin} label="Postal Code"    value={user.postalCode} />
          <InfoField icon={Globe}  label="Country"        value={user.country} />
        </div>
      </div>
      <div className="h-px bg-gray-100" />
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
          <InfoField icon={Calendar}   label="Member Since"               value={user.joinedDate} />
          <InfoField icon={Activity}   label="Last Login"                 value={user.lastLogin} />
          <InfoField icon={Smartphone} label="Two-Factor Authentication"  value={user.twoFactor ? "Enabled" : "Disabled"} />
          <InfoField icon={Globe}      label="Last IP Address"            value={user.lastIp} />
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ user }: { user: any }) {
  const [sessions, setSessions] = useState(user.sessions || []);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState<string | null>(null);

  const handleRevoke = async (id: number) => {
    setRevoking(id);
    await new Promise((r) => setTimeout(r, 900));
    setSessions((prev: any) => prev.filter((s: any) => s.id !== id));
    setRevoking(null);
  };

  const handleAction = async (key: string) => {
    setActionLoading(key);
    try {
      const actionMap: Record<string, string> = { "2fa": "reset-2fa", "password": "force-password-reset" };
      await fetch(`/api/users/${user.id}/security`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionMap[key] })
      });
      setActionDone(key);
    } catch(e) {
      console.error(e);
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionDone(null), 3000);
    }
  };

  return (
    <div className="space-y-7">
      {/* Active Sessions */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-4">Active Sessions</h3>
        {(!sessions || sessions.length === 0) && (
          <p className="text-sm text-gray-600 mb-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100">Sessions will appear here once the user_sessions table tracks active logins.</p>
        )}
        <div className="space-y-3">
          {sessions.map((session: any) => {
            const Icon = Monitor; // Default since icons are not saved in db
            return (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">{session.device || "Unknown Device"}</span>
                      {session.current && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{session.location || "Unknown"} • {session.ip || "Unknown"}</p>
                    <p className="text-xs text-gray-600 mt-0.5">Last active: {formatDate(session.last_active || session.created_at)}</p>
                  </div>
                </div>
                {!session.current && (
                  <button
                    onClick={() => handleRevoke(session.id)}
                    disabled={revoking === session.id}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-60 shrink-0"
                  >
                    {revoking === session.id ? (
                      <span className="h-3.5 w-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5" />
                    )}
                    Revoke
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Security Actions */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-4">Security Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: "2fa",      icon: RefreshCw, title: "Reset 2FA",           desc: "Disable two-factor authentication" },
            { key: "password", icon: Lock,      title: "Force Password Reset", desc: "Require new password on login" },
          ].map((action) => {
            const Icon = action.icon;
            const isLoading = actionLoading === action.key;
            const isDone    = actionDone    === action.key;
            return (
              <button
                key={action.key}
                onClick={() => handleAction(action.key)}
                disabled={isLoading || isDone}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-left group disabled:opacity-70"
              >
                <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                  {isLoading ? (
                    <span className="h-4 w-4 border-2 border-gray-400 border-t-blue-600 rounded-full animate-spin" />
                  ) : isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Icon className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {isDone ? "Done!" : action.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{action.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TransactionsTab({ user }: { user: any }) {
  const [cadRates, setCadRates] = useState<{ btcCAD: number; ethCAD: number; usdtCAD: number } | null>(null);
  useEffect(() => { fetchLiveCADRates().then(setCadRates); }, []);

  const getCadValue = (amount: number, currency: string) => {
    if (!cadRates) return amount * 1.36;
    const sym = (currency || '').toUpperCase().trim();
    if (sym === 'BTC') return amount * cadRates.btcCAD;
    if (sym === 'ETH') return amount * cadRates.ethCAD;
    if (sym === 'USDT' || sym === 'USDC') return amount * cadRates.usdtCAD;
    return amount * cadRates.usdtCAD;
  };

  const statusStyle: Record<string, string> = {
    completed: "bg-green-50 text-green-600 border-green-200",
    pending:   "bg-amber-50 text-amber-600 border-amber-200",
    failed:    "bg-red-50   text-red-600   border-red-200",
  };

  return (
    <div>
      <h3 className="text-base font-bold text-gray-900 mb-4">Recent Transactions</h3>
      <div className="space-y-3">
        {(!user.transactions || user.transactions.length === 0) ? (
          <p className="text-sm text-gray-500 py-4 text-center">No transactions found.</p>
        ) : user.transactions.map((tx: any, i: number) => (
          <motion.div
            key={tx.id || i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-gray-50 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-sm font-bold text-gray-900">{tx.type || "Transfer"}</span>
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize", statusStyle[tx.status || "completed"] || statusStyle.completed)}>
                  {tx.status || "completed"}
                </span>
              </div>
              <p className="text-xs text-gray-600">{tx.id || tx.transaction_id || "TXN"} • {formatDate(tx.created_at)}</p>
              <p className="text-xs text-gray-600 mt-0.5">{tx.metadata || ""}</p>
            </div>
            <div className="text-right shrink-0 ml-6">
              <p className="text-sm font-bold text-gray-900">{tx.amount} {tx.currency}</p>
              <p className="text-xs text-gray-600 mt-0.5">{getCadValue(Number(tx.amount || 0), tx.currency).toLocaleString("en-US", {style:"currency",currency:"CAD"})}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SupportTab({ user }: { user: any }) {
  const statusStyle: Record<string, string> = {
    open:     "bg-orange-50 text-orange-600 border-orange-200",
    resolved: "bg-green-50  text-green-600  border-green-200",
    closed:   "bg-gray-100  text-gray-600   border-gray-200",
  };

  const priorityStyle: Record<string, string> = {
    "high priority":   "bg-red-50   text-red-600   border-red-200",
    "medium priority": "bg-gray-100 text-gray-600  border-gray-200",
    "low priority":    "bg-blue-50  text-blue-500  border-blue-200",
  };

  return (
    <div>
      <h3 className="text-base font-bold text-gray-900 mb-4">Support Tickets</h3>
      <div className="space-y-3">
        {(!user.tickets || user.tickets.length === 0) ? (
          <p className="text-sm text-gray-500 py-4 text-center">No support tickets found.</p>
        ) : user.tickets.map((ticket: any, i: number) => (
          <motion.div
            key={ticket.id || i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-gray-50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <span className="text-sm font-bold text-gray-900">{ticket.subject || "Support Request"}</span>
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize", statusStyle[ticket.status || "open"] || statusStyle.open)}>
                  {ticket.status || "open"}
                </span>
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize", priorityStyle[ticket.priority || "medium priority"] || priorityStyle["medium priority"])}>
                  {ticket.priority || "medium priority"}
                </span>
              </div>
              <p className="text-xs text-gray-600">{ticket.id} • Created {formatDate(ticket.created_at)}</p>
              <p className="text-xs text-gray-600 mt-0.5">Last updated {formatDate(ticket.updated_at || ticket.created_at)}</p>
            </div>
            <button
              onClick={() => alert(`Opening ticket ${ticket.id}…`)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white hover:text-blue-600 hover:border-blue-200 transition-all shrink-0 ml-4"
            >
              <Eye className="h-3.5 w-3.5" /> View
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Portfolio Tab ──────────────────────────────────────────────── */
function PortfolioTab({ user }: { user: any }) {
  const [rates, setRates] = useState<Record<string, number>>({ BTC: 90000, ETH: 4500, USDT: 1.36, USDC: 1.36 });
  useEffect(() => {
    fetchLiveCADRates().then(r => {
      setRates({ BTC: r.btcCAD, ETH: r.ethCAD, USDT: r.usdtCAD, USDC: r.usdtCAD });
    });
  }, []);

  const coinColors: Record<string, string> = {
    BTC: "#F7931A",
    ETH: "#627EEA",
    USDT: "#26A17B",
    USDC: "#30A17B"
  };

  const coinNames: Record<string, string> = {
    BTC: "Bitcoin",
    ETH: "Ethereum",
    USDT: "Tether",
    USDC: "USD Coin"
  };

  const userWallets = user.wallets || [];
  
  const activeCurrencies = userWallets.length > 0
    ? userWallets.map((w: any) => w.currency)
    : ["BTC", "ETH", "USDT"];

  const rawAssets = activeCurrencies.map((currency: string) => {
    const w = userWallets.find((x: any) => x.currency === currency) || { balance: 0 };
    const rate = rates[currency?.toUpperCase()] || 1.36;
    const cadValue = Number(w.balance) * rate;
    
    return {
      coin: currency,
      name: coinNames[currency?.toUpperCase()] || currency,
      balance: `${Number(w.balance).toLocaleString(undefined, { maximumFractionDigits: 8 })} ${currency}`,
      usd: `$${cadValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      rawCad: cadValue,
      color: coinColors[currency?.toUpperCase()] || "#0A3D91",
    };
  });

  const totalCad = rawAssets.reduce((acc: number, a: any) => acc + a.rawCad, 0);

  const assets = rawAssets.map((a: any) => ({
    ...a,
    alloc: totalCad > 0 
      ? `${((a.rawCad / totalCad) * 100).toFixed(1)}%` 
      : `${(100 / rawAssets.length).toFixed(1)}%`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-4">Asset Allocation</h3>
        <div className="h-4 w-full rounded-full bg-gray-100 flex overflow-hidden mb-5">
          {assets.map((asset: any) => (
            <div
              key={asset.coin}
              style={{ width: asset.alloc, backgroundColor: asset.color }}
              className="h-full first:rounded-l-full last:rounded-r-full"
              title={`${asset.name}: ${asset.alloc}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {assets.map((asset: any) => (
            <div key={asset.coin} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: asset.color }} />
              <span className="text-xs text-gray-600 font-medium">{asset.name} ({asset.alloc})</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      <div>
        <h3 className="text-base font-bold text-gray-900 mb-4">Balances</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {assets.map((asset: any) => (
            <div key={asset.coin} className="p-4 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-gray-50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: asset.color }}>
                  {asset.coin.slice(0, 3)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{asset.name}</h4>
                  <p className="text-xs text-gray-600">{asset.coin}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{asset.balance}</p>
                <p className="text-xs text-gray-600">{asset.usd}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Documents Tab ──────────────────────────────────────────────── */
function DocumentsTab({ user }: { user: any }) {
  const [docs, setDocs] = useState(user.documents || []);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const statusStyle: Record<string, string> = {
    approved: "bg-green-50 text-green-600 border-green-200",
    pending:  "bg-amber-50 text-amber-600 border-amber-200",
    rejected: "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <div className="space-y-6">
      <h3 className="text-base font-bold text-gray-900 mb-4">Uploaded Verification Documents</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(!docs || docs.length === 0) && (
          <p className="text-sm text-gray-500 py-4">No documents uploaded.</p>
        )}
        {docs.map((doc: any, idx: number) => {
          const type = doc.document_type || "Verification Document";
          const name = doc.file_url ? doc.file_url.split("/").pop() : "document.pdf";
          const date = formatDate(doc.created_at);
          const status = doc.status || "pending";
          
          return (
            <div key={doc.id || idx} className="p-4 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-gray-50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{type}</h4>
                  <p className="text-xs text-gray-600">{name} • {date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize", statusStyle[status] || statusStyle.pending)}>
                  {status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending"}
                </span>
                <button
                  onClick={() => setSelectedDoc({ ...doc, _type: type, _name: name, _date: date })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                >
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedDoc && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{selectedDoc._type}</h3>
                  <p className="text-xs text-gray-600">{selectedDoc._name}</p>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
              <div className="p-8 bg-gray-50 flex flex-col items-center justify-center min-h-[200px] border-b border-gray-100">
                <FileText className="h-16 w-16 text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-600">Verification Document Scan</p>
                <p className="text-xs text-gray-600 mt-1">Uploaded securely on {selectedDoc._date}</p>
              </div>
              <div className="p-4 bg-gray-50/50 flex justify-end gap-3">
                <button
                  onClick={() => {
                    fetch("/api/kyc", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId: user.id, status: "rejected", rejectionReason: "Rejected by admin" }) });
                    setDocs((prev:any) => prev.map((d:any) => d.id === selectedDoc.id ? { ...d, status: "rejected" } : d));
                    setSelectedDoc(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-red-600 hover:bg-red-50/50 transition-colors"
                >
                  Reject Document
                </button>
                <button
                  onClick={() => {
                    fetch("/api/kyc", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId: user.id, status: "approved" }) });
                    setDocs((prev:any) => prev.map((d:any) => d.id === selectedDoc.id ? { ...d, status: "approved" } : d));
                    setSelectedDoc(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
                >
                  Approve Document
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Audit Logs Tab ─────────────────────────────────────────────── */
function AuditLogsTab({ user }: { user: any }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("platform_notifications");
      if (raw) {
        try {
          const list = JSON.parse(raw);
          const received = list.filter((notif: any) => {
            const aud = notif.audience || "";
            if (!aud || aud === "All") return true;
            if (aud === "Verified" && user.kyc === "Verified") return true;
            if (aud === "Unverified" && user.kyc !== "Verified") return true;
            if (aud === "High Value" && user.balance >= 50000) return true;
            return false;
          }).map((notif: any) => ({
            date: notif.timestamp,
            title: `System Broadcast: ${notif.title}`,
            desc: notif.message,
            isAnnouncement: true,
            badgeType: notif.type,
          }));
          setAnnouncements(received);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [user]);

  const baseEvents = (user.security_logs || []).map((l:any) => ({ date: formatDate(l.timestamp), title: l.action || "Activity", desc: l.details || "System action logged" }));
  const events = [...announcements, ...baseEvents];

  return (
    <div>
      <h3 className="text-base font-bold text-gray-900 mb-6">Account Activity Log</h3>
      <div className="relative border-l border-gray-100 ml-3 pl-6 space-y-6">
        {events.length === 0 && <p className="text-sm text-gray-500">No activity logs found.</p>}
        {events.map((event, i) => (
          <div key={i} className="relative">
            <span className={cn(
              "absolute -left-[31px] top-1.5 h-2 w-2 rounded-full ring-4 ring-white",
              event.isAnnouncement
                ? event.badgeType === "Warning" ? "bg-amber-500"
                  : event.badgeType === "Success" ? "bg-green-500"
                  : event.badgeType === "Error" ? "bg-red-500"
                  : "bg-blue-500"
                : "bg-blue-600"
            )} />
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-900">{event.title}</h4>
                  {event.isAnnouncement && (
                    <span className="text-[8px] bg-blue-50 text-blue-700 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-blue-150 animate-pulse">
                      Announcement
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{event.desc}</p>
              </div>
              <span className="text-[11px] text-gray-600 font-medium whitespace-nowrap">{event.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function UserDetailPage() {
  return (
    <RequirePermission permission="view-users">
      <UserDetailPageContent />
    </RequirePermission>
  );
}

function UserDetailPageContent() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/users/${userId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const formattedUser = {
          id: userId,
          name: data.profile?.full_name || data.auth?.user_metadata?.full_name || "Unknown User",
          email: data.auth?.email,
          phone: data.profile?.phone || data.auth?.phone || "N/A",
          dateOfBirth: data.kyc?.date_of_birth,
          street: data.kyc?.street_address,
          city: data.kyc?.city,
          postalCode: data.kyc?.postal_code,
          country: data.kyc?.country,
          joinedDate: formatDate(data.auth?.created_at || new Date().toISOString()),
          lastLogin: data.auth?.last_sign_in_at ? formatDate(data.auth.last_sign_in_at) : "N/A",
          twoFactor: data.profile?.two_factor_enabled || false,
          lastIp: data.profile?.last_ip || "N/A",
          wallets: data.wallets || [],
          transactions: data.transactions || [],
          sessions: data.sessions || [],
          documents: data.kycDocuments || [],
          tickets: data.tickets || [],
          security_logs: data.securityLogs || [],
          notes: data.notes || [],
          account: data.profile?.account_status || "Active",
          risk: data.profile?.risk_level || "Low Risk",
          kyc: data.kyc?.status === "approved" ? "Verified" : data.kyc?.status === "rejected" ? "Rejected" : data.kyc?.status === "pending" ? "Pending" : "Not Started",
          balance: 0
        };
        
        const liveRates = await fetchLiveCADRates();
        const rates: Record<string, number> = { BTC: liveRates.btcCAD, ETH: liveRates.ethCAD, USDT: liveRates.usdtCAD, USDC: liveRates.usdtCAD };
        let totalBalance = 0;
        for (const w of formattedUser.wallets) {
            const r = rates[w.currency?.toUpperCase()] || rates.USDT;
            totalBalance += Number(w.balance || 0) * r;
        }
        formattedUser.balance = totalBalance;
        
        setUserData(formattedUser);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [userId]);

  const user = userData;

  const [activeTab, setActiveTab]         = useState("overview");
  const [isFrozen, setIsFrozen]           = useState(false);
  useEffect(() => { if (user) setIsFrozen(user.account === "Frozen"); }, [user]);
  const [showFreezeModal, setShowFreeze]  = useState(false);
  const [showNoteModal, setShowNote]      = useState(false);
  const [noteSaved, setNoteSaved]         = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <span className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></span>
        <p className="text-sm text-gray-600">Loading user profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <User className="h-12 w-12 text-gray-300" />
        <h2 className="text-lg font-bold text-gray-700">User not found</h2>
        <p className="text-sm text-gray-600">The user ID &quot;{userId}&quot; does not exist in the database.</p>
        <button onClick={() => router.push("/dashboard/users")}
          className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#0A3D91,#1650AB)" }}>
          Back to Users
        </button>
      </div>
    );
  }

  const currentAccount: AccountStatus = isFrozen
    ? "Frozen"
    : user.account === "Frozen" ? "Active" : user.account;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-5"
      >
        {/* ── Header */}
        <div className="flex items-start gap-4 flex-wrap">
          <button onClick={() => router.push("/dashboard/users")}
            className="mt-1 h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors shrink-0 shadow-sm">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-bold text-gray-900 truncate">{user.name}</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              User ID: <span className="font-medium text-gray-700">{user.id}</span> • Member since {user.joinedDate}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button onClick={() => setShowNote(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <FileEdit className="h-4 w-4" /> Add Note
            </button>
            <button onClick={() => alert("Exporting…")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <Download className="h-4 w-4" /> Export
            </button>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={async () => {
                if (isFrozen) {
                   await fetch(`/api/users`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId: user.id, action: "unfreeze" }) });
                   setIsFrozen(false);
                } else {
                   setShowFreeze(true);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all"
              style={{ background: isFrozen ? "#22C55E" : "#F59E0B" }}>
              {isFrozen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {isFrozen ? "Unfreeze Account" : "Freeze Account"}
            </motion.button>
          </div>
        </div>

        {/* ── 4 Info Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Total Balance",  content: <p className="text-xl font-bold text-gray-900">${(user.balance || 0).toLocaleString("en-US",{minimumFractionDigits:2})}</p>, icon: Wallet,        iconBg: "bg-blue-50",  iconColor: "text-blue-600" },
            { label: "KYC Status",     content: <KycBadge status={user.kyc} />,          icon: CheckCircle2,  iconBg: "bg-green-50", iconColor: "text-green-500" },
            { label: "Account Status", content: <AccountBadge status={currentAccount} />, icon: Shield,        iconBg: "bg-blue-50",  iconColor: "text-blue-500" },
            { label: "Risk Level",     content: <RiskBadge level={user.risk} />,          icon: AlertTriangle, iconBg: "bg-amber-50", iconColor: "text-amber-500" },
          ].map(({ label, content, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-2">{label}</p>
                {content}
              </div>
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                <Icon className={cn("h-5 w-5", iconColor)} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs + Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center border-b border-gray-100 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn("flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors relative shrink-0",
                    isActive ? "text-blue-700" : "text-gray-600 hover:text-gray-700 hover:bg-gray-50")}>
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {isActive && (
                    <motion.div layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {activeTab === "overview"      && (
                  <>
                    <OverviewTab user={user} />
                    {user.notes && user.notes.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-base font-bold text-gray-900 mb-4">Admin Notes</h3>
                        <div className="space-y-3">
                          {user.notes.map((n:any) => (
                            <div key={n.id} className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                              <p className="text-sm text-gray-800">{n.note}</p>
                              <p className="text-xs text-gray-500 mt-2">Added by {n.created_by} on {formatDate(n.created_at)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {activeTab === "portfolio"     && <PortfolioTab user={user} />}
                {activeTab === "transactions"  && <TransactionsTab user={user} />}
                {activeTab === "security"      && <SecurityTab user={user} />}
                {activeTab === "documents"     && <DocumentsTab user={user} />}
                {activeTab === "support"       && <SupportTab user={user} />}
                {activeTab === "audit-logs"    && <AuditLogsTab user={user} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showFreezeModal && <FreezeModal onClose={() => setShowFreeze(false)} onConfirm={async (reason) => { 
          await fetch(`/api/users`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId: user.id, action: "freeze", reason }) });
          setIsFrozen(true); setShowFreeze(false); 
        }} />}
      </AnimatePresence>
      <AnimatePresence>
        {showNoteModal && <NoteModal onClose={() => setShowNote(false)} onConfirm={async (note) => { 
          await fetch(`/api/users/notes`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId: user.id, note }) });
          setShowNote(false); setNoteSaved(true); setTimeout(() => setNoteSaved(false), 3000); 
          fetchUsers(); // Refresh notes
        }} />}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {noteSaved && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl shadow-xl">
            <CheckCircle2 className="h-4 w-4 text-green-400" /> Note saved successfully.
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

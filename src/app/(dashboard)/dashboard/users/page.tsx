"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useUsers, useUpdateUserAccount } from "@/hooks/useAdminQueries";
import { useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/lib/query-keys";
import { useRouter } from "next/navigation";
import { RequirePermission } from "@/components/layout/RequirePermission";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, Download, UserPlus, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, XCircle, AlertTriangle, Shield, X,
  User, Mail, Phone, Lock, Unlock, MoreVertical, FileEdit, Eye,
  Copy, Check, Key, DollarSign, ShieldAlert, Trash2, AlertOctagon, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type AdminUser, type KycStatus, type AccountStatus, type RiskLevel } from "@/lib/data/users";
import { useClickOutside } from "@/hooks/useHelpers";

/* ─── Config ─────────────────────────────────────────────────────── */
const PAGE_SIZE = 8;

/* ─── User Avatar Component with 3-tier Fallback ─────────────────────────────────────── */
function UserAvatar({
  user,
  size = "md",
}: {
  user: any;
  size?: "sm" | "md";
}) {
  const [imageError, setImageError] = useState(false);
  const [currentSource, setCurrentSource] = useState<"kyc" | "google" | "initials">("kyc");

  const sizeClasses = size === "sm" ? "h-7 w-7 rounded-lg text-xs" : "h-9 w-9 rounded-full text-xs";

  // Determine which image source to use based on KYC status
  const getImageUrl = () => {
    // Priority 1: KYC selfie (only if KYC is approved)
    if (currentSource === "kyc" && user.kyc === "Verified" && user.kyc_selfie_url) {
      return user.kyc_selfie_url;
    }
    // Priority 2: Google avatar (if KYC is not approved or selfie fails)
    if (currentSource === "google" && user.google_avatar_url) {
      return user.google_avatar_url;
    }
    return null;
  };

  const imageUrl = getImageUrl();

  const handleImageError = () => {
    if (currentSource === "kyc") {
      // If KYC selfie fails, try Google avatar
      if (user.google_avatar_url) {
        setCurrentSource("google");
      } else {
        setCurrentSource("initials");
        setImageError(true);
      }
    } else if (currentSource === "google") {
      // If Google avatar fails, show initials
      setCurrentSource("initials");
      setImageError(true);
    }
  };

  // Reset to appropriate source when user changes
  useEffect(() => {
    console.log(`[UsersPage UserAvatar] User ${user.name}:`, {
      kyc: user.kyc,
      kyc_selfie_url: user.kyc_selfie_url,
      google_avatar_url: user.google_avatar_url,
    });
    
    if (user.kyc === "Verified" && user.kyc_selfie_url) {
      setCurrentSource("kyc");
    } else if (user.google_avatar_url) {
      setCurrentSource("google");
    } else {
      setCurrentSource("initials");
    }
    setImageError(false);
  }, [user.id, user.kyc, user.kyc_selfie_url, user.google_avatar_url, user.name]);

  if (currentSource === "initials" || !imageUrl) {
    return (
      <div className={`${sizeClasses} bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0`}>
        {user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={user.name}
      loading="lazy"
      decoding="async"
      onError={handleImageError}
      className={`${sizeClasses} object-cover shrink-0`}
    />
  );
}

const FILTER_OPTIONS = [
  { label: "All Users",         value: "all" },
  { label: "Verified",          value: "Verified" },
  { label: "Pending KYC",       value: "Pending" },
  { label: "Rejected",          value: "Rejected" },
  { label: "Not Started",       value: "Not Started" },
  { label: "Active Accounts",   value: "Active" },
  { label: "Locked Accounts",   value: "Locked" },
  { label: "Suspended",         value: "Suspended" },
  { label: "Frozen",            value: "Frozen" },
  { label: "High Risk",         value: "High Risk" },
  { label: "Medium Risk",       value: "Medium Risk" },
  { label: "Low Risk",          value: "Low Risk" },
];

/* ─── Badge Helpers ──────────────────────────────────────────────── */
function KycBadge({ status }: { status: KycStatus }) {
  const styles: Record<KycStatus, { cls: string; icon: React.ReactNode }> = {
    Verified:    { cls: "bg-green-50 text-green-700 border-green-200",  icon: <CheckCircle2 className="h-3 w-3" /> },
    Pending:     { cls: "bg-amber-50  text-amber-700  border-amber-200", icon: <Clock        className="h-3 w-3" /> },
    Rejected:    { cls: "bg-red-50   text-red-700   border-red-200",   icon: <XCircle       className="h-3 w-3" /> },
    "Not Started":{ cls: "bg-gray-100 text-gray-600  border-gray-200",  icon: <AlertTriangle className="h-3 w-3" /> },
  };
  const s = styles[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border", s.cls)}>
      {s.icon}{status}
    </span>
  );
}

function AccountBadge({ status }: { status: AccountStatus | "Locked" }) {
  const styles: Record<string, { cls: string; icon?: React.ReactNode }> = {
    Active:    { cls: "bg-green-50 text-green-700 border-green-200" },
    Suspended: { cls: "bg-red-50 text-red-700 border-red-200" },
    Frozen:    { cls: "bg-red-50 text-red-700 border-red-200", icon: <Lock className="h-3 w-3 text-red-500" /> },
    Locked:    { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Lock className="h-3 w-3 text-amber-600" /> },
  };
  const s = styles[status] || styles["Active"];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border", s.cls)}>
      {s.icon}{status}
    </span>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    "Low Risk":    "bg-green-50 text-green-700 border-green-200",
    "Medium Risk": "bg-amber-50 text-amber-700 border-amber-200",
    "High Risk":   "bg-red-50   text-red-700   border-red-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border", styles[level])}>
      {level === "High Risk" && <AlertTriangle className="h-3 w-3" />}
      {level}
    </span>
  );
}

/* ─── Open Client Account Modal (Add User) ───────────────────────── */
function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    initialCadBalance: "0.00",
    kycStatus: "Verified",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdData, setCreatedData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "CDNT-";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({ ...prev, password: pwd }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create client account.");
      }

      setCreatedData(data.user);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Failed to open client account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {createdData ? "Account Opened Successfully" : "Open Client Account"}
            </h2>
            <p className="text-xs text-gray-500">
              {createdData ? "Client credentials and account summary" : "Manually register and provision a client account"}
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {createdData ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-emerald-900">
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Client Account Active
                </div>
                <p className="text-xs text-emerald-700">
                  The client has been registered in Supabase Auth, their CAD Everyday Chequing account has been provisioned, and default crypto wallets are active.
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500 font-medium">Full Name</span>
                  <span className="font-bold text-gray-900">{createdData.fullName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500 font-medium">Email</span>
                  <span className="font-bold text-gray-900">{createdData.email}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500 font-medium">CAD Chequing Account</span>
                  <span className="font-mono font-bold text-blue-700">{createdData.accountNumber}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                  <span className="text-gray-500 font-medium">Initial CAD Balance</span>
                  <span className="font-bold text-emerald-700">${Number(createdData.initialCadBalance).toFixed(2)} CAD</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500 font-medium">Temporary Password</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono bg-white px-2 py-1 rounded border border-gray-200 text-gray-900 font-bold">
                      {createdData.temporaryPassword}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(createdData.temporaryPassword)}
                      className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #0A3D91, #1650AB)" }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Johnathan Miller"
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="client@example.com"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Temporary Password</label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    🎲 Generate Password
                  </button>
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Leave blank to auto-generate"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-mono text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Initial CAD Chequing Balance</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.initialCadBalance}
                      onChange={(e) => setForm((prev) => ({ ...prev, initialCadBalance: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Initial KYC Status</label>
                  <select
                    value={form.kycStatus}
                    onChange={(e) => setForm((prev) => ({ ...prev, kycStatus: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 bg-white"
                  >
                    <option value="Verified">Verified (Instant Approval)</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Not Started">Not Started</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  style={{ background: "linear-gradient(135deg, #0A3D91, #1650AB)" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Opening Account...
                    </>
                  ) : (
                    "Open Client Account"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Lock Account Modal ─────────────────────────────────────────── */
function LockModal({ onConfirm, onClose }: { onConfirm: (r: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");

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
              <Lock className="h-6 w-6 text-amber-600" />
            </div>
            <div className="pt-0.5">
              <h2 className="text-[17px] font-bold text-gray-900">Lock Account</h2>
              <p className="text-sm text-gray-600 mt-0.5">Allow client to view account and switch pages, but restrict trading and touching funds</p>
            </div>
          </div>
          <div className="mb-5">
            <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              Reason for locking (optional)
            </label>
            <textarea rows={3} placeholder="Enter the reason for locking this account..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-500 outline-none resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => onConfirm(reason)}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
              style={{ background: "#D97706" }}>
              Lock Account
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

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

/* ─── User Row Component ─────────────────────────────────────────── */
function UserRow({
  user,
  isNearBottom = false,
  onView,
  onFreeze,
  onLock,
  onNote,
  onDelete,
}: {
  user: AdminUser;
  isNearBottom?: boolean;
  onView: () => void;
  onFreeze: () => void;
  onLock: () => void;
  onNote: () => void;
  onDelete: () => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setIsMenuOpen(false));

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onView}
      className={cn(
        "grid min-w-[1040px] grid-cols-[2fr_2fr_1.2fr_1.1fr_1.3fr_1fr_96px] gap-4 items-center px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors group",
        isMenuOpen ? "relative z-40" : "relative z-0"
      )}
    >
      {/* USER */}
      <div className="flex items-center gap-3 min-w-0">
        <UserAvatar user={user} size="md" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{user.name}</p>
          <p className="text-[11px] text-gray-600 truncate">{user.email}</p>
        </div>
      </div>

      {/* WALLETS PREVIEW */}
      <div className="min-w-0">
        {user.wallets && user.wallets.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {user.wallets.slice(0, 4).map((w: any, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100/80 text-[10px] font-medium text-gray-700 border border-gray-200/50"
              >
                <span className="font-semibold text-gray-900">{w.currency}:</span>
                <span className="text-gray-600 font-mono">
                  {w.currency === "CAD"
                    ? `$${Number(w.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : Number(w.balance || 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}
                </span>
              </span>
            ))}
            {user.wallets.length > 4 && (
              <span className="text-[10px] text-gray-600 font-medium">+{user.wallets.length - 4}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-600 italic">No wallets</span>
        )}
      </div>

      {/* KYC */}
      <div>
        <KycBadge status={user.kyc} />
      </div>

      {/* ACCOUNT */}
      <div>
        <AccountBadge status={user.account as AccountStatus | "Locked"} />
      </div>

      {/* BALANCE */}
      <div>
        <p className="text-xs font-bold text-gray-900">
          ${user.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
        </p>
      </div>

      {/* JOINED */}
      <div>
        <p className="text-xs text-gray-600">{user.joinedDate}</p>
      </div>

      {/* ACTIONS */}
      <div 
        ref={menuRef}
        className="relative flex items-center justify-end gap-1" 
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          title="View user overview"
          aria-label={`View ${user.name}`}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-200 transition-colors"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(prev => !prev);
          }}
          title="Open actions"
          aria-label={`Open actions for ${user.name}`}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-lg border transition-colors",
            isMenuOpen 
              ? "border-blue-400 bg-blue-50 text-blue-700 shadow-sm" 
              : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
          )}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: isNearBottom ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: isNearBottom ? 4 : -4 }}
              transition={{ duration: 0.12 }}
              className={cn(
                "absolute right-0 w-48 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden z-50 py-1 divide-y divide-gray-100",
                isNearBottom ? "bottom-full mb-1.5 origin-bottom-right" : "top-full mt-1.5 origin-top-right"
              )}
            >
              <div className="py-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onView(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-gray-500" /> View Profile
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onNote(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileEdit className="h-3.5 w-3.5 text-gray-500" /> Add Admin Note
                </button>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onLock(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                  style={{ color: user.account === "Locked" ? "#22C55E" : "#D97706" }}
                >
                  {user.account === "Locked" ? (
                    <>
                      <Unlock className="h-3.5 w-3.5" /> Unlock Account
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" /> Lock Account
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onFreeze(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                  style={{ color: user.account === "Frozen" ? "#22C55E" : "#F59E0B" }}
                >
                  {user.account === "Frozen" ? (
                    <>
                      <Unlock className="h-3.5 w-3.5" /> Unfreeze Account
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" /> Freeze Account
                    </>
                  )}
                </button>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete User
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function UsersPage() {
  return (
    <RequirePermission permission={["view-users", "edit-users", "delete-users"]}>
      <UsersPageContent />
    </RequirePermission>
  );
}

function UsersPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: users = [], isLoading: loading } = useUsers() as { data: AdminUser[]; isLoading: boolean };
  const updateUserAccount = useUpdateUserAccount();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddUser, setShowAddUser] = useState(false);
  const [activeUserForLock, setActiveUserForLock] = useState<AdminUser | null>(null);
  const [activeUserForFreeze, setActiveUserForFreeze] = useState<AdminUser | null>(null);
  const [activeUserForNote, setActiveUserForNote] = useState<AdminUser | null>(null);
  const [activeUserForDelete, setActiveUserForDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  
  const filterRef = useClickOutside<HTMLDivElement>(() => setIsFilterOpen(false));

  const activeFilterLabel = FILTER_OPTIONS.find(o => o.value === filter)?.label ?? "All Users";

  // Auto-hide toast
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => { setToastMsg(null); }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  /* ── Filtering ─────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter(u => {
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.phone.includes(q);

      const matchFilter =
        filter === "all" ||
        u.kyc === filter ||
        u.account === filter ||
        u.risk === filter;

      return matchSearch && matchFilter;
    });
  }, [search, filter, users]);

  /* ── Pagination ────────────────────────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageUsers = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFilterSelect = (value: string) => {
    setFilter(value);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    setCurrentPage(1);
  };

  /* ── Stats ─────────────────────────────────────────────────────── */
  const totalUsers    = users.length;
  const verifiedUsers = users.filter(u => u.kyc === "Verified").length;
  const pendingKyc    = users.filter(u => u.kyc === "Pending").length;
  const highRisk      = users.filter(u => u.risk === "High Risk").length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-5"
      >
        {/* ── Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">Users Management</h1>
            <p className="text-sm text-gray-600 mt-0.5">Manage user accounts, verification status, and permissions</p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => alert("Exporting users data…")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #0A3D91, #1650AB)" }}
            >
              <UserPlus className="h-4 w-4" /> Add User
            </button>
          </div>
        </div>

        {/* ── Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Total Users",     value: totalUsers.toLocaleString(),    sub: "+234 this month",  subColor: "text-green-600", icon: <Shield   className="h-5 w-5 text-blue-500" />, iconBg: "bg-blue-50"   },
            { label: "Verified Users",  value: verifiedUsers.toLocaleString(), sub: `${Math.round(verifiedUsers/totalUsers*100)}% verification rate`, subColor: "text-gray-600", icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, iconBg: "bg-green-50" },
            { label: "Pending KYC",     value: pendingKyc.toLocaleString(),    sub: "Requires attention", subColor: "text-amber-600",  icon: <Clock    className="h-5 w-5 text-amber-500" />, iconBg: "bg-amber-50"  },
            { label: "High Risk",       value: highRisk.toLocaleString(),      sub: "Monitor closely",   subColor: "text-red-600",    icon: <AlertTriangle className="h-5 w-5 text-red-400" />, iconBg: "bg-red-50"   },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.35 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 leading-none mb-1.5">{card.value}</p>
                <p className={cn("text-[11px] font-medium", card.subColor)}>{card.sub}</p>
              </div>
              <div className={cn("h-11 w-11 rounded-full flex items-center justify-center shrink-0", card.iconBg)}>
                {card.icon}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name, email, ID, or phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all shadow-sm"
            />
            {search && (
              <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div ref={filterRef} className="relative shrink-0">
            <button
              onClick={() => setIsFilterOpen(v => !v)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-sm",
                isFilterOpen || filter !== "all"
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              <Filter className="h-4 w-4" />
              {activeFilterLabel}
            </button>
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-20"
                >
                  {FILTER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleFilterSelect(opt.value)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-colors",
                        filter === opt.value
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="grid min-w-[1040px] grid-cols-[2fr_2fr_1.2fr_1.1fr_1.3fr_1fr_96px] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/70">
            {["USER", "CONTACT", "KYC STATUS", "ACCOUNT", "BALANCE", "RISK"].map(col => (
              <span key={col} className="text-[10px] font-bold text-gray-600 tracking-widest uppercase">{col}</span>
            ))}
            <span className="text-[10px] font-bold text-gray-600 tracking-widest uppercase text-right pr-1">ACTIONS</span>
          </div>

          {/* Rows */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-[1040px] divide-y divide-gray-50 bg-white"
              >
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="grid grid-cols-[2fr_2fr_1.2fr_1.1fr_1.3fr_1fr_96px] gap-4 items-center px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 bg-gray-100 rounded-lg w-24 animate-pulse" />
                        <div className="h-3 bg-gray-100 rounded-lg w-16 animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-4 bg-gray-100 rounded-lg w-32 animate-pulse" />
                      <div className="h-3 bg-gray-100 rounded-lg w-24 animate-pulse" />
                    </div>
                    <div className="h-6 bg-gray-100 rounded-full w-20 animate-pulse" />
                    <div className="h-6 bg-gray-100 rounded-full w-16 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-4 bg-gray-100 rounded-lg w-16 animate-pulse" />
                      <div className="h-3 bg-gray-100 rounded-lg w-20 animate-pulse" />
                    </div>
                    <div className="h-6 bg-gray-100 rounded-full w-20 animate-pulse" />
                    <div className="h-8 bg-gray-100 rounded-lg w-full animate-pulse" />
                  </div>
                ))}
              </motion.div>
            ) : pageUsers.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 text-center text-gray-600 text-sm bg-white"
              >
                No users found matching your search.
              </motion.div>
            ) : (
              <motion.div key={`page-${safePage}-${filter}-${search}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                {pageUsers.map((user, idx) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isNearBottom={idx >= pageUsers.length - 2 && pageUsers.length > 2}
                    onView={() => router.push(`/dashboard/users/${user.id}`)}
                    onLock={async () => {
                      if (user.account === "Locked") {
                        await updateUserAccount.mutateAsync({ userId: user.id, action: "unlock" });
                        setToastMsg("Account unlocked successfully ✓");
                      } else {
                        setActiveUserForLock(user);
                      }
                    }}
                    onFreeze={async () => {
                      if (user.account === "Frozen") {
                        await updateUserAccount.mutateAsync({ userId: user.id, action: "unfreeze" });
                        setToastMsg("Account unfrozen successfully ✓");
                      } else {
                        setActiveUserForFreeze(user);
                      }
                    }}
                    onNote={() => setActiveUserForNote(user)}
                    onDelete={() => setActiveUserForDelete(user)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/40">
            <p className="text-xs text-gray-600">
              Showing <span className="font-semibold text-gray-700">{pageUsers.length}</span> of{" "}
              <span className="font-semibold text-gray-700">{filtered.length}</span> users
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "h-8 w-8 rounded-lg text-sm font-semibold transition-all",
                    safePage === i + 1
                      ? "text-white shadow-sm"
                      : "text-gray-600 border border-gray-200 hover:bg-gray-100"
                  )}
                  style={safePage === i + 1 ? { background: "linear-gradient(135deg, #0A3D91, #1650AB)" } : {}}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showAddUser && (
          <AddUserModal
            onClose={() => setShowAddUser(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
              setToastMsg("Client account opened successfully ✓");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeUserForLock && (
          <LockModal
            onClose={() => setActiveUserForLock(null)}
            onConfirm={async (reason) => {
              await updateUserAccount.mutateAsync({ userId: activeUserForLock.id, action: "lock", reason });
              setActiveUserForLock(null);
              setToastMsg("Account locked to view-only mode successfully ✓");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeUserForFreeze && (
          <FreezeModal
            onClose={() => setActiveUserForFreeze(null)}
            onConfirm={async (reason) => {
              await updateUserAccount.mutateAsync({ userId: activeUserForFreeze.id, action: "freeze", reason });
              setActiveUserForFreeze(null);
              setToastMsg("Account frozen successfully ✓");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeUserForNote && (
          <NoteModal
            onClose={() => setActiveUserForNote(null)}
            onConfirm={(note) => {
              setActiveUserForNote(null);
              setToastMsg("Note saved successfully ✓");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeUserForDelete && (
          <DeleteUserModal
            user={activeUserForDelete}
            loading={isDeleting}
            onClose={() => setActiveUserForDelete(null)}
            onConfirm={async () => {
              setIsDeleting(true);
              try {
                const res = await fetch(`/api/users/${activeUserForDelete.id}`, {
                  method: "DELETE",
                });
                const data = await res.json();
                if (!res.ok) {
                  throw new Error(data.error || "Failed to delete user");
                }
                
                // Trigger react-query cache invalidation
                router.refresh();
                // We will manually invalidate query cache if we can, or let router refresh work
                setToastType("success");
                setToastMsg("User and all related data deleted ✓");
                setActiveUserForDelete(null);
                
                // Force hot reload of state/refetch users
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } catch (err: any) {
                setToastType("error");
                setToastMsg(err.message || "Failed to delete user");
              } finally {
                setIsDeleting(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 text-white text-sm font-medium rounded-xl shadow-xl",
              toastType === "error" ? "bg-red-600" : "bg-gray-900"
            )}
          >
            {toastType === "error" ? (
              <XCircle className="h-4 w-4 text-white" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            )} 
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Delete User Modal ─── */
function DeleteUserModal({
  user,
  loading,
  onClose,
  onConfirm,
}: {
  user: AdminUser;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [emailInput, setEmailInput] = useState("");
  const match = emailInput.trim().toLowerCase() === user.email.trim().toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: "spring", damping: 28, stiffness: 340 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertOctagon className="h-6 w-6 text-red-600" />
            </div>
            <div className="pt-0.5">
              <h2 className="text-[17px] font-bold text-red-600">Delete User Account</h2>
              <p className="text-xs text-gray-600 mt-0.5">Warning: Extremely critical action</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 text-xs text-red-800 space-y-2">
              <p className="font-bold">This action is permanent and cannot be undone.</p>
              <p>All data related to this user — wallets, deposits, withdrawals, transactions, KYC submissions, notifications, sessions, and wallet addresses — will be permanently deleted.</p>
            </div>

            <div className="border border-gray-100 bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">Target User</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                To confirm, type the user's email address below:
              </label>
              <input
                type="text"
                placeholder={user.email}
                value={emailInput}
                disabled={loading}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading || !match}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
              style={{ background: "#DC2626" }}
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : null}
              {loading ? "Deleting…" : "Yes, Delete Permanently"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

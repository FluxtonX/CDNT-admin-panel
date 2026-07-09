"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  BarChart3,
  FileCheck,
  Settings,
  HeadphonesIcon,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Check,
  Link,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Info,
  AlertTriangle,
  Clock,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RequirePermission } from "@/components/layout/RequirePermission";

const BRAND_GRADIENT = "linear-gradient(135deg, #0A3D91 0%, #1650AB 100%)";

/* ─── Category Definitions ──────────────────────────────────────── */

type CategoryId =
  | "global"
  | "dashboard"
  | "deposit"
  | "withdraw"
  | "wallets"
  | "buysell"
  | "kyc"
  | "settings"
  | "support"
  | "landing";

const CATEGORIES: { id: CategoryId; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "global",    label: "Global / Announcement", icon: Megaphone,       badge: "Banner" },
  { id: "dashboard", label: "Dashboard",              icon: LayoutDashboard },
  { id: "deposit",   label: "Deposit",                icon: ArrowDownToLine },
  { id: "withdraw",  label: "Withdraw",               icon: ArrowUpFromLine },
  { id: "wallets",   label: "Wallets",                icon: Wallet },
  { id: "buysell",   label: "Buy / Sell",             icon: BarChart3 },
  { id: "kyc",       label: "KYC",                    icon: FileCheck },
  { id: "settings",  label: "Settings",               icon: Settings },
  { id: "support",   label: "Support",                icon: HeadphonesIcon },
  { id: "landing",   label: "Landing Page",           icon: Globe },
];

/* ─── Types ──────────────────────────────────────────────────────── */

type ListItem = { id: string; value: string };

function makeList(items: string[]): ListItem[] {
  return items.map((v, i) => ({ id: String(i), value: v }));
}

type ComplexListItem = { id: string; title: string; description: string };

function makeComplexList(items: { title: string; description: string }[]): ComplexListItem[] {
  return items.map((v, i) => ({ id: String(i), ...v }));
}

/* ─── Shared field components ────────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
      {children}
    </p>
  );
}

function LastUpdated({ date }: { date: string }) {
  return (
    <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
      <Clock className="h-3 w-3" />
      Last updated: {date}
    </p>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  updatedAt,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helper?: string;
  updatedAt?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div className="mb-1">
      <FieldLabel>{label}</FieldLabel>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none resize-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50"
        />
      )}
      {helper && <p className="text-[11px] text-gray-400 mt-1">{helper}</p>}
      {updatedAt && <LastUpdated date={updatedAt} />}
    </div>
  );
}

function ListEditor({
  label,
  items,
  onChange,
  updatedAt,
}: {
  label: string;
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  updatedAt?: string;
}) {
  const add = () =>
    onChange([...items, { id: String(Date.now()), value: "" }]);
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));
  const update = (id: string, value: string) =>
    onChange(items.map((i) => (i.id === id ? { ...i, value } : i)));

  return (
    <div className="mb-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <div className="flex-shrink-0 cursor-grab text-gray-300 hover:text-gray-400">
              <GripVertical className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-gray-400 w-5 text-right shrink-0">
              {idx + 1}.
            </span>
            <input
              value={item.value}
              onChange={(e) => update(item.id, e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50"
            />
            <button
              onClick={() => remove(item.id)}
              className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Add item
      </button>
      {updatedAt && <LastUpdated date={updatedAt} />}
    </div>
  );
}

function ComplexListEditor({
  label,
  items,
  onChange,
  updatedAt,
}: {
  label: string;
  items: ComplexListItem[];
  onChange: (items: ComplexListItem[]) => void;
  updatedAt?: string;
}) {
  const add = () =>
    onChange([...items, { id: String(Date.now()), title: "", description: "" }]);
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));
  const updateTitle = (id: string, title: string) =>
    onChange(items.map((i) => (i.id === id ? { ...i, title } : i)));
  const updateDesc = (id: string, description: string) =>
    onChange(items.map((i) => (i.id === id ? { ...i, description } : i)));

  return (
    <div className="mb-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-start gap-2 group bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex-shrink-0 cursor-grab text-gray-300 hover:text-gray-400 mt-2">
              <GripVertical className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-gray-400 w-5 text-right shrink-0 mt-2">
              {idx + 1}.
            </span>
            <div className="flex-1 space-y-2">
              <input
                value={item.title}
                onChange={(e) => updateTitle(item.id, e.target.value)}
                placeholder="Title"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
              />
              <textarea
                value={item.description}
                onChange={(e) => updateDesc(item.id, e.target.value)}
                placeholder="Description"
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none resize-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
              />
            </div>
            <button
              onClick={() => remove(item.id)}
              className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 mt-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Add item
      </button>
      {updatedAt && <LastUpdated date={updatedAt} />}
    </div>
  );
}

function SaveRow({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  return (
    <div className="flex justify-end pt-4 border-t border-gray-100">
      <button
        onClick={onSave}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm cursor-pointer",
          saved ? "bg-emerald-500" : "hover:opacity-90"
        )}
        style={saved ? {} : { background: BRAND_GRADIENT }}
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" />
            Saved
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Changes
          </>
        )}
      </button>
    </div>
  );
}

function ContentCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        {icon && <span className="text-gray-500">{icon}</span>}
        <h3 className="text-[14px] font-bold text-gray-900">{title}</h3>
      </div>
      <div className="px-5 py-5 space-y-5">
        {children}
        <SaveRow onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }} saved={saved} />
      </div>
    </div>
  );
}

/* ─── Banner Color Options ───────────────────────────────────────── */

const BANNER_COLORS = [
  { id: "blue",   bg: "#1650AB" },
  { id: "amber",  bg: "#D97706" },
  { id: "green",  bg: "#059669" },
  { id: "red",    bg: "#DC2626" },
  { id: "purple", bg: "#7C3AED" },
  { id: "dark",   bg: "#111827" },
];

/* ─── Category Panels ────────────────────────────────────────────── */

function GlobalPanel() {
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerText, setBannerText] = useState("Welcome to NorthUnion — your trusted digital asset platform.");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerColor, setBannerColor] = useState("blue");
  const [bannerSaved, setBannerSaved] = useState(false);
  const [headerTagline, setHeaderTagline] = useState("Here's what's happening with your portfolio today");
  const [frozenMsg, setFrozenMsg] = useState("Your account has been temporarily restricted. Please contact support.");

  const selectedBg = BANNER_COLORS.find((c) => c.id === bannerColor)?.bg ?? "#1650AB";

  return (
    <div className="space-y-6">
      {/* Announcement Banner Card */}
      <div className="rounded-xl border-2 border-blue-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: BRAND_GRADIENT }}>
          <div className="flex items-center gap-2.5">
            <Megaphone className="h-[18px] w-[18px] text-white" />
            <h3 className="text-[14px] font-bold text-white">Announcement Banner</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-white/80 font-medium">{bannerEnabled ? "Live" : "Hidden"}</span>
            <button onClick={() => setBannerEnabled((v) => !v)} className="text-white cursor-pointer">
              {bannerEnabled
                ? <ToggleRight className="h-7 w-7 text-emerald-300" />
                : <ToggleLeft className="h-7 w-7 text-white/50" />}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="px-5 pt-4">
          <FieldLabel>Live Preview</FieldLabel>
          <div
            className="rounded-lg px-4 py-3 text-sm font-semibold flex items-center gap-2"
            style={{ backgroundColor: selectedBg, color: "white" }}
          >
            <Info className="h-4 w-4 shrink-0 opacity-80" />
            <span className="flex-1 truncate">{bannerText || "Banner text will appear here..."}</span>
            {bannerUrl && <span className="underline opacity-80 text-xs shrink-0">Learn more →</span>}
          </div>
          {!bannerEnabled && (
            <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Banner is hidden — toggle ON to show it to users.
            </p>
          )}
        </div>

        <div className="px-5 py-5 space-y-5">
          <TextField
            label="Banner Message"
            value={bannerText}
            onChange={setBannerText}
            placeholder="Enter announcement text..."
            updatedAt="Jul 9, 2026 at 10:00 AM"
          />

          <div>
            <FieldLabel>Link URL (optional)</FieldLabel>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://northunion.ca/announcement"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Color Theme</FieldLabel>
            <div className="flex flex-wrap gap-2 mt-1">
              {BANNER_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setBannerColor(c.id)}
                  title={c.id}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 cursor-pointer transition-transform hover:scale-110",
                    bannerColor === c.id ? "border-gray-900 scale-110 shadow-md" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.bg }}
                />
              ))}
            </div>
          </div>

          <SaveRow
            onSave={() => { setBannerSaved(true); setTimeout(() => setBannerSaved(false), 2000); }}
            saved={bannerSaved}
          />
        </div>
      </div>

      <ContentCard title="Header Tagline" icon={<LayoutDashboard className="h-4 w-4" />}>
        <TextField
          label="Text shown in the dashboard top header bar"
          value={headerTagline}
          onChange={setHeaderTagline}
          updatedAt="Jul 5, 2026 at 2:15 PM"
        />
      </ContentCard>

      <ContentCard title="Account Frozen Message" icon={<AlertTriangle className="h-4 w-4" />}>
        <TextField
          label="Message shown to users whose account is frozen"
          value={frozenMsg}
          onChange={setFrozenMsg}
          multiline
          rows={2}
          updatedAt="Jun 28, 2026 at 9:00 AM"
        />
      </ContentCard>
    </div>
  );
}

function DashboardPanel() {
  const [emptyWallets, setEmptyWallets] = useState("Make a deposit to get started");
  const [emptyAssets, setEmptyAssets] = useState("Deposit to see your allocation");
  const [emptyTx, setEmptyTx] = useState("No recent transactions");

  return (
    <div className="space-y-6">
      <ContentCard title="Empty State Messages" icon={<LayoutDashboard className="h-4 w-4" />}>
        <TextField label="No wallets — sub-text" value={emptyWallets} onChange={setEmptyWallets} updatedAt="Jul 1, 2026 at 11:30 AM" />
        <TextField label="No assets in allocation chart" value={emptyAssets} onChange={setEmptyAssets} updatedAt="Jul 1, 2026 at 11:30 AM" />
        <TextField label="No recent transactions" value={emptyTx} onChange={setEmptyTx} updatedAt="Jul 1, 2026 at 11:30 AM" />
      </ContentCard>
    </div>
  );
}

function DepositPanel() {
  const [pageSubheading, setPageSubheading] = useState("Select an asset, review the network, then scan the company deposit QR.");
  const [infoBox, setInfoBox] = useState("The QR contains the fixed company deposit address for this asset and network. The address is intentionally not displayed as plain text on this screen.");
  const [warningBox, setWarningBox] = useState("Sending the wrong asset or network can permanently lose funds.");
  const [cadBlocked, setCadBlocked] = useState("Canadian regulations absolutely forbid CAD deposits on fraud-refund accounts. The deposit function is permanently disabled.");
  const [successTitle, setSuccessTitle] = useState("Deposit QR ready");
  const [successBody, setSuccessBody] = useState("Scan the QR from your external wallet and send only on the selected network.");
  const [instructions, setInstructions] = useState<ListItem[]>(makeList([
    "Send only the selected asset on the correct network.",
    "The QR uses a fixed company deposit address configured by admin.",
    "Minimum deposit applies — check the amount field.",
    "Requires the specified number of network confirmations.",
    "Funds are reviewed manually before balance credit.",
  ]));

  return (
    <div className="space-y-6">
      <ContentCard title="Page Header" icon={<ArrowDownToLine className="h-4 w-4" />}>
        <TextField label="Page Subheading" value={pageSubheading} onChange={setPageSubheading} updatedAt="Jul 3, 2026 at 9:00 AM" />
      </ContentCard>

      <ContentCard title="Important Instructions Block" icon={<AlertTriangle className="h-4 w-4" />}>
        <p className="text-[12px] text-gray-500 -mt-1 mb-2">Shown in the amber sidebar box (Steps 1 &amp; 3).</p>
        <ListEditor label="Instruction Bullet Points" items={instructions} onChange={setInstructions} updatedAt="Jul 9, 2026 at 8:45 AM" />
      </ContentCard>

      <ContentCard title="Info &amp; Warning Boxes" icon={<Info className="h-4 w-4" />}>
        <TextField label="Blue info box text (Step 1)" value={infoBox} onChange={setInfoBox} multiline rows={3} updatedAt="Jul 2, 2026 at 4:00 PM" />
        <TextField label="Amber warning box text (Step 2)" value={warningBox} onChange={setWarningBox} updatedAt="Jul 2, 2026 at 4:00 PM" />
        <TextField label="Green success box title (Step 3)" value={successTitle} onChange={setSuccessTitle} updatedAt="Jul 2, 2026 at 4:00 PM" />
        <TextField label="Green success box body (Step 3)" value={successBody} onChange={setSuccessBody} updatedAt="Jul 2, 2026 at 4:00 PM" />
      </ContentCard>

      <ContentCard title="CAD Deposit Blocked Message" icon={<AlertTriangle className="h-4 w-4" />}>
        <p className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mt-1 mb-2">
          Warning: This is a legal/regulatory message. Update with caution.
        </p>
        <TextField label="CAD fiat deposit blocked notice" value={cadBlocked} onChange={setCadBlocked} multiline rows={3} updatedAt="Jun 20, 2026 at 10:00 AM" />
      </ContentCard>
    </div>
  );
}

function WithdrawPanel() {
  const [pageSubheading, setPageSubheading] = useState("Transfer to your bank via Interac e-Transfer");
  const [feeAmount, setFeeAmount] = useState("2.50");
  const [partialErrMsg, setPartialErrMsg] = useState("For partial withdrawals, please contact support.");
  const [supportLink, setSupportLink] = useState("/support");
  const [importantBox, setImportantBox] = useState("Make sure the recipient email is correct. The recipient will need the security answer to claim the funds.");
  const [otpText, setOtpText] = useState("We have sent a 6-digit code to your registered email address.");

  return (
    <div className="space-y-6">
      <ContentCard title="Page Header" icon={<ArrowUpFromLine className="h-4 w-4" />}>
        <TextField label="Page Subheading" value={pageSubheading} onChange={setPageSubheading} updatedAt="Jul 3, 2026 at 9:00 AM" />
      </ContentCard>

      <ContentCard title="Transaction Fee" icon={<AlertTriangle className="h-4 w-4" />}>
        <p className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mt-1 mb-2">
          Warning: This updates the display only. Ensure backend fee logic is updated separately.
        </p>
        <TextField
          label="Withdrawal fee amount (CAD)"
          value={feeAmount}
          onChange={setFeeAmount}
          placeholder="2.50"
          helper="Displayed as '$X.XX CAD' in the transaction summary. Numeric value only."
          updatedAt="Jul 5, 2026 at 3:00 PM"
        />
      </ContentCard>

      <ContentCard title="Partial Withdrawal Error Message" icon={<Info className="h-4 w-4" />}>
        <TextField label="Error message text" value={partialErrMsg} onChange={setPartialErrMsg} updatedAt="Jul 8, 2026 at 5:30 PM" />
        <TextField
          label="Support link URL"
          value={supportLink}
          onChange={setSupportLink}
          placeholder="/support"
          helper="The URL that 'support' links to in the error message."
          updatedAt="Jul 8, 2026 at 5:30 PM"
        />
      </ContentCard>

      <ContentCard title="Step 2 — Recipient Details Important Box" icon={<AlertTriangle className="h-4 w-4" />}>
        <TextField label="Important box body text" value={importantBox} onChange={setImportantBox} multiline rows={3} updatedAt="Jul 2, 2026 at 11:00 AM" />
      </ContentCard>

      <ContentCard title="Step 3 — 2FA Instruction Text" icon={<Info className="h-4 w-4" />}>
        <TextField label="OTP instruction text" value={otpText} onChange={setOtpText} updatedAt="Jul 1, 2026 at 9:00 AM" />
      </ContentCard>
    </div>
  );
}

function WalletsPanel() {
  const [cadTitle, setCadTitle] = useState("Withdrawal Only");
  const [cadBody, setCadBody] = useState("This wallet is only suitable for withdrawals. CAD deposits are not accepted on this platform due to Canadian regulations.");
  const [instructions, setInstructions] = useState<ListItem[]>(makeList([
    "Only send {asset name} to this address",
    "Minimum deposit: 0.0005 BTC / 0.01 ETH / 5.0 USDT",
    "Requires 3 network confirmations",
    "Submit transaction hash on deposit request page after sending",
  ]));
  const [confirmations, setConfirmations] = useState("3");

  return (
    <div className="space-y-6">
      <ContentCard title="CAD Wallet Regulatory Notice" icon={<AlertTriangle className="h-4 w-4" />}>
        <p className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mt-1 mb-2">
          Warning: This is a legal/regulatory message. Update with caution.
        </p>
        <TextField label="Notice heading" value={cadTitle} onChange={setCadTitle} updatedAt="Jun 20, 2026 at 10:00 AM" />
        <TextField label="Notice body text" value={cadBody} onChange={setCadBody} multiline rows={3} updatedAt="Jun 20, 2026 at 10:00 AM" />
      </ContentCard>

      <ContentCard title="Important Instructions Block" icon={<Info className="h-4 w-4" />}>
        <p className="text-[12px] text-gray-500 -mt-1 mb-2">
          Shown for crypto wallets. Use {"{asset name}"} and {"{symbol}"} as dynamic placeholders.
        </p>
        <ListEditor label="Instruction Bullet Points" items={instructions} onChange={setInstructions} updatedAt="Jul 9, 2026 at 8:45 AM" />
        <TextField
          label="Network confirmations required"
          value={confirmations}
          onChange={setConfirmations}
          placeholder="3"
          helper="Used in the 'Requires X network confirmations' bullet. Numeric value."
          updatedAt="Jul 9, 2026 at 8:45 AM"
        />
      </ContentCard>
    </div>
  );
}

function BuySellPanel() {
  const [subheading, setSubheading] = useState("Live Binance market data for crypto charting and market stats");
  const [disclaimer, setDisclaimer] = useState("Orders are reviewed before confirmation. Live Binance market price may change.");
  const [buyFee, setBuyFee] = useState("0.50");
  const [sellFee, setSellFee] = useState("0.40");

  return (
    <div className="space-y-6">
      <ContentCard title="Page Header" icon={<BarChart3 className="h-4 w-4" />}>
        <TextField label="Page Subheading" value={subheading} onChange={setSubheading} updatedAt="Jul 3, 2026 at 9:00 AM" />
      </ContentCard>

      <ContentCard title="Trade Fees" icon={<AlertTriangle className="h-4 w-4" />}>
        <p className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mt-1 mb-2">
          Warning: This updates the display only. Ensure Supabase RPC fee calculations are updated separately.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Buy fee (%)" value={buyFee} onChange={setBuyFee} placeholder="0.50" helper="Displayed as 'Fee (0.XX%)' in the order panel." updatedAt="Jul 5, 2026 at 3:00 PM" />
          <TextField label="Sell fee (%)" value={sellFee} onChange={setSellFee} placeholder="0.40" helper="Displayed as 'Fee (0.XX%)' in the order panel." updatedAt="Jul 5, 2026 at 3:00 PM" />
        </div>
      </ContentCard>

      <ContentCard title="Order Panel Disclaimer" icon={<Info className="h-4 w-4" />}>
        <TextField label="Disclaimer text (shown below execute button)" value={disclaimer} onChange={setDisclaimer} multiline rows={2} updatedAt="Jul 2, 2026 at 11:00 AM" />
      </ContentCard>
    </div>
  );
}

function KycPanel() {
  const [heading, setHeading] = useState("Identity Verification");
  const [subheading, setSubheading] = useState("Complete KYC to unlock your account");
  const [processingTime, setProcessingTime] = useState("1-2 business days");
  const [thankYou, setThankYou] = useState("Thank you for submitting your documents.\nOur team is reviewing your information.\nThis typically takes 1-2 business days.");
  const [selfieGuides, setSelfieGuides] = useState<ListItem[]>(makeList([
    "Face clearly visible",
    "Good lighting",
    "No sunglasses or hats",
    "Neutral expression",
  ]));
  const [whatNext, setWhatNext] = useState<ListItem[]>(makeList([
    "We'll verify your identity documents",
    "You'll receive an email when approved",
    "You can then access your full account",
  ]));

  return (
    <div className="space-y-6">
      <ContentCard title="Page Header" icon={<FileCheck className="h-4 w-4" />}>
        <TextField label="Page Heading" value={heading} onChange={setHeading} updatedAt="Jul 1, 2026 at 9:00 AM" />
        <TextField label="Page Subheading" value={subheading} onChange={setSubheading} updatedAt="Jul 1, 2026 at 9:00 AM" />
      </ContentCard>

      <ContentCard title="Selfie Guidelines" icon={<Info className="h-4 w-4" />}>
        <ListEditor label="Guidelines shown in Selfie Upload step" items={selfieGuides} onChange={setSelfieGuides} updatedAt="Jul 3, 2026 at 2:00 PM" />
      </ContentCard>

      <ContentCard title="Post-Submission Messages" icon={<Clock className="h-4 w-4" />}>
        <TextField
          label="Processing time"
          value={processingTime}
          onChange={setProcessingTime}
          placeholder="1-2 business days"
          helper="Shown as 'This typically takes X' on the pending screen."
          updatedAt="Jul 6, 2026 at 10:00 AM"
        />
        <TextField label="Thank-you body text" value={thankYou} onChange={setThankYou} multiline rows={4} updatedAt="Jul 6, 2026 at 10:00 AM" />
        <ListEditor label="'What happens next?' bullet points" items={whatNext} onChange={setWhatNext} updatedAt="Jul 6, 2026 at 10:00 AM" />
      </ContentCard>
    </div>
  );
}

function SettingsPanel() {
  const [dailyUnverified, setDailyUnverified] = useState("1,000");
  const [dailyVerified, setDailyVerified] = useState("5,000,000");
  const [monthlyUnverified, setMonthlyUnverified] = useState("10,000");
  const [monthlyVerified, setMonthlyVerified] = useState("50,000,000");

  return (
    <div className="space-y-6">
      <ContentCard title="Withdrawal Limits Display" icon={<Settings className="h-4 w-4" />}>
        <p className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mt-1 mb-2">
          Warning: These are display-only values. Actual enforcement must be updated in the backend separately.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Daily limit — Unverified (CAD)" value={dailyUnverified} onChange={setDailyUnverified} placeholder="1,000" helper="Shown to users without KYC." updatedAt="Jun 15, 2026 at 9:00 AM" />
          <TextField label="Daily limit — Verified (CAD)" value={dailyVerified} onChange={setDailyVerified} placeholder="5,000,000" helper="Shown to KYC-verified users." updatedAt="Jun 15, 2026 at 9:00 AM" />
          <TextField label="Monthly limit — Unverified (CAD)" value={monthlyUnverified} onChange={setMonthlyUnverified} placeholder="10,000" updatedAt="Jun 15, 2026 at 9:00 AM" />
          <TextField label="Monthly limit — Verified (CAD)" value={monthlyVerified} onChange={setMonthlyVerified} placeholder="50,000,000" updatedAt="Jun 15, 2026 at 9:00 AM" />
        </div>
      </ContentCard>
    </div>
  );
}

function SupportPanel() {
  const [description, setDescription] = useState("Contact support for deposit, withdrawal, KYC, login, portfolio, and security issues.");
  const [responseTarget, setResponseTarget] = useState("Under 5 minutes");
  const [secureAttachments, setSecureAttachments] = useState("Screenshots and documents");
  const [ticketHistory, setTicketHistory] = useState("Always available");
  const [openingMsg, setOpeningMsg] = useState("Hi! How can we help you today? Describe your issue and we'll get back to you as soon as possible.");

  return (
    <div className="space-y-6">
      <ContentCard title="Page Header" icon={<HeadphonesIcon className="h-4 w-4" />}>
        <TextField label="Page Description" value={description} onChange={setDescription} multiline rows={2} updatedAt="Jul 1, 2026 at 9:00 AM" />
      </ContentCard>

      <ContentCard title="Support Stats Cards" icon={<Info className="h-4 w-4" />}>
        <p className="text-[12px] text-gray-500 -mt-1 mb-2">The three info cards shown at the top of the Support page.</p>
        <TextField
          label="Response target SLA"
          value={responseTarget}
          onChange={setResponseTarget}
          placeholder="Under 5 minutes"
          helper="Client-facing SLA commitment. Update carefully."
          updatedAt="Jul 4, 2026 at 11:00 AM"
        />
        <TextField label="Secure attachments description" value={secureAttachments} onChange={setSecureAttachments} updatedAt="Jul 4, 2026 at 11:00 AM" />
        <TextField label="Ticket history description" value={ticketHistory} onChange={setTicketHistory} updatedAt="Jul 4, 2026 at 11:00 AM" />
      </ContentCard>

      <ContentCard title="Chat Opening Message" icon={<Info className="h-4 w-4" />}>
        <TextField label="Default greeting shown when chat opens" value={openingMsg} onChange={setOpeningMsg} multiline rows={3} updatedAt="Jul 7, 2026 at 2:00 PM" />
      </ContentCard>
    </div>
  );
}

function LandingPanel() {
  // Hero
  const [trustBadge, setTrustBadge] = useState("FINTRAC registered · CDIC-style insured deposits");
  const [heroHeadline, setHeroHeadline] = useState("Banking Meets\nCrypto\nIntelligence");
  const [heroBody, setHeroBody] = useState("A regulated Canadian digital bank with a built-in crypto engine. Move money, save smarter, and invest in digital assets — all from one elegant, insured account.");
  const [heroBtn1, setHeroBtn1] = useState("Open Account");
  const [heroBtn2, setHeroBtn2] = useState("Explore Platform");
  const [heroStats, setHeroStats] = useState<ListItem[]>(makeList(["2M+ / Canadians onboard", "$2.4B / Assets secured", "4.9 / App Store"]));

  // Features
  const [featHeading, setFeatHeading] = useState("Everything a modern Canadian needs from a bank.");
  const [featSub, setFeatSub] = useState("We've rebuilt banking from the ground up to support both your traditional financial needs and your digital asset investments.");
  const [featBtn, setFeatBtn] = useState("Explore all features");
  const [featList, setFeatList] = useState<ComplexListItem[]>(makeComplexList([
    { title: "Crypto + Fiat Wallet", description: "Hold CAD and digital assets side by side in one unified interface." },
    { title: "Instant e-Transfer", description: "Send and receive Interac e-Transfers in seconds, free of charge." },
    { title: "Crypto Investing", description: "Buy and sell 50+ cryptocurrencies with low, transparent fees." },
    { title: "Global Transfers", description: "Send money internationally at mid-market rates with zero hidden markups." },
    { title: "Smart Savings", description: "Earn high-yield interest on your Canadian Dollar deposits automatically." },
    { title: "AI Financial Insights", description: "Get personalized alerts and insights to optimize your spending and saving." },
    { title: "Portfolio Tracking", description: "Monitor your entire net worth with beautiful, real-time exotic curves." }
  ]));

  // Digital Assets
  const [assetsOverline, setAssetsOverline] = useState("Digital Banking");
  const [assetsHeading, setAssetsHeading] = useState("Digital assets, held to a higher standard.");

  // Onboarding
  const [onboardOverline, setOnboardOverline] = useState("Getting Started");
  const [onboardHeading, setOnboardHeading] = useState("From signup to first trade in minutes.");
  const [onboardList, setOnboardList] = useState<ComplexListItem[]>(makeComplexList([
    { title: "Create your account", description: "Sign up online. ID documents and social insurance number required." },
    { title: "Verify your Identity", description: "Government-issued ID, powered by Interac. Approved in minutes." },
    { title: "Start banking & investing", description: "Load your account, buy crypto, save smarter, and earn through the app." }
  ]));

  // App Preview
  const [appOverline, setAppOverline] = useState("Your Pocket Branch");
  const [appHeading, setAppHeading] = useState("Your entire financial life, in your pocket.");
  const [appBody, setAppBody] = useState("Send money, manage cards, track investments and oversee your crypto portfolio — all from one beautifully designed interface.");
  const [appBenefits, setAppBenefits] = useState<ListItem[]>(makeList([
    "Portfolio profiles with live data and live exotic curves",
    "Portfolio analytics with your daily and live exotic curves",
    "Instant e-Transfers, bill pay, and crypto through the app"
  ]));

  // CTA
  const [ctaOverline, setCtaOverline] = useState("Your Financial Future");
  const [ctaHeading, setCtaHeading] = useState("Your Financial Future, Unified.");
  const [ctaBody, setCtaBody] = useState("Join 2M+ Canadians saving, banking and investing — with the confidence of regulation and the speed of crypto.");
  const [ctaBtn1, setCtaBtn1] = useState("Open Account");
  const [ctaBtn2, setCtaBtn2] = useState("Talk to our Team");

  // Footer
  const [footerTagline, setFooterTagline] = useState("A modern Canadian digital bank uniting traditional finance with regulated digital assets.");
  const [footerReg, setFooterReg] = useState("Canadian National Trust Bank is a federally regulated Canadian financial institution. FINTRAC #M24-0042001.");
  const [footerCopy, setFooterCopy] = useState("© 2026 Canadian National Trust Bank, Inc. All rights reserved.");
  const [footerLinks, setFooterLinks] = useState<ComplexListItem[]>(makeComplexList([
    { title: "Company", description: "About, Careers, Press, Blog" },
    { title: "Products", description: "Banking, Crypto, Savings, Cards" },
    { title: "Legal", description: "Terms, Privacy, Cookies, Disclosures" },
    { title: "Security", description: "Trust center, Vulnerability, Status, Audits" }
  ]));

  return (
    <div className="space-y-6">
      <ContentCard title="1. Hero Section" icon={<Globe className="h-4 w-4" />}>
        <TextField label="Trust Badge Text" value={trustBadge} onChange={setTrustBadge} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <TextField label="Main Headline" value={heroHeadline} onChange={setHeroHeadline} multiline rows={3} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <TextField label="Body Copy" value={heroBody} onChange={setHeroBody} multiline rows={3} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Primary CTA Button" value={heroBtn1} onChange={setHeroBtn1} updatedAt="Jul 9, 2026 at 10:00 AM" />
          <TextField label="Secondary CTA Button" value={heroBtn2} onChange={setHeroBtn2} updatedAt="Jul 9, 2026 at 10:00 AM" />
        </div>
        <ListEditor label="Hero Stats (Format: Value / Label)" items={heroStats} onChange={setHeroStats} updatedAt="Jul 9, 2026 at 10:00 AM" />
      </ContentCard>

      <ContentCard title="2. Features Section" icon={<Globe className="h-4 w-4" />}>
        <TextField label="Section Heading" value={featHeading} onChange={setFeatHeading} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <TextField label="Section Subheading" value={featSub} onChange={setFeatSub} multiline rows={2} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <TextField label="CTA Button Label" value={featBtn} onChange={setFeatBtn} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <ComplexListEditor label="Feature Cards (Title & Description)" items={featList} onChange={setFeatList} updatedAt="Jul 9, 2026 at 10:00 AM" />
      </ContentCard>

      <ContentCard title="3. Digital Assets Section" icon={<Globe className="h-4 w-4" />}>
        <TextField label="Overline Text" value={assetsOverline} onChange={setAssetsOverline} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <TextField label="Section Heading" value={assetsHeading} onChange={setAssetsHeading} updatedAt="Jul 9, 2026 at 10:00 AM" />
      </ContentCard>

      <ContentCard title="4. Onboarding Section" icon={<Globe className="h-4 w-4" />}>
        <TextField label="Overline Text" value={onboardOverline} onChange={setOnboardOverline} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <TextField label="Section Heading" value={onboardHeading} onChange={setOnboardHeading} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <ComplexListEditor label="Steps (Title & Description)" items={onboardList} onChange={setOnboardList} updatedAt="Jul 9, 2026 at 10:00 AM" />
      </ContentCard>

      <ContentCard title="5. App Preview Section" icon={<Globe className="h-4 w-4" />}>
        <TextField label="Overline Text" value={appOverline} onChange={setAppOverline} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <TextField label="Section Heading" value={appHeading} onChange={setAppHeading} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <TextField label="Section Body" value={appBody} onChange={setAppBody} multiline rows={2} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <ListEditor label="Benefits List" items={appBenefits} onChange={setAppBenefits} updatedAt="Jul 9, 2026 at 10:00 AM" />
      </ContentCard>

      <ContentCard title="6. CTA Section" icon={<Globe className="h-4 w-4" />}>
        <TextField label="Overline Text" value={ctaOverline} onChange={setCtaOverline} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <TextField label="Section Heading" value={ctaHeading} onChange={setCtaHeading} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <TextField label="Section Body" value={ctaBody} onChange={setCtaBody} multiline rows={2} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Primary CTA Button" value={ctaBtn1} onChange={setCtaBtn1} updatedAt="Jul 9, 2026 at 10:00 AM" />
          <TextField label="Secondary CTA Button" value={ctaBtn2} onChange={setCtaBtn2} updatedAt="Jul 9, 2026 at 10:00 AM" />
        </div>
      </ContentCard>

      <ContentCard title="7. Footer" icon={<Globe className="h-4 w-4" />}>
        <TextField label="Tagline" value={footerTagline} onChange={setFooterTagline} multiline rows={2} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <TextField label="Regulatory Text" value={footerReg} onChange={setFooterReg} multiline rows={2} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <TextField label="Copyright Text" value={footerCopy} onChange={setFooterCopy} updatedAt="Jul 9, 2026 at 10:00 AM" />
        <ComplexListEditor label="Footer Links (Category Name & Links List)" items={footerLinks} onChange={setFooterLinks} updatedAt="Jul 9, 2026 at 10:00 AM" />
      </ContentCard>
    </div>
  );
}

/* ─── Panel Router ───────────────────────────────────────────────── */

function PanelForCategory({ id }: { id: CategoryId }) {
  switch (id) {
    case "global":    return <GlobalPanel />;
    case "dashboard": return <DashboardPanel />;
    case "deposit":   return <DepositPanel />;
    case "withdraw":  return <WithdrawPanel />;
    case "wallets":   return <WalletsPanel />;
    case "buysell":   return <BuySellPanel />;
    case "kyc":       return <KycPanel />;
    case "settings":  return <SettingsPanel />;
    case "support":   return <SupportPanel />;
    case "landing":   return <LandingPanel />;
    default:          return null;
  }
}

/* ─── Main Page ──────────────────────────────────────────────────── */

export default function ContentManagementPage() {
  return (
    <RequirePermission permission="edit-settings">
      <ContentManagementPageContent />
    </RequirePermission>
  );
}

function ContentManagementPageContent() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("global");
  const activeLabel = CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-bold leading-tight text-gray-900 sm:text-[28px]">
          Content Management
        </h1>
        <p className="text-sm text-gray-500">
          Edit website text, labels, messages, and announcements shown to clients — no code required.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Inner Sidebar */}
        <aside className="w-[210px] shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden sticky top-[88px]">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Content Categories</p>
          </div>
          <nav className="py-2">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-all text-left group cursor-pointer",
                    isActive
                      ? "text-white"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  style={isActive ? { background: BRAND_GRADIENT } : {}}
                >
                  <Icon
                    className={cn("h-[14px] w-[14px] shrink-0", isActive ? "text-white" : "text-gray-500 group-hover:text-gray-700")}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span className="flex-1 truncate">{cat.label}</span>
                  {cat.badge && !isActive && (
                    <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full shrink-0">
                      {cat.badge}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 text-white/70 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-[12px] font-semibold text-gray-400">Content Management</span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
            <span className="text-[12px] font-bold text-gray-700">{activeLabel}</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
            >
              <PanelForCategory id={activeCategory} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

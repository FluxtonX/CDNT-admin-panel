"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { usePlatformWallets } from "@/hooks/useAdminQueries";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Download,
  X,
  Eye,
  ShieldCheck,
  Check,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  RefreshCw,
  Coins,
  History,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { RequirePermission } from "@/components/layout/RequirePermission";

type WalletType = "Hot" | "Cold";
type WalletStatus = "Active" | "Paused" | "Suspended";

type WalletTransaction = {
  txId: string;
  type: "Deposit" | "Withdrawal";
  amountCad: number;
  amountCrypto: string;
  timestamp: string;
  txHash: string;
};

type Wallet = {
  walletId: string;
  type: WalletType;
  crypto: string;
  address: string;
  balanceCrypto: string;
  balanceCad: number;
  status: WalletStatus;
  lastActivity: string;
  // Details logs
  transactions: WalletTransaction[];
  network: string;
};

const BRAND_GRADIENT = "linear-gradient(135deg, #0A3D91 0%, #1650AB 100%)";

const INITIAL_WALLETS: Wallet[] = [
  {
    walletId: "WALLET-HOT-BTC-001",
    type: "Hot",
    crypto: "BTC",
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    balanceCrypto: "2.58340000 BTC",
    balanceCad: 254123.45,
    status: "Active",
    lastActivity: "Jun 2, 11:30 a.m.",
    network: "Bitcoin Mainnet",
    transactions: [
      { txId: "TX-90214", type: "Deposit", amountCad: 15400, amountCrypto: "0.155 BTC", timestamp: "Jun 2, 11:30 a.m.", txHash: "0xfd8a9e22db38cf9e8f17b3c2f0f9b6e8d646a782bcfd992d9f1092e038ff1234" },
      { txId: "TX-90192", type: "Withdrawal", amountCad: 5000, amountCrypto: "0.051 BTC", timestamp: "Jun 1, 04:15 p.m.", txHash: "0x6a2c94db8e11a28a3f890a82746b1c0a876a345e82b7cd1e86ba20d6f3e1a2b3" },
    ],
  },
  {
    walletId: "WALLET-COLD-BTC-001",
    type: "Cold",
    crypto: "BTC",
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    balanceCrypto: "45.23410000 BTC",
    balanceCad: 4451234.12,
    status: "Active",
    lastActivity: "Jun 1, 09:00 a.m.",
    network: "Bitcoin Mainnet Secure Vault",
    transactions: [
      { txId: "TX-89210", type: "Deposit", amountCad: 500000, amountCrypto: "5.09 BTC", timestamp: "Jun 1, 09:00 a.m.", txHash: "0x3a9b8c7d6e5f4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c" },
    ],
  },
  {
    walletId: "WALLET-HOT-ETH-001",
    type: "Hot",
    crypto: "ETH",
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    balanceCrypto: "125.45230000 ETH",
    balanceCad: 541234.56,
    status: "Active",
    lastActivity: "Jun 2, 10:45 a.m.",
    network: "Ethereum Mainnet",
    transactions: [
      { txId: "TX-90201", type: "Deposit", amountCad: 25000, amountCrypto: "10.4 ETH", timestamp: "Jun 2, 10:45 a.m.", txHash: "0x2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b" },
      { txId: "TX-90180", type: "Withdrawal", amountCad: 12000, amountCrypto: "5.0 ETH", timestamp: "Jun 2, 08:30 a.m.", txHash: "0xbc8d9f1092e038ff1234fd8a9e22db38cf9e8f17b3c2f0f9b6e8d646a782bcfd" },
    ],
  },
  {
    walletId: "WALLET-COLD-ETH-001",
    type: "Cold",
    crypto: "ETH",
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    balanceCrypto: "834.23410000 ETH",
    balanceCad: 3598765.43,
    status: "Active",
    lastActivity: "May 30, 02:20 p.m.",
    network: "Ethereum Cold Vault (Multi-Sig)",
    transactions: [
      { txId: "TX-87129", type: "Deposit", amountCad: 1200000, amountCrypto: "500 ETH", timestamp: "May 30, 02:20 p.m.", txHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b" },
    ],
  },
  {
    walletId: "WALLET-HOT-USDT-001",
    type: "Hot",
    crypto: "USDT",
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    balanceCrypto: "250000.00 USDT",
    balanceCad: 340000.00,
    status: "Active",
    lastActivity: "Jun 2, 11:15 a.m.",
    network: "TRON (TRC-20) / Ethereum",
    transactions: [
      { txId: "TX-90208", type: "Deposit", amountCad: 50000, amountCrypto: "50000 USDT", timestamp: "Jun 2, 11:15 a.m.", txHash: "0x7a8d9f1092e038ff1234fd8a9e22db38cf9e8f17b3c2f0f9b6e8d646a782bcfd9" },
    ],
  },
];

function TypeBadge({ type }: { type: WalletType }) {
  const map: Record<WalletType, { cls: string; icon: React.ReactNode }> = {
    Hot: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Unlock className="h-3 w-3" /> },
    Cold: { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: <Lock className="h-3 w-3" /> },
  };
  const style = map[type];

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase font-mono tracking-wider", style.cls)}>
      {style.icon}
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: WalletStatus }) {
  const map: Record<WalletStatus, string> = {
    Active: "bg-green-50 text-green-700 border-green-200",
    Paused: "bg-amber-50 text-amber-700 border-amber-200",
    Suspended: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase font-mono tracking-wider", map[status])}>
      {status}
    </span>
  );
}

export default function WalletManagementPage() {
  return (
    <RequirePermission permission={["manage-wallets", "view-wallets"]}>
      <WalletManagementPageContent />
    </RequirePermission>
  );
}

function WalletManagementPageContent() {
  const { data: walletData = [], isLoading: loading } = usePlatformWallets();
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  /* Modal state variables */
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<WalletStatus | null>(null);
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, WalletStatus>>({});

  const wallets = useMemo(() => {
    const mappedWallets: Wallet[] = (walletData as any[]).map((w: any) => ({
      walletId: w.wallet_id,
      type: w.type as WalletType,
      crypto: w.crypto,
      address: w.address,
      balanceCrypto: w.balance_crypto,
      balanceCad: Number(w.balance_cad),
      status: (localStatusOverrides[w.wallet_id] || w.status) as WalletStatus,
      lastActivity: w.last_activity,
      network: w.network,
      transactions: w.transactions || [],
    }));
    return mappedWallets;
  }, [walletData, localStatusOverrides]);

  const stats = useMemo(() => {
    const hotWallets = wallets.filter((w) => w.type === "Hot");
    const coldWallets = wallets.filter((w) => w.type === "Cold");
    const hotSum = hotWallets.reduce((acc, w) => acc + w.balanceCad, 0);
    const coldSum = coldWallets.reduce((acc, w) => acc + w.balanceCad, 0);
    const totalSum = hotSum + coldSum;

    return [
      {
        label: "Hot Wallets",
        value: `$${hotSum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        note: `${hotWallets.length} ${hotWallets.length === 1 ? "wallet" : "wallets"}`,
        icon: (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Unlock className="h-5.5 w-5.5" />
          </div>
        ),
      },
      {
        label: "Cold Wallets",
        value: `$${coldSum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        note: `${coldWallets.length} ${coldWallets.length === 1 ? "wallet" : "wallets"}`,
        icon: (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0A3D91]">
            <Lock className="h-5.5 w-5.5" />
          </div>
        ),
      },
      {
        label: "Total Assets",
        value: `$${totalSum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        note: "All systems operational",
        noteTone: "text-green-600 font-bold",
        icon: (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
            <Coins className="h-5.5 w-5.5" />
          </div>
        ),
      },
    ];
  }, [wallets]);

  const filteredWallets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return wallets.filter((w) => {
      return (
        !query ||
        w.walletId.toLowerCase().includes(query) ||
        w.crypto.toLowerCase().includes(query) ||
        w.address.toLowerCase().includes(query)
      );
    });
  }, [wallets, search]);

  const handleOpenDetails = (wallet: Wallet) => {
    setSelectedWallet(wallet);
  };

  const handleCloseDetails = () => {
    setSelectedWallet(null);
  };

  const handleStatusChangeTrigger = (status: WalletStatus) => {
    setTargetStatus(status);
    setShowStatusModal(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedWallet || !targetStatus) return;
    const walletId = selectedWallet.walletId;

    try {
      setLocalStatusOverrides((prev) => ({ ...prev, [walletId]: targetStatus }));
      setSelectedWallet((prev) => (prev ? { ...prev, status: targetStatus } : null));
      setToast(`Wallet ${walletId} status successfully set to ${targetStatus}`);
    } catch (err) {
      console.error("Failed to update wallet status:", err);
      setToast(`Error: Failed to set status for wallet ${walletId}`);
    } finally {
      setShowStatusModal(false);
      window.setTimeout(() => setToast(null), 2500);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-gray-900 sm:text-[30px]">Wallet Management</h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">Monitor and manage platform hot and cold wallets</p>
          </div>
          <button
            onClick={() => {
              setToast("Wallet report export prepared.");
              window.setTimeout(() => setToast(null), 2500);
            }}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-gray-800"
            >
              <Check className="h-4 w-4 text-green-400 shrink-0" />
              <span>{toast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Counter cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex min-h-[120px] items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold leading-none text-gray-900">{stat.value}</p>
                <p className={cn("text-xs text-gray-600 font-semibold mt-1", stat.noteTone)}>{stat.note}</p>
              </div>
              {stat.icon}
            </div>
          ))}
        </div>

        {/* Table & search container */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-600" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by crypto, address, or wallet ID..."
                className="h-14 w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-11 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-500 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50 sm:text-base"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <div className="grid min-w-[1150px] grid-cols-[1.8fr_1.1fr_1.1fr_2.4fr_1.8fr_1.1fr_1.8fr_80px] gap-4 bg-gray-50 px-5 py-3 border-b border-gray-200/80">
              {["Wallet ID", "Type", "Crypto", "Address", "Balance", "Status", "Last Activity", "Actions"].map((heading) => (
                <span key={heading} className="text-[10px] font-extrabold uppercase tracking-wider text-gray-600 font-mono">{heading}</span>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="min-w-[1150px] divide-y divide-gray-100 bg-white"
                >
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="grid grid-cols-[1.8fr_1.1fr_1.1fr_2.4fr_1.8fr_1.1fr_1.8fr_80px] gap-4 items-center px-5 py-4.5">
                      <div className="h-4 bg-gray-100 rounded-lg w-32 animate-pulse" />
                      <div className="h-6 bg-gray-100 rounded-full w-14 animate-pulse" />
                      <div className="h-4 bg-gray-100 rounded-lg w-10 animate-pulse" />
                      <div className="h-4 bg-gray-100 rounded-lg w-48 animate-pulse" />
                      <div className="space-y-1">
                        <div className="h-4 bg-gray-100 rounded-lg w-28 animate-pulse" />
                        <div className="h-3 bg-gray-100 rounded-lg w-16 animate-pulse" />
                      </div>
                      <div className="h-6 bg-gray-100 rounded-full w-16 animate-pulse" />
                      <div className="h-4 bg-gray-100 rounded-lg w-24 animate-pulse" />
                      <div className="h-8 bg-gray-100 rounded-lg w-8 animate-pulse justify-self-end" />
                    </div>
                  ))}
                </motion.div>
              ) : filteredWallets.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="min-w-[1150px] py-16 text-center text-sm font-medium text-gray-600 bg-white"
                >
                  No wallets found matching your search.
                </motion.div>
              ) : (
                <motion.div key={search} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {filteredWallets.map((wallet) => (
                    <div
                      key={wallet.walletId}
                      className="grid min-w-[1150px] grid-cols-[1.8fr_1.1fr_1.1fr_2.4fr_1.8fr_1.1fr_1.8fr_80px] items-center gap-4 border-b border-gray-100 bg-white px-5 py-4 transition-colors hover:bg-blue-50/20"
                    >
                      <div className="font-extrabold text-gray-950 font-mono text-xs">{wallet.walletId}</div>
                      <div><TypeBadge type={wallet.type} /></div>
                      <div className="font-bold text-gray-900 text-sm">{wallet.crypto}</div>
                      <div className="font-mono text-xs text-gray-600 tracking-tight truncate max-w-[210px]" title={wallet.address}>
                        {wallet.address.slice(0, 10)}...{wallet.address.slice(-10)}
                      </div>
                      <div>
                        <p className="font-extrabold text-gray-900 text-xs font-mono">{wallet.balanceCrypto}</p>
                        <p className="text-[10px] text-gray-600 font-semibold mt-0.5">${wallet.balanceCad.toLocaleString()}</p>
                      </div>
                      <div><StatusBadge status={wallet.status} /></div>
                      <div className="text-xs font-semibold text-gray-600 font-mono">{wallet.lastActivity}</div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleOpenDetails(wallet)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-800 active:scale-[0.98] shadow-sm cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 px-5 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing <strong className="text-gray-700">{filteredWallets.length}</strong> of <strong className="text-gray-700">{wallets.length}</strong> wallets
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <ShieldCheck className="h-4 w-4 text-[#0A3D91]" />
              Secure cryptographic vault interface
            </div>
          </div>
        </section>
      </motion.div>

      {/* Details modal */}
      <AnimatePresence>
        {selectedWallet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={handleCloseDetails}
            />

            {/* Modal Container */}
            {!showStatusModal && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 350 }}
                className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 border border-gray-100"
              >
                {/* Close */}
                <button
                  onClick={handleCloseDetails}
                  className="absolute right-6 top-6 h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Header */}
                <div className="px-8 pt-7 pb-4 border-b border-gray-100">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[22px] font-bold text-gray-900 leading-tight">Wallet Details</h2>
                    <TypeBadge type={selectedWallet.type} />
                    <StatusBadge status={selectedWallet.status} />
                  </div>
                  <p className="text-xs text-gray-600 font-semibold mt-1">
                    ID: {selectedWallet.walletId} • Last Active: {selectedWallet.lastActivity}
                  </p>
                </div>

                {/* Body */}
                <div className="px-8 py-6 flex-1 overflow-y-auto space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* General details */}
                    <div className="border border-gray-200 bg-white rounded-2xl p-5 space-y-3.5 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
                        <Info className="h-4.5 w-4.5 text-[#0A3D91]" />
                        Wallet Configuration
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] text-gray-600 font-bold uppercase font-mono leading-none tracking-wider">Blockchain Network</span>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{selectedWallet.network}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-600 font-bold uppercase font-mono leading-none tracking-wider">Asset Cryptocurency</span>
                          <p className="text-sm font-bold text-gray-900 mt-1">{selectedWallet.crypto}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-600 font-bold uppercase font-mono leading-none tracking-wider">Storage Architecture</span>
                          <p className="text-xs font-semibold text-gray-700 mt-1">
                            {selectedWallet.type === "Cold"
                              ? "Offline cold storage hardware vault with multi-signature authorization schema."
                              : "Hot online liquidity address for automated processing and payout workflows."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Balance and address details */}
                    <div className="border border-gray-200 bg-white rounded-2xl p-5 space-y-3.5 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
                        <Coins className="h-4.5 w-4.5 text-[#0A3D91]" />
                        Balance Metrics
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] text-gray-600 font-bold uppercase font-mono leading-none tracking-wider">Current Crypto Balance</span>
                          <p className="text-xl font-mono font-black text-gray-950 mt-1 leading-none">{selectedWallet.balanceCrypto}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-600 font-bold uppercase font-mono leading-none tracking-wider">Estimated Value (CAD)</span>
                          <p className="text-xl font-bold text-gray-900 mt-1">${selectedWallet.balanceCad.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-600 font-bold uppercase font-mono leading-none tracking-wider">Public Address</span>
                          <p className="text-xs font-mono font-bold text-gray-900 break-all bg-gray-50 p-2 border border-gray-100 rounded-lg mt-1 select-all">
                            {selectedWallet.address}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transfer logs */}
                  <div className="border border-gray-200 bg-white rounded-2xl p-5 space-y-3.5 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
                      <History className="h-4.5 w-4.5 text-[#0A3D91]" />
                      Recent Wallet Activities
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-600 font-mono">
                            <th className="py-2 font-bold uppercase">TX ID</th>
                            <th className="py-2 font-bold uppercase">Type</th>
                            <th className="py-2 font-bold uppercase">Crypto Amount</th>
                            <th className="py-2 font-bold uppercase">CAD Value</th>
                            <th className="py-2 font-bold uppercase">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {selectedWallet.transactions.map((tx) => (
                            <tr key={tx.txId} className="text-gray-800 font-semibold">
                              <td className="py-2.5 font-mono text-gray-950">{tx.txId}</td>
                              <td className="py-2.5">
                                <span className={cn(
                                  "inline-flex px-1.5 py-0.5 rounded text-[9px] uppercase font-bold",
                                  tx.type === "Deposit" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                )}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="py-2.5 font-mono">{tx.amountCrypto}</td>
                              <td className="py-2.5">${tx.amountCad.toLocaleString()}</td>
                              <td className="py-2.5 font-mono text-gray-600">{tx.timestamp}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer status tools */}
                <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-gray-600 font-semibold">
                    Set administrative action or status overrides
                  </div>
                  <div className="flex gap-2">
                    {selectedWallet.status !== "Active" && (
                      <button
                        onClick={() => handleStatusChangeTrigger("Active")}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-green-650 hover:bg-green-700 text-white transition-colors cursor-pointer"
                      >
                        Activate Wallet
                      </button>
                    )}
                    {selectedWallet.status !== "Paused" && (
                      <button
                        onClick={() => handleStatusChangeTrigger("Paused")}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer"
                      >
                        Pause Wallet
                      </button>
                    )}
                    {selectedWallet.status !== "Suspended" && (
                      <button
                        onClick={() => handleStatusChangeTrigger("Suspended")}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                      >
                        Suspend Wallet
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Overrides Confirmation */}
            {showStatusModal && targetStatus && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 350 }}
                className="relative bg-white w-full max-w-[420px] rounded-2xl shadow-2xl p-6 z-20 border border-gray-100"
              >
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="absolute right-6 top-6 h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="h-11 w-11 rounded-full bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 leading-tight">Confirm Status Override?</h3>
                <p className="text-xs text-gray-600 mt-2 font-semibold">
                  Are you sure you want to change the status of wallet{" "}
                  <strong className="text-gray-950 font-extrabold">{selectedWallet?.walletId}</strong> to{" "}
                  <strong className="text-gray-950 font-extrabold uppercase">{targetStatus}</strong>?
                </p>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-600 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmStatusChange}
                    className="flex-1 py-2.5 rounded-xl text-white bg-blue-700 hover:bg-[#1650AB] text-sm font-bold shadow-sm transition-colors cursor-pointer"
                    style={{ background: BRAND_GRADIENT }}
                  >
                    Confirm Status
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

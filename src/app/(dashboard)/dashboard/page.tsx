"use client";

import { useState, useEffect } from "react";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  Legend,
} from "recharts";
import {
  Users, CheckCircle2, Clock, DollarSign, AlertTriangle,
  Wallet, TrendingUp, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Static Data ────────────────────────────────────────────────── */

const userGrowthData = [
  { month: "Jan", users: 70000 },
  { month: "Feb", users: 90000 },
  { month: "Mar", users: 82000 },
  { month: "Apr", users: 110000 },
  { month: "May", users: 92000 },
  { month: "Jun", users: 96000 },
  { month: "Jul", users: 35000 },
];

const assetData = [
  { name: "Bitcoin", value: 18.5, color: "#1650AB" },
  { name: "Ethereum", value: 15.2, color: "#1E3A8A" },
  { name: "USDT", value: 8.8, color: "#F59E0B" },
];

const depositsData = [
  { month: "Jan", deposits: 3000000, withdrawals: 1500000 },
  { month: "Feb", deposits: 3200000, withdrawals: 1800000 },
  { month: "Mar", deposits: 3500000, withdrawals: 2000000 },
  { month: "Apr", deposits: 3800000, withdrawals: 2500000 },
  { month: "May", deposits: 4500000, withdrawals: 3500000 },
  { month: "Jun", deposits: 5000000, withdrawals: 4500000 },
];

const withdrawalQueue = [
  { id: "WD-10243", name: "Sarah Chen",     time: "5 mins ago",  risk: "low",    amount: "$5,000" },
  { id: "WD-10242", name: "Michael Smith",  time: "12 mins ago", risk: "medium", amount: "$12,500" },
  { id: "WD-10241", name: "Emma Thompson",  time: "25 mins ago", risk: "low",    amount: "$3,200" },
  { id: "WD-10242", name: "James Wilson",   time: "1 hour ago",  risk: "high",   amount: "$12,500" },
  { id: "WD-10239", name: "Lisa Anderson",  time: "2 hours ago", risk: "low",    amount: "$8,750" },
];

const recentTransactions = [
  { name: "John Smith",   type: "Deposit",  txId: "TX-5821", amount: "$27,500", crypto: "+1.5 BTC",      coin: "BTC", positive: true },
  { name: "Alice Johnson",type: "Withdraw", txId: "TX-5820", amount: "$5,520",  crypto: "2.3 ETH",       coin: "ETH", positive: false },
  { name: "Bob Martin",   type: "Deposit",  txId: "TX-5819", amount: "$10,000", crypto: "+10,000 USDT",  coin: "USDT",positive: true },
  { name: "Carol Davis",  type: "Fee",      txId: "TX-5818", amount: "$2.40",   crypto: "-0.001 ETH",    coin: "ETH", positive: false },
];

const hotWallet = [
  { coin: "BTC",  amount: "12.5843 BTC",       usd: "$890,134" },
  { coin: "ETH",  amount: "245.32 ETH",         usd: "$588,768" },
  { coin: "USDT", amount: "125,000 USDT",       usd: "$125,000" },
];

const coldWallet = [
  { coin: "BTC",  amount: "324.2145 BTC",      usd: "$17,831,798" },
  { coin: "ETH",  amount: "5,234.89 ETH",      usd: "$12,563,736" },
  { coin: "USDT", amount: "8,675,000 USDT",    usd: "$8,675,000" },
];

/* ─── Sub-components ─────────────────────────────────────────────── */

function StatCard1({
  label, value, change, icon: Icon, iconBg,
}: {
  label: string; value: string; change: string;
  icon: React.ElementType; iconBg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
        >
          <Icon className="h-5 w-5 text-white" strokeWidth={2} />
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
          <ArrowUpRight className="h-3 w-3" />
          {change}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1.5">{label}</p>
      </div>
    </div>
  );
}

function StatCard2({
  label, value, badge, icon: Icon, iconBg, badgeType, link,
}: {
  label: string; value: string; badge: string;
  icon: React.ElementType; iconBg: string;
  badgeType: "urgent" | "positive" | "danger";
  link?: string;
}) {
  const badgeStyles = {
    urgent:   "bg-orange-100 text-orange-600",
    positive: "bg-green-100 text-green-600",
    danger:   "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", badgeStyles[badgeType])}>
          {badge}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
        >
          <Icon className="h-5 w-5 text-white" strokeWidth={2} />
        </div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      {link && (
        <button className="text-xs text-blue-600 font-medium hover:underline text-left">
          {link}
        </button>
      )}
    </div>
  );
}

const riskStyles = {
  low:    "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high:   "bg-red-100 text-red-700",
};

const coinColors: Record<string, string> = {
  BTC:  "#F7931A",
  ETH:  "#627EEA",
  USDT: "#26A17B",
};

const formatMillions = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`;

/* ─── Page ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0, loading: true });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const users = data.users || [];
          setStats({
            total: users.length,
            verified: users.filter((u: any) => u.kyc === "Verified").length,
            pending: users.filter((u: any) => u.kyc === "Pending").length,
            loading: false,
          });
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="space-y-5">
      {/* ── Page Header */}
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 leading-tight">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of platform operations and key metrics</p>
      </div>

      {/* ── Stats Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard1 label="Total Users"     value={stats.loading ? "..." : stats.total.toString()}    change="Live" icon={Users}          iconBg="#06B6D4" />
        <StatCard1 label="Verified Users"  value={stats.loading ? "..." : stats.verified.toString()} change="Live"  icon={CheckCircle2}   iconBg="#22C55E" />
        <StatCard1 label="Pending KYC"     value={stats.loading ? "..." : stats.pending.toString()}  change="Live"   icon={Clock}          iconBg="#F97316" />
        <StatCard1 label="Platform Assets" value="$42.5M"  change="+15.3%" icon={DollarSign}     iconBg="#F59E0B" />
      </div>

      {/* ── Stats Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard2
          label="Pending Withdrawals" value="23"
          badge="Urgent" badgeType="urgent"
          icon={Clock} iconBg="#F97316"
          link="Review Requests"
        />
        <StatCard2
          label="Total Deposits (300)" value="$5.8M"
          badge="+16.5%" badgeType="positive"
          icon={DollarSign} iconBg="#22C55E"
        />
        <StatCard2
          label="Flagged Transactions" value="12"
          badge="5 Alerts" badgeType="danger"
          icon={AlertTriangle} iconBg="#EF4444"
        />
      </div>

      {/* ── Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Growth Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">User Growth</h3>
            </div>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={userGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: 12 }}
                formatter={(v: any) => [Number(v).toLocaleString(), "Users"]}
              />
              <Line
                type="monotone" dataKey="users"
                stroke="#1650AB" strokeWidth={2.5}
                dot={{ r: 4, fill: "#1650AB", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#1650AB" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Distribution Donut */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Asset Distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={assetData} cx="50%" cy="50%"
                innerRadius={50} outerRadius={75}
                paddingAngle={3} dataKey="value"
              >
                {assetData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: 12 }}
                formatter={(v: any) => [`$${v}M`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {assetData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-gray-600 text-xs">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900 text-xs">${item.value}M</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Deposits vs Withdrawals Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Deposits vs Withdrawals</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={depositsData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
              tickFormatter={formatMillions} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: 12 }}
              formatter={(v: any) => [formatMillions(Number(v)), ""]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              formatter={(val) => <span className="text-gray-600 capitalize">{val}</span>}
            />
            <Bar dataKey="deposits"    fill="#1650AB" radius={[4, 4, 0, 0]} name="Deposits" />
            <Bar dataKey="withdrawals" fill="#22C55E" radius={[4, 4, 0, 0]} name="Withdrawals" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Withdrawal Queue + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Withdrawal Approval Queue */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Withdrawal Approval Queue</h3>
            <button className="text-xs text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {withdrawalQueue.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                  {item.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.id} • {item.time}</p>
                </div>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0", riskStyles[item.risk as keyof typeof riskStyles])}>
                  {item.risk} risk
                </span>
                <span className="text-sm font-bold text-gray-900 shrink-0">{item.amount}</span>
                <button
                  className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg shrink-0 transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #0A3D91, #1650AB)" }}
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Recent Transactions</h3>
            <button className="text-xs text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((tx, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                {/* Coin icon */}
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                  style={{ background: coinColors[tx.coin] }}
                >
                  {tx.coin}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{tx.name}</p>
                  <p className="text-xs text-gray-400">{tx.type} • {tx.txId}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{tx.amount}</p>
                  <p className={cn("text-xs font-medium", tx.positive ? "text-green-600" : "text-red-500")}>
                    {tx.crypto}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hot Wallet + Cold Wallet Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hot Wallet */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-gray-800">Hot Wallet Balance</h3>
          </div>
          <div className="space-y-3">
            {hotWallet.map((w) => (
              <div key={w.coin} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ background: coinColors[w.coin] }}
                  >
                    {w.coin}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{w.coin}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{w.amount}</p>
                  <p className="text-xs text-gray-400">{w.usd}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cold Wallet */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-800">Cold Wallet Balance</h3>
          </div>
          <div className="space-y-3">
            {coldWallet.map((w) => (
              <div key={w.coin} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ background: coinColors[w.coin] }}
                  >
                    {w.coin}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{w.coin}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{w.amount}</p>
                  <p className="text-xs text-gray-400">{w.usd}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-4" />
    </div>
  );
}

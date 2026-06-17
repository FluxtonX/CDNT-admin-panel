import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    const rates: Record<string, number> = {
      BTC: 90000,
      ETH: 4500,
      USDT: 1.36,
      USDC: 1.36
    };

    // 1. Fetch data concurrently
    const [
      { data: profiles },
      { data: kycData },
      { data: userWallets },
      { data: platformWallets },
      { data: depositReqs },
      { data: withdrawalReqs }
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, created_at"),
      supabaseAdmin.from("kyc_submissions").select("status"),
      supabaseAdmin.from("user_wallets").select("currency, balance"),
      supabaseAdmin.from("platform_wallets").select("*"),
      supabaseAdmin.from("deposit_requests").select("*"),
      supabaseAdmin.from("withdrawal_requests").select("*")
    ]);

    // Top Stats
    const totalUsers = (profiles || []).length;
    const verifiedUsers = (kycData || []).filter(k => k.status === "approved").length;
    const pendingKyc = (kycData || []).filter(k => k.status === "pending").length;

    let platformAssets = 0;
    (userWallets || []).forEach(w => {
      const rate = rates[w.currency?.toUpperCase()] || 1.36;
      platformAssets += Number(w.balance || 0) * rate;
    });

    const pendingWithdrawals = (withdrawalReqs || []).filter(w => w.status === "pending").length;

    let totalDepositsAmt = 0;
    (depositReqs || []).forEach(d => {
      const rate = rates[d.asset?.toUpperCase()] || 1.36;
      totalDepositsAmt += Number(d.expected_amount || 0) * rate;
    });

    const flaggedTransactions = 0; // Schema missing

    // User Growth
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const userGrowthMap: Record<string, number> = {};
    (profiles || []).forEach(p => {
      if (p.created_at) {
        const d = new Date(p.created_at);
        const m = `${months[d.getMonth()]} ${d.getFullYear()}`;
        userGrowthMap[m] = (userGrowthMap[m] || 0) + 1;
      }
    });

    const userGrowthData = Object.entries(userGrowthMap).map(([month, users]) => ({ month, users }));
    // Sort logic could be applied, but sticking to simple mapping for now. We can sort by chronological order.
    userGrowthData.sort((a, b) => {
      const [mA, yA] = a.month.split(" ");
      const [mB, yB] = b.month.split(" ");
      return new Date(`${mA} 1, ${yA}`).getTime() - new Date(`${mB} 1, ${yB}`).getTime();
    });

    // Asset Distribution (Platform Wallets or User Wallets sum)
    let btcBal = 0, ethBal = 0, usdtBal = 0;
    if (platformWallets && platformWallets.length > 0) {
      platformWallets.forEach(w => {
        const coin = w.crypto?.toUpperCase();
        const amt = Number(w.balance_crypto || 0);
        if (coin === 'BTC') btcBal += amt;
        if (coin === 'ETH') ethBal += amt;
        if (coin === 'USDT' || coin === 'USDC') usdtBal += amt;
      });
    } else {
      // Fallback to user_wallets if platform_wallets is empty, as per instructions "sum real balances from user_wallets and/or platform_wallets"
      (userWallets || []).forEach(w => {
        const coin = w.currency?.toUpperCase();
        const amt = Number(w.balance || 0);
        if (coin === 'BTC') btcBal += amt;
        if (coin === 'ETH') ethBal += amt;
        if (coin === 'USDT' || coin === 'USDC') usdtBal += amt;
      });
    }

    const btcUsd = btcBal * rates.BTC;
    const ethUsd = ethBal * rates.ETH;
    const usdtUsd = usdtBal * rates.USDT;

    const totalAssetVal = btcUsd + ethUsd + usdtUsd;
    const assetData = [
      { name: "Bitcoin", value: totalAssetVal ? Number((btcUsd / 1000000).toFixed(2)) : 0, color: "#1650AB" },
      { name: "Ethereum", value: totalAssetVal ? Number((ethUsd / 1000000).toFixed(2)) : 0, color: "#1E3A8A" },
      { name: "USDT", value: totalAssetVal ? Number((usdtUsd / 1000000).toFixed(2)) : 0, color: "#F59E0B" }
    ];

    // Deposits vs Withdrawals Monthly
    const depWithMap: Record<string, { deposits: number, withdrawals: number }> = {};
    (depositReqs || []).forEach(d => {
      if (d.created_at) {
        const date = new Date(d.created_at);
        const m = `${months[date.getMonth()]} ${date.getFullYear()}`;
        if (!depWithMap[m]) depWithMap[m] = { deposits: 0, withdrawals: 0 };
        const rate = rates[d.asset?.toUpperCase()] || 1.36;
        depWithMap[m].deposits += Number(d.expected_amount || 0) * rate;
      }
    });

    (withdrawalReqs || []).forEach(w => {
      if (w.created_at) {
        const date = new Date(w.created_at);
        const m = `${months[date.getMonth()]} ${date.getFullYear()}`;
        if (!depWithMap[m]) depWithMap[m] = { deposits: 0, withdrawals: 0 };
        depWithMap[m].withdrawals += Number(w.amount || 0);
      }
    });

    const depositsData = Object.entries(depWithMap).map(([month, data]) => ({
      month,
      deposits: data.deposits,
      withdrawals: data.withdrawals
    })).sort((a, b) => {
      const [mA, yA] = a.month.split(" ");
      const [mB, yB] = b.month.split(" ");
      return new Date(`${mA} 1, ${yA}`).getTime() - new Date(`${mB} 1, ${yB}`).getTime();
    });

    // Withdrawal Queue
    const formatTimeAgo = (dateStr: string) => {
      const diffMs = new Date().getTime() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return diffMins <= 1 ? "Just now" : `${diffMins} mins ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
      return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) > 1 ? 's' : ''} ago`;
    };

    const withdrawalQueue = (withdrawalReqs || [])
      .filter(w => w.status === "pending")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(w => {
        const user = (profiles || []).find(p => p.id === w.user_id);
        return {
          id: `WD-${w.id.slice(0, 5).toUpperCase()}`,
          name: user?.full_name || "Unknown User",
          time: formatTimeAgo(w.created_at),
          risk: "N/A", // Schema missing
          amount: `$${Number(w.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
        };
      });

    // Recent Transactions
    const combinedTxs = [
      ...(depositReqs || []).map(d => ({ ...d, txType: "Deposit", created: new Date(d.created_at) })),
      ...(withdrawalReqs || []).map(w => ({ ...w, txType: "Withdraw", created: new Date(w.created_at) }))
    ].sort((a, b) => b.created.getTime() - a.created.getTime()).slice(0, 5);

    const recentTransactions = combinedTxs.map(tx => {
      const user = (profiles || []).find(p => p.id === tx.user_id);
      const isDeposit = tx.txType === "Deposit";
      const coin = isDeposit ? (tx.asset?.toUpperCase() || "CAD") : "CAD";
      const amtNum = isDeposit ? tx.expected_amount : tx.amount;
      const amountUsd = isDeposit ? (Number(amtNum) * (rates[coin] || 1.36)) : Number(amtNum);

      return {
        name: user?.full_name || "Unknown User",
        type: tx.txType,
        txId: `TX-${tx.id.slice(0, 5).toUpperCase()}`,
        amount: `$${amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        crypto: isDeposit ? `+${amtNum} ${coin}` : `-$${amtNum} CAD`,
        coin: coin === "CAD" ? "CAD" : coin,
        positive: isDeposit
      };
    });

    // Hot/Cold Wallets
    const hotWallets = (platformWallets || []).filter(w => w.type === "Hot").map(w => ({
      coin: w.crypto,
      amount: w.balance_crypto,
      usd: `$${Number(w.balance_cad || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    }));

    const coldWallets = (platformWallets || []).filter(w => w.type === "Cold").map(w => ({
      coin: w.crypto,
      amount: w.balance_crypto,
      usd: `$${Number(w.balance_cad || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    }));

    return NextResponse.json({
      totalUsers,
      verifiedUsers,
      pendingKyc,
      platformAssets,
      pendingWithdrawals,
      totalDepositsAmt,
      flaggedTransactions,
      userGrowthData,
      assetData,
      depositsData,
      withdrawalQueue,
      recentTransactions,
      hotWallets,
      coldWallets
    });

  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

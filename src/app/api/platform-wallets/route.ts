import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";
import { fetchLiveCADRates } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "manage-wallets");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabase = createAdminClient();

    // Fetch from user_wallets table
    const { data: userWallets, error } = await supabase
      .from("user_wallets")
      .select("*");

    if (error) throw error;

    // Group by currency and sum balances
    const currencyBalances: Record<string, number> = {};
    (userWallets || []).forEach(w => {
      const currency = w.currency?.toUpperCase();
      const bal = Number(w.balance || 0);
      if (currency && bal > 0) {
        currencyBalances[currency] = (currencyBalances[currency] || 0) + bal;
      }
    });

    const currencySymbols = Object.keys(currencyBalances);
    const liveRates = await fetchLiveCADRates(currencySymbols);

    // Get last activity from wallet_ledger
    const { data: ledger } = await supabase
      .from("wallet_ledger")
      .select("currency, created_at")
      .order("created_at", { ascending: false });

    const lastActivities: Record<string, string> = {};
    currencySymbols.forEach(coin => {
      lastActivities[coin] = "No activity";
    });

    if (ledger) {
      const formatTimeAgo = (dateStr: string) => {
        const diffMs = new Date().getTime() - new Date(dateStr).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return diffMins <= 1 ? "Just now" : `${diffMins} mins ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
        return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) > 1 ? 's' : ''} ago`;
      };

      currencySymbols.forEach(coin => {
        const latest = ledger.find(tx => tx.currency?.toUpperCase() === coin);
        if (latest) {
          lastActivities[coin] = formatTimeAgo(latest.created_at);
        }
      });
    }

    // Derive network from currency
    const getNetwork = (currency: string) => {
      switch (currency.toUpperCase()) {
        case "BTC":
          return "Bitcoin Network";
        case "ETH":
          return "ERC-20";
        case "USDT":
          return "TRC-20/ERC-20";
        case "USDC":
          return "ERC-20";
        default:
          return `${currency} Network`;
      }
    };

    const wallets = currencySymbols.map(coin => {
      const totalBal = currencyBalances[coin];
      const rate = liveRates[coin] || 1;
      const totalCad = totalBal * rate;

      return {
        crypto: coin,
        network: getNetwork(coin),
        address: "Aggregated User Wallets",
        balance_crypto: `${totalBal.toFixed(coin === 'USDT' || coin === 'USDC' ? 2 : 4)} ${coin}`,
        balance_cad: totalCad,
        status: "Active",
        last_activity: lastActivities[coin],
      };
    });

    return NextResponse.json(wallets);
  } catch (error: any) {
    console.error("Error fetching user wallets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

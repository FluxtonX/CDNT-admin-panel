import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";
import { fetchLiveCADRates, COIN_COLORS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "manage-wallets");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabase = createAdminClient();

    // Sum user balances by currency
    const { data: userWallets, error } = await supabase
      .from("user_wallets")
      .select("*");

    if (error) throw error;

    // Aggregate balances by currency dynamically
    const currencyBalances: Record<string, number> = {};
    (userWallets || []).forEach(w => {
      const currency = w.currency?.toUpperCase();
      const bal = Number(w.balance || 0);
      if (currency && bal > 0) {
        currencyBalances[currency] = (currencyBalances[currency] || 0) + bal;
      }
    });

    // Extract unique currencies for rate fetching
    const currencySymbols = Object.keys(currencyBalances);
    const liveRates = await fetchLiveCADRates(currencySymbols);

    // Fetch latest ledger activity for each currency
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

    // Dynamically create wallets for each currency
    const wallets: any[] = [];
    currencySymbols.forEach(coin => {
      const totalBal = currencyBalances[coin];
      const rate = liveRates[coin] || 1;
      const totalCad = totalBal * rate;

      // Only create wallets if there's a balance
      if (totalBal > 0) {
        // Hot wallet (20%)
        wallets.push({
          wallet_id: `WALLET-HOT-${coin}`,
          type: "Hot",
          crypto: coin,
          address: `${coin.toLowerCase().slice(0, 2)}...hot`,
          balance_crypto: `${(totalBal * 0.2).toFixed(coin === 'USDT' || coin === 'USDC' ? 2 : 4)} ${coin}`,
          balance_cad: totalCad * 0.2,
          status: "Active",
          last_activity: lastActivities[coin],
          network: `${coin} Mainnet`,
          transactions: []
        });

        // Cold wallet (80%)
        wallets.push({
          wallet_id: `WALLET-COLD-${coin}`,
          type: "Cold",
          crypto: coin,
          address: `${coin.toLowerCase().slice(0, 2)}...cold`,
          balance_crypto: `${(totalBal * 0.8).toFixed(coin === 'USDT' || coin === 'USDC' ? 2 : 4)} ${coin}`,
          balance_cad: totalCad * 0.8,
          status: "Active",
          last_activity: lastActivities[coin],
          network: `${coin} Cold Vault`,
          transactions: []
        });
      }
    });

    // Filter out 0 balance wallets for cleanliness
    const activeWallets = wallets.filter(w => w.balance_cad > 0);
    
    return NextResponse.json(activeWallets.length > 0 ? activeWallets : wallets);
  } catch (error: any) {
    console.error("Error fetching platform wallets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

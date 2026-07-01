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

    // Try to fetch from platform_wallets table first
    const { data: platformWallets, error } = await supabase
      .from("platform_wallets")
      .select("*")
      .order("created_at", { ascending: false });

    // If platform_wallets exists and has data, use it
    if (!error && platformWallets && platformWallets.length > 0) {
      const currencySymbols = [...new Set(platformWallets.map(w => w.crypto?.toUpperCase()).filter(Boolean))];
      const liveRates = await fetchLiveCADRates(currencySymbols);

      const { data: ledger } = await supabase
        .from("wallet_ledger")
        .select("wallet_id, created_at")
        .order("created_at", { ascending: false });

      const lastActivities: Record<string, string> = {};
      platformWallets.forEach(w => {
        lastActivities[w.wallet_id] = "No activity";
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

        platformWallets.forEach(w => {
          const latest = ledger.find(tx => tx.wallet_id === w.wallet_id);
          if (latest) {
            lastActivities[w.wallet_id] = formatTimeAgo(latest.created_at);
          }
        });
      }

      const wallets = platformWallets.map(w => {
        const crypto = w.crypto?.toUpperCase() || "BTC";
        const balanceCrypto = Number(w.balance_crypto || 0);
        const rate = liveRates[crypto] || 1;
        const balanceCad = balanceCrypto * rate;

        return {
          wallet_id: w.wallet_id,
          type: w.type === "hot" ? "Hot" : "Cold",
          crypto: crypto,
          address: w.address || "N/A",
          balance_crypto: `${balanceCrypto.toFixed(crypto === 'USDT' || crypto === 'USDC' ? 2 : 4)} ${crypto}`,
          balance_cad: balanceCad,
          status: w.status || "Active",
          last_activity: lastActivities[w.wallet_id],
          network: w.network || `${crypto} Mainnet`,
          transactions: []
        };
      });

      return NextResponse.json(wallets);
    }

    // Fallback: Use user_wallets to generate synthetic wallets
    const { data: userWallets, error: userError } = await supabase
      .from("user_wallets")
      .select("*");

    if (userError) throw userError;

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

    const wallets: any[] = [];
    currencySymbols.forEach(coin => {
      const totalBal = currencyBalances[coin];
      const rate = liveRates[coin] || 1;
      const totalCad = totalBal * rate;

      if (totalBal > 0) {
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

    const activeWallets = wallets.filter(w => w.balance_cad > 0);
    return NextResponse.json(activeWallets.length > 0 ? activeWallets : wallets);
  } catch (error: any) {
    console.error("Error fetching platform wallets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

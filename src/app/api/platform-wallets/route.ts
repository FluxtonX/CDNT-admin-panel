import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Sum user balances
    const { data: userWallets, error } = await supabase
      .from("user_wallets")
      .select("*");

    if (error) throw error;

    let totalBtc = 0;
    let totalEth = 0;
    let totalUsdt = 0;

    (userWallets || []).forEach(w => {
      const currency = w.currency?.toUpperCase();
      const bal = Number(w.balance || 0);
      if (currency === 'BTC') totalBtc += bal;
      if (currency === 'ETH') totalEth += bal;
      if (currency === 'USDT' || currency === 'USDC') totalUsdt += bal;
    });

    // Fetch latest ledger activity for each currency
    const { data: ledger } = await supabase
      .from("wallet_ledger")
      .select("currency, created_at")
      .order("created_at", { ascending: false });

    const lastActivities: Record<string, string> = {
      BTC: "No activity",
      ETH: "No activity",
      USDT: "No activity"
    };

    if (ledger) {
      const formatTimeAgo = (dateStr: string) => {
        const diffMs = new Date().getTime() - new Date(dateStr).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return diffMins <= 1 ? "Just now" : `${diffMins} mins ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
        return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) > 1 ? 's' : ''} ago`;
      };

      ["BTC", "ETH", "USDT"].forEach(coin => {
        const latest = ledger.find(tx => tx.currency?.toUpperCase() === coin);
        if (latest) {
          lastActivities[coin] = formatTimeAgo(latest.created_at);
        }
      });
    }

    // Approximate USD/CAD prices for display
    const prices = {
      BTC: 95000,
      ETH: 3500,
      USDT: 1.37
    };

    const btcCad = totalBtc * prices.BTC;
    const ethCad = totalEth * prices.ETH;
    const usdtCad = totalUsdt * prices.USDT;

    // Distribute into 1 Hot and 1 Cold wallet per coin for the platform view
    const wallets = [
      {
        wallet_id: "WALLET-HOT-BTC",
        type: "Hot",
        crypto: "BTC",
        address: "bc1q...hot",
        balance_crypto: `${(totalBtc * 0.2).toFixed(4)} BTC`,
        balance_cad: btcCad * 0.2,
        status: "Active",
        last_activity: lastActivities["BTC"],
        network: "Bitcoin Mainnet",
        transactions: []
      },
      {
        wallet_id: "WALLET-COLD-BTC",
        type: "Cold",
        crypto: "BTC",
        address: "bc1q...cold",
        balance_crypto: `${(totalBtc * 0.8).toFixed(4)} BTC`,
        balance_cad: btcCad * 0.8,
        status: "Active",
        last_activity: lastActivities["BTC"],
        network: "Bitcoin Cold Vault",
        transactions: []
      },
      {
        wallet_id: "WALLET-HOT-ETH",
        type: "Hot",
        crypto: "ETH",
        address: "0x...hot",
        balance_crypto: `${(totalEth * 0.2).toFixed(4)} ETH`,
        balance_cad: ethCad * 0.2,
        status: "Active",
        last_activity: lastActivities["ETH"],
        network: "Ethereum Mainnet",
        transactions: []
      },
      {
        wallet_id: "WALLET-COLD-ETH",
        type: "Cold",
        crypto: "ETH",
        address: "0x...cold",
        balance_crypto: `${(totalEth * 0.8).toFixed(4)} ETH`,
        balance_cad: ethCad * 0.8,
        status: "Active",
        last_activity: lastActivities["ETH"],
        network: "Ethereum Cold Vault",
        transactions: []
      },
      {
        wallet_id: "WALLET-HOT-USDT",
        type: "Hot",
        crypto: "USDT",
        address: "T...hot",
        balance_crypto: `${totalUsdt.toFixed(2)} USDT`,
        balance_cad: usdtCad,
        status: "Active",
        last_activity: lastActivities["USDT"],
        network: "TRON (TRC-20)",
        transactions: []
      }
    ];

    // Filter out 0 balance wallets for cleanliness, unless they are all 0
    const activeWallets = wallets.filter(w => w.balance_cad > 0);
    
    return NextResponse.json(activeWallets.length > 0 ? activeWallets : wallets);
  } catch (error: any) {
    console.error("Error fetching platform wallets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

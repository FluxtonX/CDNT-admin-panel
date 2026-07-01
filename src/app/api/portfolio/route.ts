import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";
import { fetchLiveCADRates } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "view-wallets");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    // 1. Fetch profiles count
    const { count: profilesCount, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const totalUsers = profilesCount || 0;

    // 2. Fetch all user wallets
    const { data: userWallets, error: walletsErr } = await supabaseAdmin
      .from("user_wallets")
      .select("*");

    // Fetch live exchange rates to CAD
    const liveRates = await fetchLiveCADRates();
    const rates: Record<string, number> = {
      BTC: liveRates.btcCAD || 95000,
      ETH: liveRates.ethCAD || 3500,
      USDT: liveRates.usdtCAD || 1.36,
      USDC: liveRates.usdtCAD || 1.36
    };

    let btcAmount = 0;
    let ethAmount = 0;
    let usdtAmount = 0;

    if (!walletsErr && userWallets) {
      userWallets.forEach((w: any) => {
        const asset = w.currency?.toUpperCase();
        const amount = Number(w.balance) || 0;
        if (asset === "BTC") btcAmount += amount;
        else if (asset === "ETH") ethAmount += amount;
        else if (asset === "USDT" || asset === "USDC") usdtAmount += amount;
      });
    }

    const btcVal = btcAmount * rates.BTC;
    const ethVal = ethAmount * rates.ETH;
    const usdtVal = usdtAmount * rates.USDT;

    const totalAum = btcVal + ethVal + usdtVal;

    const allocations = [
      { 
        asset: "Bitcoin", 
        percentage: totalAum > 0 ? Number(((btcVal / totalAum) * 100).toFixed(1)) : 0, 
        valueCad: btcVal || 0, 
        color: "bg-amber-500", 
        strokeColor: "#f59e0b" 
      },
      { 
        asset: "USDT", 
        percentage: totalAum > 0 ? Number(((usdtVal / totalAum) * 100).toFixed(1)) : 0, 
        valueCad: usdtVal || 0, 
        color: "bg-emerald-500", 
        strokeColor: "#10b981" 
      },
      { 
        asset: "Ethereum", 
        percentage: totalAum > 0 ? Number(((ethVal / totalAum) * 100).toFixed(1)) : 0, 
        valueCad: ethVal || 0, 
        color: "bg-blue-600", 
        strokeColor: "#2563eb" 
      },
    ];

    // 30d growth = sum of deposits in wallet_ledger in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: ledger, error: ledgerErr } = await supabaseAdmin
      .from("wallet_ledger")
      .select("amount, currency, created_at")
      .eq("type", "DEPOSIT")
      .gte("created_at", thirtyDaysAgo.toISOString());

    let performanceGrowth = 0;
    if (!ledgerErr && ledger) {
      performanceGrowth = ledger.reduce((acc: number, item: any) => {
        const rate = rates[item.currency?.toUpperCase()] || rates.USDT;
        return acc + (Number(item.amount) * rate);
      }, 0);
    }

    return NextResponse.json({
      allocations,
      totalAum: totalAum || 0,
      userCount: totalUsers,
      performanceGrowth: performanceGrowth || 0
    });
  } catch (error: any) {
    console.error("GET Portfolio Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

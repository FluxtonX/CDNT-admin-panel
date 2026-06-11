import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Fetch profiles count
    const { count: profilesCount, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (profErr) {
      throw profErr;
    }

    const totalUsers = profilesCount || 0;

    // 2. Fetch approved deposits
    const { data: deposits, error: depErr } = await supabaseAdmin
      .from("deposit_requests")
      .select("asset, expected_amount, status, created_at")
      .eq("status", "approved");

    // Check if table missing error (PGRST205)
    if (depErr && depErr.code !== "PGRST205") {
      throw depErr;
    }

    // Static exchange rates to CAD
    const rates: Record<string, number> = {
      BTC: 90000,
      ETH: 4500,
      USDT: 1.36,
      USDC: 1.36
    };

    let btcAmount = 0;
    let ethAmount = 0;
    let usdtAmount = 0;

    (deposits || []).forEach((d: any) => {
      const asset = d.asset?.toUpperCase();
      const amount = Number(d.expected_amount) || 0;
      if (asset === "BTC") btcAmount += amount;
      else if (asset === "ETH") ethAmount += amount;
      else if (asset === "USDT" || asset === "USDC") usdtAmount += amount;
    });

    const btcVal = btcAmount * rates.BTC;
    const ethVal = ethAmount * rates.ETH;
    const usdtVal = usdtAmount * rates.USDT;

    const totalAum = btcVal + ethVal + usdtVal;

    const allocations = [
      { 
        asset: "Bitcoin", 
        percentage: totalAum > 0 ? Number(((btcVal / totalAum) * 100).toFixed(1)) : 0, 
        valueCad: btcVal, 
        color: "bg-amber-500", 
        strokeColor: "#f59e0b" 
      },
      { 
        asset: "USDT", 
        percentage: totalAum > 0 ? Number(((usdtVal / totalAum) * 100).toFixed(1)) : 0, 
        valueCad: usdtVal, 
        color: "bg-emerald-500", 
        strokeColor: "#10b981" 
      },
      { 
        asset: "Ethereum", 
        percentage: totalAum > 0 ? Number(((ethVal / totalAum) * 100).toFixed(1)) : 0, 
        valueCad: ethVal, 
        color: "bg-blue-600", 
        strokeColor: "#2563eb" 
      },
    ];

    // 30d growth = sum of deposits in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentDeposits = (deposits || []).filter((d: any) => new Date(d.created_at) >= thirtyDaysAgo);
    const performanceGrowth = recentDeposits.reduce((acc: number, d: any) => {
      const rate = rates[d.asset?.toUpperCase()] || 1.36;
      return acc + (Number(d.expected_amount) * rate);
    }, 0);

    return NextResponse.json({
      allocations,
      totalAum,
      userCount: totalUsers,
      performanceGrowth
    });
  } catch (error: any) {
    console.error("GET Portfolio Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

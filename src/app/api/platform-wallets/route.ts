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
    const { data: wallets, error } = await supabase
      .from("platform_wallets")
      .select("wallet_id, type, crypto, network, address, balance_crypto, balance_cad, status, last_activity")
      .order("crypto", { ascending: true });

    if (error) throw error;

    // Fetch user wallets to sum real balances
    const { data: userWallets, error: userWalletsErr } = await supabase
      .from("user_wallets")
      .select("currency, balance");

    if (userWalletsErr) throw userWalletsErr;

    const userBalances: Record<string, number> = {};
    if (userWallets) {
      userWallets.forEach((w: any) => {
        const coin = w.currency?.toUpperCase();
        if (coin) {
          userBalances[coin] = (userBalances[coin] || 0) + (Number(w.balance) || 0);
        }
      });
    }

    const allWallets = [...(wallets || [])];
    const existingCryptos = new Set(allWallets.map(w => w.crypto));

    // Ensure SOL exists
    if (!existingCryptos.has("SOL")) {
      allWallets.push({
        wallet_id: "virtual-sol",
        type: "Cold",
        crypto: "SOL",
        network: "Solana",
        address: null,
        balance_crypto: null,
        balance_cad: null,
        status: "Active",
        last_activity: null
      });
    }

    // Ensure XRP exists
    if (!existingCryptos.has("XRP")) {
      allWallets.push({
        wallet_id: "virtual-xrp",
        type: "Cold",
        crypto: "XRP",
        network: "Ripple",
        address: null,
        balance_crypto: null,
        balance_cad: null,
        status: "Active",
        last_activity: null
      });
    }

    // Extract unique cryptos to fetch live rates
    const cryptos = Array.from(new Set(allWallets.map(w => w.crypto)));
    const liveRates = await fetchLiveCADRates(cryptos.length ? cryptos : undefined);

    // Count occurrences of each crypto to split balances correctly across multiple networks (e.g. USDT ERC-20 and TRC-20)
    const cryptoCounts: Record<string, number> = {};
    allWallets.forEach(w => {
      cryptoCounts[w.crypto] = (cryptoCounts[w.crypto] || 0) + 1;
    });

    const updatedWallets = allWallets.map(wallet => {
      let totalCryptoBalance = userBalances[wallet.crypto] || 0;
      const count = cryptoCounts[wallet.crypto] || 1;
      
      // Divide evenly to prevent double counting on the frontend total sum
      let sum = totalCryptoBalance / count;

      const decimals = wallet.crypto === "USDT" ? 2 : 8;
      const balance_crypto = `${sum.toFixed(decimals).replace(/\.?0+$/, '') || '0'} ${wallet.crypto}`;
      const rate = liveRates[wallet.crypto] || 1;
      const balance_cad = sum * rate;

      return {
        ...wallet,
        balance_crypto,
        balance_cad,
      };
    });

    return NextResponse.json(updatedWallets);
  } catch (error: any) {
    console.error("Error fetching platform wallets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "manage-wallets");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { wallet_id, address } = body;

    if (!wallet_id || !address) {
      return NextResponse.json({ error: "wallet_id and address are required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("platform_wallets")
      .update({ address })
      .eq("wallet_id", wallet_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, wallet: data });
  } catch (error: any) {
    console.error("Error updating platform wallet address:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";
import { fetchLiveCADRates } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "view-users");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const supabase = createAdminClient();
    const body = await request.json();
    const { userId, txType, coin, amount, txDate } = body;

    if (!userId || !txType || !coin || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    const reviewedBy = user?.id || null;

    // Fetch live CAD rates to convert crypto amount to CAD
    const rates = await fetchLiveCADRates([coin]);
    const cadRate = rates[coin] || rates.USDT || 1.36;
    const cadAmount = amount * cadRate;

    const isCAD = coin.toUpperCase() === "CAD";

    if (txType === "Deposit") {
      const adminRef = `ADMIN-${Date.now()}`;

      if (isCAD) {
        // 1. Fetch or create Chequing account
        const { data: existingAcc } = await supabase
          .from("user_bank_accounts")
          .select("id, balance")
          .eq("user_id", userId)
          .eq("account_type", "chequing")
          .eq("status", "active")
          .maybeSingle();

        let newBalance = (existingAcc ? Number(existingAcc.balance || 0) : 0) + amount;

        if (existingAcc) {
          const { error: updateAccErr } = await supabase
            .from("user_bank_accounts")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("id", existingAcc.id);
          if (updateAccErr) throw new Error(updateAccErr.message);
        } else {
          const randomAcc = "05496-" + Math.floor(1000000 + Math.random() * 9000000);
          const { error: insertAccErr } = await supabase
            .from("user_bank_accounts")
            .insert({
              user_id: userId,
              account_category: "everyday",
              account_type: "chequing",
              account_name: "Chequing Account",
              account_number: randomAcc,
              currency: "CAD",
              balance: newBalance,
              status: "active",
              approved_at: new Date().toISOString(),
            });
          if (insertAccErr) throw new Error(insertAccErr.message);
        }
      } else {
        // Crypto deposit: update user_wallets
        const { data: wallet } = await supabase
          .from("user_wallets")
          .select("balance")
          .eq("user_id", userId)
          .eq("currency", coin)
          .maybeSingle();

        const currentBalance = wallet ? Number(wallet.balance) : 0;
        const newBalance = currentBalance + amount;

        if (wallet) {
          const { error: updateErr } = await supabase
            .from("user_wallets")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("currency", coin);
          if (updateErr) throw new Error(updateErr.message);
        } else {
          const { error: insertWalletErr } = await supabase
            .from("user_wallets")
            .insert({ user_id: userId, currency: coin, balance: newBalance });
          if (insertWalletErr) throw new Error(insertWalletErr.message);
        }
      }

      // Insert deposit_requests history record
      await supabase.from("deposit_requests").insert({
        user_id: userId,
        asset: coin,
        network: "ADMIN",
        company_address: "ADMIN_MANUAL",
        expected_amount: amount,
        tx_hash: adminRef,
        status: "completed",
        created_at: txDate,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy,
        admin_note: "Manual admin transaction",
      });

      // Insert wallet_ledger record
      const { error: ledgerErr } = await supabase.from("wallet_ledger").insert({
        user_id: userId,
        type: "DEPOSIT",
        provider: "ADMIN_MANUAL",
        currency: coin,
        amount: amount,
        status: "COMPLETED",
        created_at: txDate,
      });
      if (ledgerErr) throw new Error(ledgerErr.message);

      // Insert audit log
      await supabase.from("audit_logs").insert({
        user_id: userId,
        admin_id: null,
        action: "DEPOSIT_ADDED",
        details: { coin, amount, cadAmount, date: txDate },
      });

      // Insert notification for user
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "Success",
        title: "Deposit Processed",
        message: `A deposit of ${amount} ${coin} has been processed and added to your account.`,
        audience: "User",
        is_read: false,
        link: "/transactions"
      });
    } else {
      const adminRef = `ADMIN-${Date.now()}`;

      if (isCAD) {
        // 1. Fetch active Chequing account
        const { data: existingAcc } = await supabase
          .from("user_bank_accounts")
          .select("id, balance")
          .eq("user_id", userId)
          .eq("account_type", "chequing")
          .eq("status", "active")
          .maybeSingle();

        if (!existingAcc) {
          return NextResponse.json({ error: "No active Chequing account found for this user." }, { status: 400 });
        }

        const currentBalance = Number(existingAcc.balance || 0);
        if (currentBalance < amount) {
          return NextResponse.json({ error: `Insufficient CAD balance: Account has $${currentBalance.toFixed(2)} CAD.` }, { status: 400 });
        }

        const newBalance = currentBalance - amount;
        const { error: updateAccErr } = await supabase
          .from("user_bank_accounts")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("id", existingAcc.id);
        if (updateAccErr) throw new Error(updateAccErr.message);
      } else {
        // Crypto withdrawal: update user_wallets
        const { data: wallet } = await supabase
          .from("user_wallets")
          .select("balance")
          .eq("user_id", userId)
          .eq("currency", coin)
          .maybeSingle();

        const currentBalance = wallet ? Number(wallet.balance) : 0;
        const newBalance = currentBalance - amount;

        if (newBalance < 0) {
          return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
        }

        if (wallet) {
          const { error: updateErr } = await supabase
            .from("user_wallets")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("currency", coin);
          if (updateErr) throw new Error(updateErr.message);
        } else {
          return NextResponse.json({ error: "Wallet not found" }, { status: 400 });
        }
      }

      // Insert withdrawal_requests history record
      await supabase.from("withdrawal_requests").insert({
        user_id: userId,
        asset: coin,
        amount: amount,
        status: "completed",
        method: "ADMIN",
        interac_email: "",
        created_at: txDate,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy,
        admin_note: "Manual admin transaction",
      });

      // Insert wallet_ledger record
      const { error: ledgerErr } = await supabase.from("wallet_ledger").insert({
        user_id: userId,
        type: "WITHDRAWAL",
        provider: "ADMIN_MANUAL",
        currency: coin,
        amount: amount,
        status: "COMPLETED",
        created_at: txDate,
      });
      if (ledgerErr) throw new Error(ledgerErr.message);

      // Insert audit log
      await supabase.from("audit_logs").insert({
        user_id: userId,
        admin_id: null,
        action: "WITHDRAWAL_ADDED",
        details: { coin, amount, cadAmount, date: txDate },
      });

      // Insert notification for user
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "Info",
        title: "Withdrawal Processed",
        message: `A manual withdrawal of ${amount} ${coin} has been processed from your account.`,
        audience: "User",
        is_read: false,
        link: "/transactions"
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to add transaction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

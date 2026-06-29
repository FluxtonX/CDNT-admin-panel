import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";

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

    const adminRef = `ADMIN-${Date.now()}`;

    if (txType === "Deposit") {
      // Insert deposit_requests using admin client
      const { error: insertErr } = await supabase.from("deposit_requests").insert({
        user_id: userId,
        asset: coin,
        network: "ADMIN",
        company_address: "ADMIN_MANUAL",
        expected_amount: amount,
        tx_hash: adminRef,
        status: "completed",
        created_at: txDate,
        reviewed_at: txDate,
        admin_note: "Manual admin transaction",
      });
      if (insertErr) throw new Error(insertErr.message);

      // Update user_wallets using admin client
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

      // Insert wallet_ledger using admin client
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
        details: { coin, amount, date: txDate },
      });
    } else {
      // Insert withdrawal_requests using admin client
      const { error: insertErr } = await supabase.from("withdrawal_requests").insert({
        user_id: userId,
        asset: coin,
        amount: amount,
        status: "completed",
        method: "ADMIN",
        interac_email: "",
        created_at: txDate,
      });
      if (insertErr) throw new Error(insertErr.message);

      // Update user_wallets using admin client
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

      // Insert wallet_ledger using admin client
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
        details: { coin, amount, date: txDate },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to add transaction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

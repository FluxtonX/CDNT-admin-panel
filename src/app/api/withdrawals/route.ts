import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";
import { fetchLiveCADRates } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "approve-withdrawals");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    // Fetch withdrawal requests
    const { data: withdrawals, error: wdrErr } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (wdrErr) {
      if (wdrErr.code === "PGRST205") {
        // Table not created yet
        return NextResponse.json({ withdrawals: [] });
      }
      throw wdrErr;
    }

    // Fetch profiles to get names/emails
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email");

    if (profErr) throw profErr;

    // Map profiles to withdrawals in-memory
    const mappedWithdrawals = (withdrawals || []).map((wdr: any) => {
      const profile = (profiles || []).find((p: any) => p.id === wdr.user_id);
      return {
        ...wdr,
        user: {
          name: profile?.full_name || "Unknown User",
          email: profile?.email || "N/A",
        }
      };
    });

    return NextResponse.json({ withdrawals: mappedWithdrawals });
  } catch (error: any) {
    console.error("GET Withdrawals Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "approve-withdrawals");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { requestId, status, rejectionReason, adminNote } = await request.json();
    if (!requestId || !status) {
      return NextResponse.json({ error: "requestId and status are required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Fetch withdrawal request details
    const { data: wdr, error: wdrLookupErr } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (wdrLookupErr || !wdr) {
      console.error("Withdrawal lookup failed:", {
        requestId,
        error: wdrLookupErr?.message,
        code: wdrLookupErr?.code,
        details: wdrLookupErr?.details,
      });
      return NextResponse.json(
        { error: "Withdrawal request not found", details: wdrLookupErr?.message },
        { status: 404 }
      );
    }

    if (status === "approved" || status === "completed") {
      // Use requested currency when provided; fall back to asset; then USDT.
      const cryptoCurrency = String((wdr as any).currency || (wdr as any).asset || "USDT").toUpperCase();

      // 2. Fetch live CAD rates
      const rates = await fetchLiveCADRates();
      
      // 3. Convert CAD withdrawal amount to that crypto using live rate
      // fetchLiveCADRates returns keys as uppercase coin symbols: BTC, ETH, USDT, etc.
      const cadRate = Number(rates[cryptoCurrency]) || Number(rates["USDT"]) || 1.36;

      const amountToDeduct = wdr.amount / cadRate;

      // 4. Fetch user balance for that specific currency from user_wallets
      const { data: userWallet, error: walletQueryErr } = await supabaseAdmin
        .from("user_wallets")
        .select("balance")
        .eq("user_id", wdr.user_id)
        .eq("currency", cryptoCurrency)
        .maybeSingle();

      if (walletQueryErr) {
        console.error("Error fetching user wallet:", walletQueryErr);
      }

      const currentBalance = userWallet ? Number(userWallet.balance) : 0;
      const newBalance = currentBalance - amountToDeduct;

      // Block if insufficient funds in the specific crypto wallet
      if (newBalance < 0) {
        return NextResponse.json({ error: `Insufficient balance: User only has ${currentBalance.toFixed(6)} ${cryptoCurrency}, but this withdrawal requires ${amountToDeduct.toFixed(6)} ${cryptoCurrency}.` }, { status: 400 });
      }

      // 5. Deduct from the correct currency wallet
      const { error: walletErr } = await supabaseAdmin
        .from("user_wallets")
        .update({ balance: newBalance })
        .eq("user_id", wdr.user_id)
        .eq("currency", cryptoCurrency);
      if (walletErr) throw walletErr;

      // 6. wallet_ledger entry should also use the correct currency
      const { error: ledgerErr } = await supabaseAdmin
        .from("wallet_ledger")
        .insert({
          user_id: wdr.user_id,
          type: "WITHDRAWAL",
          provider: "INTERAC",
          currency: cryptoCurrency,
          amount: amountToDeduct,
          status: "COMPLETED",
        });
      if (ledgerErr) throw ledgerErr;
    }

    const updateData: any = { status };
    if (rejectionReason) updateData.rejection_reason = rejectionReason;
    if (adminNote) updateData.admin_note = adminNote;
    
    const { error } = await supabaseAdmin
      .from("withdrawal_requests")
      .update(updateData)
      .eq("id", requestId);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let userName = "Unknown User";
    let userId = wdr.user_id;
    let amount = wdr.amount;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", wdr.user_id)
      .single();
    if (profile) {
      userName = profile.full_name;
    }

    const action = (status === "approved" || status === "completed") ? "Withdrawal Approved" : "Withdrawal Rejected";
    const severity = (status === "approved" || status === "completed") ? "Info" : "Warning";

    await supabaseAdmin.from("security_logs").insert({
      action,
      category: "Transaction",
      severity,
      user_name: userName,
      user_id: userId,
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
      details: `${action} of $${amount} CAD for user ${userId}. Note: ${adminNote || 'None'}`,
      user_agent: request.headers.get("user-agent") || "Unknown",
      performed_by_admin: "ADM-001"
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH Withdrawal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

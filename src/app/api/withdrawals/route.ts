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
    const { data: wdr } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("user_id, amount, method")
      .eq("id", requestId)
      .single();

    if (!wdr) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }

    if (status === "approved" || status === "completed") {
      // 1. Fetch live CAD rates to convert CAD back to USDT
      const rates = await fetchLiveCADRates();
      const cadRate = rates.usdtCAD || 1.36;
      const usdtToDeduct = wdr.amount / cadRate;

      // 2. Fetch the user's current USDT balance
      const { data: userWallet } = await supabaseAdmin
        .from("user_wallets")
        .select("balance")
        .eq("user_id", wdr.user_id)
        .eq("currency", "USDT")
        .single();

      const currentBalance = userWallet ? Number(userWallet.balance) : 0;
      
      // 3. Deduct the amount
      const newBalance = currentBalance - usdtToDeduct;

      // 4. If newBalance < 0, do not approve
      if (newBalance < 0) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }

      // 5. Update user_wallets
      const { error: walletErr } = await supabaseAdmin
        .from("user_wallets")
        .update({ balance: newBalance })
        .eq("user_id", wdr.user_id)
        .eq("currency", "USDT");
      if (walletErr) throw walletErr;

      // 6. Insert into wallet_ledger
      const { error: ledgerErr } = await supabaseAdmin
        .from("wallet_ledger")
        .insert({
          user_id: wdr.user_id,
          type: "WITHDRAWAL",
          provider: "INTERAC",
          currency: "USDT",
          amount: usdtToDeduct,
          status: "COMPLETED",
        });
      if (ledgerErr) throw ledgerErr;
    }

    const { error } = await supabaseAdmin
      .from("withdrawal_requests")
      .update({ 
        status, 
        rejection_reason: rejectionReason || null,
        admin_note: adminNote || null,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (error) throw error;

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

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
    const { requestId, status, rejectionReason, adminNote } = await request.json();
    if (!requestId || !status) {
      return NextResponse.json({ error: "requestId and status are required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

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

    // Fetch withdrawal request details for logging
    const { data: wdr } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("user_id, amount")
      .eq("id", requestId)
      .single();

    let userName = "Unknown User";
    let userId = "N/A";
    let amount = 0;

    if (wdr) {
      userId = wdr.user_id;
      amount = wdr.amount;
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", wdr.user_id)
        .single();
      if (profile) {
        userName = profile.full_name;
      }
    }

    const action = status === "approved" ? "Withdrawal Approved" : "Withdrawal Rejected";
    const severity = status === "approved" ? "Info" : "Warning";

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

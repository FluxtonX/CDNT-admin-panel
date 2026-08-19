import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();

    // Fetch all user bank accounts
    const { data: accounts, error: accErr } = await supabaseAdmin
      .from("user_bank_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (accErr) {
      if (accErr.code === "PGRST205" || accErr.code === "42P01") {
        return NextResponse.json({ accounts: [] });
      }
      throw accErr;
    }

    // Fetch profiles mapping
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name");

    if (profErr) {
      console.warn("Could not fetch profiles:", profErr.message);
    }

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const enriched = (accounts || []).map((acc: any) => {
      const prof = profileMap.get(acc.user_id);
      return {
        ...acc,
        balance: Number(acc.balance || 0),
        user_email: prof?.email || "Unknown User",
        user_full_name: prof?.full_name || "N/A",
      };
    });

    return NextResponse.json({ accounts: enriched });
  } catch (error: any) {
    console.error("GET Bank Accounts Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { accountId, status, accountNumber, balance, adminNotes } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Fetch existing bank account record
    const { data: acc, error: lookupErr } = await supabaseAdmin
      .from("user_bank_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (lookupErr || !acc) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (accountNumber !== undefined) updateData.account_number = accountNumber;
    if (balance !== undefined) updateData.balance = Number(balance);
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes;

    if (status === "active") {
      updateData.approved_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabaseAdmin
      .from("user_bank_accounts")
      .update(updateData)
      .eq("id", accountId);

    if (updateErr) throw updateErr;

    // Send user notification
    if (status === "active") {
      await supabaseAdmin.from("notifications").insert({
        user_id: acc.user_id,
        audience: "User",
        type: "Success",
        title: "Bank Account Approved",
        message: `Your application for ${acc.account_name} has been verified and approved! Account Number: ${accountNumber || acc.account_number}.`,
        is_read: false,
      });
    } else if (status === "rejected") {
      await supabaseAdmin.from("notifications").insert({
        user_id: acc.user_id,
        audience: "User",
        type: "Warning",
        title: "Bank Account Application Rejected",
        message: `Your application for ${acc.account_name} could not be approved at this time.${adminNotes ? ` Reason: ${adminNotes}` : ''}`,
        is_read: false,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH Bank Account Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

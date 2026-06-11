import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    // Fetch deposit requests
    const { data: deposits, error: depErr } = await supabaseAdmin
      .from("deposit_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (depErr) {
      if (depErr.code === "PGRST205") {
        // Table not created yet
        return NextResponse.json({ deposits: [] });
      }
      throw depErr;
    }

    // Fetch profiles to get names/emails
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email");

    if (profErr) throw profErr;

    // Map profiles to deposits in-memory
    const mappedDeposits = (deposits || []).map((dep: any) => {
      const profile = (profiles || []).find((p: any) => p.id === dep.user_id);
      return {
        ...dep,
        user: {
          name: profile?.full_name || "Unknown User",
          email: profile?.email || "N/A",
        }
      };
    });

    return NextResponse.json({ deposits: mappedDeposits });
  } catch (error: any) {
    console.error("GET Deposits Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { requestId, status, adminNote } = await request.json();
    if (!requestId || !status) {
      return NextResponse.json({ error: "requestId and status are required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from("deposit_requests")
      .update({ 
        status, 
        admin_note: adminNote || null,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH Deposit Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

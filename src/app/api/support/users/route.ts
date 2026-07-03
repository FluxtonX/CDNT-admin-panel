import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/users
 * Returns a minimal list of { id, email, full_name } for all auth users.
 * Used by the live-chat page to display user emails alongside their profile names.
 */
export async function GET(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "respond-chat");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const { data: kycData } = await supabaseAdmin.from("kyc_submissions").select("user_id, full_name");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name");

    const mapped = users.map((u) => {
      const kyc = kycData?.find((k) => k.user_id === u.id)?.full_name;
      const profile = profiles?.find((p) => p.id === u.id)?.full_name;
      
      return {
        id: u.id,
        email: u.email || "",
        full_name: kyc || profile || u.email || null,
      };
    });

    return NextResponse.json(mapped);
  } catch (err) {
    console.error("Error fetching support users:", err);
    return NextResponse.json([], { status: 500 });
  }
}

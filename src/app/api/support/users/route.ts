import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/support/users
 * Returns a minimal list of { id, email } for all auth users.
 * Used by the live-chat page to display user emails alongside their profile names.
 */
export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const mapped = users.map((u) => ({
      id: u.id,
      email: u.email || "",
    }));

    return NextResponse.json(mapped);
  } catch (err) {
    console.error("Error fetching support users:", err);
    return NextResponse.json([], { status: 500 });
  }
}

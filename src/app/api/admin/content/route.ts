import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/admin/content
 * Body: { key: string, value: any, type: string, category: string, label: string }
 * Updates site_content table with admin privileges.
 * Verifies the requester is an authenticated admin via session.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value, type, category, label } = body;

    if (!key || value === undefined || !type || !category || !label) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify admin session using anon client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is an active admin
    const supabaseAdmin = createAdminClient();
    const { data: adminRow, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .select("is_active")
      .eq("email", user.email)
      .single();

    if (adminError || !adminRow || !adminRow.is_active) {
      return NextResponse.json({ error: "Forbidden: Not an active admin" }, { status: 403 });
    }

    // Perform the upsert using admin client
    const { error: upsertError } = await supabaseAdmin
      .from("site_content")
      .upsert({
        key,
        value,
        type,
        category,
        label,
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error("Error upserting content:", upsertError);
      return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in content update API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

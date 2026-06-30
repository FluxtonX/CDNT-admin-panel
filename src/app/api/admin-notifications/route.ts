import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();

    // Fetch admin notifications (we use audience='Admin' to identify them)
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("audience", "Admin")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error && error.code !== "PGRST205") {
      throw error;
    }

    return NextResponse.json({ notifications: data || [] });
  } catch (error: any) {
    console.error("GET Admin Notifications Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id } = await request.json();
    const supabaseAdmin = createAdminClient();
    
    if (id) {
       await supabaseAdmin.from("notifications").update({ is_read: true }).eq("id", id);
    } else {
       await supabaseAdmin.from("notifications").update({ is_read: true }).eq("audience", "Admin");
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

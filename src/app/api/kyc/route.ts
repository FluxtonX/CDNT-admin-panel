import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("kyc_submissions")
      .select("*")
      .order("submitted_at", { ascending: false });
    
    if (error) throw error;

    // Generate signed URLs for private bucket images
    const getSignedUrl = async (publicUrl: string | null) => {
      if (!publicUrl) return null;
      const parts = publicUrl.split("kyc-documents/");
      if (parts.length < 2) return publicUrl;
      const path = parts[1];
      const { data } = await supabaseAdmin.storage.from("kyc-documents").createSignedUrl(path, 60 * 60); // 1 hr
      return data?.signedUrl || publicUrl;
    };

    const secureData = await Promise.all((data || []).map(async (item: any) => ({
      ...item,
      id_front_url: await getSignedUrl(item.id_front_url),
      id_back_url: await getSignedUrl(item.id_back_url),
      selfie_url: await getSignedUrl(item.selfie_url)
    })));
    
    return NextResponse.json({ submissions: secureData });
  } catch (error: any) {
    console.error("GET KYC Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId, status } = await request.json();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from("kyc_submissions")
      .update({ status })
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH KYC Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

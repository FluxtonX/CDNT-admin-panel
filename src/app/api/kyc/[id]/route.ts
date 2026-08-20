import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";
import { getCachedSignedUrl } from "@/lib/storage-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/kyc/[id]
 * Returns signed document URLs for a specific KYC submission on demand.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { allowed } = await checkAdminPermission(request, "review-kyc");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing submission ID" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Query submission by user_id or submission id
    const { data: submission, error } = await supabaseAdmin
      .from("kyc_submissions")
      .select("*")
      .or(`id.eq.${id},user_id.eq.${id}`)
      .single();

    if (error || !submission) {
      return NextResponse.json({ error: "KYC submission not found" }, { status: 404 });
    }

    // Generate high-resolution signed URLs (24h cache TTL)
    const [frontUrl, backUrl, selfieUrl] = await Promise.all([
      submission.id_front_url
        ? getCachedSignedUrl("kyc-documents", submission.id_front_url, 86400, { width: 1600, quality: 90 })
        : null,
      submission.id_back_url
        ? getCachedSignedUrl("kyc-documents", submission.id_back_url, 86400, { width: 1600, quality: 90 })
        : null,
      submission.selfie_url
        ? getCachedSignedUrl("kyc-documents", submission.selfie_url, 86400, { width: 1600, quality: 90 })
        : null,
    ]);

    return NextResponse.json({
      submission: {
        ...submission,
        id_front_url: frontUrl,
        id_back_url: backUrl,
        selfie_url: selfieUrl,
      },
    });
  } catch (error: any) {
    console.error("[GET KYC Detail Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

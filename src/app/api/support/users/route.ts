import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";
import { getCachedSignedUrl } from "@/lib/storage-cache";

export const dynamic = "force-dynamic";

/**
 * Common handler for retrieving support user profiles and details.
 * Supports both GET (query parameters) and POST (JSON body with large user IDs array).
 */
async function handleSupportUsers(request: Request, userIds: string[], searchQuery?: string | null) {
  const { allowed } = await checkAdminPermission(request, "respond-chat");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabaseAdmin = createAdminClient();

  // Deduplicate and filter valid IDs
  const cleanUserIds = Array.from(new Set(userIds.map((id) => id?.trim()).filter(Boolean)));

  // Query profiles and KYC submissions
  let profilesQuery = supabaseAdmin.from("profiles").select("id, full_name, email");
  let kycQuery = supabaseAdmin.from("kyc_submissions").select("user_id, full_name, selfie_url, status");

  if (cleanUserIds.length > 0) {
    profilesQuery = profilesQuery.in("id", cleanUserIds);
    kycQuery = kycQuery.in("user_id", cleanUserIds);
  } else if (searchQuery) {
    profilesQuery = profilesQuery.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
  }

  const [profilesResult, kycResult] = await Promise.all([profilesQuery, kycQuery]);

  if (profilesResult.error) {
    console.error("[support/users] profiles query error:", profilesResult.error);
    throw profilesResult.error;
  }

  const profiles = profilesResult.data || [];
  const kycData = kycResult.data || [];

  // Generate stable cached signed URLs for approved KYC selfies
  const kycDataWithSignedUrls = await Promise.all(
    kycData.map(async (kyc) => {
      if (kyc.selfie_url && kyc.status === "approved") {
        try {
          const signedSelfieUrl = await getCachedSignedUrl("kyc-documents", kyc.selfie_url, 86400, {
            width: 96,
            height: 96,
            resize: "cover",
            quality: 80,
          });

          return {
            ...kyc,
            signed_selfie_url: signedSelfieUrl,
          };
        } catch (err) {
          console.error(`[support/users] Error generating signed URL for ${kyc.user_id}:`, err);
        }
      }
      return { ...kyc, signed_selfie_url: null };
    })
  );

  // Determine all user IDs to resolve: from requested IDs or found profiles/KYCs
  const allIds = cleanUserIds.length > 0
    ? cleanUserIds
    : Array.from(new Set([...profiles.map((p) => p.id), ...kycData.map((k) => k.user_id)]));

  const mapped = await Promise.all(
    allIds.map(async (uid) => {
      const p = profiles.find((prof) => prof.id === uid);
      const kyc = kycDataWithSignedUrls.find((k) => k.user_id === uid);

      let email = p?.email || "";
      let fullName = kyc?.full_name || p?.full_name || "";
      let googleAvatarUrl: string | null = null;

      // If still missing name or email, look up in auth.users as a final fallback
      if (!fullName || !email) {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (authUser?.user) {
            if (!email) email = authUser.user.email || "";
            if (!fullName) {
              fullName =
                authUser.user.user_metadata?.full_name ||
                authUser.user.user_metadata?.name ||
                authUser.user.email?.split("@")[0] ||
                "";
            }
            googleAvatarUrl = authUser.user.user_metadata?.avatar_url || null;
          }
        } catch {
          /* ignore auth lookup failure */
        }
      }

      return {
        id: uid,
        email: email || "N/A",
        full_name: fullName || (email ? email.split("@")[0] : "Unknown User"),
        kyc_selfie_url: kyc?.status === "approved" ? kyc.signed_selfie_url : null,
        google_avatar_url: googleAvatarUrl,
      };
    })
  );

  return NextResponse.json(mapped);
}

/**
 * GET /api/support/users?ids=...&q=...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    const userIds = idsParam ? idsParam.split(",").filter(Boolean) : [];
    const searchQuery = searchParams.get("q");

    return await handleSupportUsers(request, userIds, searchQuery);
  } catch (err) {
    console.error("Error fetching support users via GET:", err);
    return NextResponse.json([], { status: 500 });
  }
}

/**
 * POST /api/support/users
 * Body: { ids?: string[], q?: string }
 * Prevents URL length limits when querying dozens of user IDs at once.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userIds = Array.isArray(body?.ids) ? body.ids : [];
    const searchQuery = typeof body?.q === "string" ? body.q : null;

    return await handleSupportUsers(request, userIds, searchQuery);
  } catch (err) {
    console.error("Error fetching support users via POST:", err);
    return NextResponse.json([], { status: 500 });
  }
}

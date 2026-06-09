import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    // Fetch all users securely using service_role
    const { data: { users }, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
    if (authErr) throw authErr;

    // Fetch profiles to get their full names
    const { data: profiles, error: profErr } = await supabaseAdmin.from("profiles").select("*");
    if (profErr) throw profErr;

    // Fetch KYC submissions to get real verification statuses
    const { data: kycData, error: kycErr } = await supabaseAdmin.from("kyc_submissions").select("*");
    if (kycErr) throw kycErr;

    // Map and merge data together
    const mappedUsers = users.map((user) => {
      // Find matching profile and KYC
      const profile = profiles.find((p: any) => p.id === user.id);
      const kyc = kycData.find((k: any) => k.user_id === user.id);

      // Determine KYC Status
      let kycStatus = "Not Started";
      if (kyc) {
        if (kyc.status === "approved") kycStatus = "Verified";
        else if (kyc.status === "pending") kycStatus = "Pending";
        else if (kyc.status === "rejected") kycStatus = "Rejected";
      }

      // Default static values for Balance, Risk, and Account
      // You can replace these with real database fields when ready
      const defaultBalance = 0;
      const accountStatus = "Active";
      const riskLevel = "Low Risk";

      // Parse metadata
      const rawName = profile?.full_name || user.user_metadata?.full_name || "Unknown User";

      return {
        id: user.id, // For routing and unique keys
        shortId: user.id.slice(0, 8).toUpperCase(), // For UI display
        name: rawName,
        email: user.email,
        phone: user.phone || "N/A",
        joinedDate: new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        kyc: kycStatus,
        account: accountStatus,
        balance: defaultBalance,
        risk: riskLevel,
      };
    });

    return NextResponse.json({ users: mappedUsers });
  } catch (error: any) {
    console.error("Failed to fetch users API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

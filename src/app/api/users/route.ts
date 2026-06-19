import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "view-users");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // Fetch all user wallets
    const { data: userWallets, error: walletsErr } = await supabaseAdmin.from("user_wallets").select("*");
    if (walletsErr) throw walletsErr;

    const rates: Record<string, number> = {
      BTC: 90000,
      ETH: 4500,
      USDT: 1.36,
      USDC: 1.36
    };

    const userBalanceMap = (userWallets || []).reduce((acc: Record<string, number>, w: any) => {
      const rate = rates[w.currency?.toUpperCase()] || 1.36;
      const val = Number(w.balance) * rate;
      acc[w.user_id] = (acc[w.user_id] || 0) + val;
      return acc;
    }, {});

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

      const walletsForUser = (userWallets || [])
        .filter((w: any) => w.user_id === user.id)
        .map((w: any) => ({
          currency: w.currency,
          balance: Number(w.balance),
        }));

      // Default static values for Risk and Account
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
        balance: userBalanceMap[user.id] || 0,
        wallets: walletsForUser,
        risk: riskLevel,
      };
    });

    return NextResponse.json({ users: mappedUsers });
  } catch (error: any) {
    console.error("Failed to fetch users API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


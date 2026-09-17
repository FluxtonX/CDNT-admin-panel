import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";
import { fetchLiveCADRates } from "@/lib/utils";
import { getCachedSignedUrl } from "@/lib/storage-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "view-users");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    // Fetch ALL users — paginate because Supabase defaults to 50 per page
    let users: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (authErr) throw authErr;
      users = users.concat(data.users);
      if (data.users.length < perPage) break;
      page++;
    }

    // Fetch profiles to get their full names, freeze status, and locked status
    let profiles: any[] = [];
    const { data: profWithLocked, error: profWithLockedErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, is_frozen, is_locked");
    if (!profWithLockedErr && profWithLocked) {
      profiles = profWithLocked;
    } else {
      const { data: profFallback, error: fallbackErr } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, is_frozen");
      if (fallbackErr) throw fallbackErr;
      profiles = profFallback || [];
    }

    // Fetch KYC submissions to get real verification statuses and selfie URLs
    const { data: kycData, error: kycErr } = await supabaseAdmin.from("kyc_submissions").select("user_id, full_name, selfie_url, status");
    if (kycErr) throw kycErr;

    // Generate stable cached signed URLs with thumbnail transformation for KYC selfies
    const kycDataWithSignedUrls = await Promise.all(
      (kycData || []).map(async (kyc) => {
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
            console.error(`[users API] Error generating signed URL for ${kyc.user_id}:`, err);
          }
        }
        return { ...kyc, signed_selfie_url: null };
      })
    );

    // Fetch all user wallets and active bank accounts
    const [
      { data: userWallets, error: walletsErr },
      { data: userBankAccounts, error: bankAccsErr }
    ] = await Promise.all([
      supabaseAdmin.from("user_wallets").select("*"),
      supabaseAdmin.from("user_bank_accounts").select("user_id, currency, balance, status").eq("status", "active")
    ]);
    if (walletsErr) throw walletsErr;
    if (bankAccsErr) console.warn("Could not fetch user_bank_accounts:", bankAccsErr.message);

    // Extract unique currencies from user_wallets for dynamic rate fetching
    const uniqueCurrencies = new Set<string>();
    (userWallets || []).forEach(w => {
      if (w.currency) uniqueCurrencies.add(w.currency.toUpperCase());
    });
    const currencySymbols = Array.from(uniqueCurrencies);
    const liveRates = await fetchLiveCADRates(currencySymbols.length > 0 ? currencySymbols : ["BTC", "ETH", "USDT"]);

    // Calculate user balances and CAD bank totals
    const userBalanceMap: Record<string, number> = {};
    const userCadBankMap: Record<string, number> = {};

    // 1. Add crypto balances ONLY (exclude CAD from user_wallets to avoid duplication)
    (userWallets || []).forEach((w: any) => {
      const isCAD = w.currency?.toUpperCase() === "CAD";
      if (!isCAD) {
        const rate = liveRates[w.currency?.toUpperCase()] || liveRates.USDT || 1.36;
        const val = Number(w.balance || 0) * rate;
        userBalanceMap[w.user_id] = (userBalanceMap[w.user_id] || 0) + val;
      }
    });

    // 2. Add active fiat bank accounts (CAD Chequing / Savings / TFSA / RRSP)
    (userBankAccounts || []).forEach((b: any) => {
      const isCAD = (b.currency || "CAD").toUpperCase() === "CAD";
      const rate = isCAD ? 1 : (liveRates[b.currency?.toUpperCase()] || 1);
      const val = Number(b.balance || 0) * rate;
      userBalanceMap[b.user_id] = (userBalanceMap[b.user_id] || 0) + val;
      if (isCAD) {
        userCadBankMap[b.user_id] = (userCadBankMap[b.user_id] || 0) + Number(b.balance || 0);
      }
    });

    // Map and merge data together
    const mappedUsers = users.map((user) => {
      // Find matching profile and KYC
      const profile = profiles.find((p: any) => p.id === user.id);
      const kyc = kycDataWithSignedUrls.find((k: any) => k.user_id === user.id);

      // Determine KYC Status
      let kycStatus = "Not Started";
      if (kyc) {
        if (kyc.status === "approved") kycStatus = "Verified";
        else if (kyc.status === "pending") kycStatus = "Pending";
        else if (kyc.status === "rejected") kycStatus = "Rejected";
      }

      // Filter out CAD from raw user_wallets and use true CAD bank total
      const rawWallets = (userWallets || [])
        .filter((w: any) => w.user_id === user.id && w.currency?.toUpperCase() !== "CAD")
        .map((w: any) => ({
          currency: w.currency,
          balance: Number(w.balance),
        }));

      const cadBankBal = userCadBankMap[user.id] || 0;
      const walletsForUser = [
        { currency: "CAD", balance: cadBankBal },
        ...rawWallets
      ];

      const isFrozen = !!profile?.is_frozen;
      const isLocked = !isFrozen && !!profile?.is_locked;
      const accountStatus = isFrozen ? "Frozen" : (isLocked ? "Locked" : "Active");
      const riskLevel = "Low Risk";

      // Parse metadata
      const rawName = profile?.full_name || user.user_metadata?.full_name || "Unknown User";

      // Debug: log user_metadata for all users to see avatar_url
      console.log(`[users API] User ${rawName} (${user.id}) user_metadata:`, {
        avatar_url: user.user_metadata?.avatar_url,
        full_metadata: user.user_metadata,
      });

      // Avatar URLs
      const kycSelfieUrl = kyc?.status === "approved" ? kyc.signed_selfie_url : null;
      const googleAvatarUrl = user.user_metadata?.avatar_url || null;

      // Debug: log avatar data for users with Google avatars
      if (googleAvatarUrl) {
        console.log(`[users API] User ${rawName} (${user.id}) has Google avatar:`, {
          googleAvatarUrl,
          kycStatus: kycStatus,
        });
      }

      return {
        id: user.id, // For routing and unique keys
        shortId: user.id.slice(0, 8).toUpperCase(), // For UI display
        name: rawName,
        email: user.email,
        phone: user.phone || "N/A",
        createdAt: user.created_at,
        joinedDate: new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        kyc: kycStatus,
        account: accountStatus,
        is_frozen: isFrozen,
        is_locked: isLocked,
        lock_reason: profile?.lock_reason || null,
        balance: userBalanceMap[user.id] || 0,
        wallets: walletsForUser,
        risk: riskLevel,
        kyc_selfie_url: kycSelfieUrl,
        google_avatar_url: googleAvatarUrl,
      };
    });

    return NextResponse.json({ users: mappedUsers });
  } catch (error: any) {
    console.error("Failed to fetch users API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "edit-users");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    if (action === "freeze" || action === "unfreeze") {
      const isFrozen = action === "freeze";

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_frozen: isFrozen })
        .eq("id", userId);

      if (error) {
        if (error.message.includes("relation")) {
           return NextResponse.json({ success: true, warning: "profiles table does not exist" });
        }
        throw error;
      }

      if (isFrozen) {
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          title: "Account Frozen",
          message: "Your account has been temporarily frozen. Please contact support for assistance.",
          type: "error",
          is_read: false,
        });
      } else {
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          title: "Account Activated",
          message: "Your account has been reactivated successfully.",
          type: "success",
          is_read: false,
        });
      }

      // Insert audit log
      await supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        admin_id: null,
        action: isFrozen ? "ACCOUNT_FROZEN" : "ACCOUNT_UNFROZEN",
        details: { reason: "admin action" },
      });

      return NextResponse.json({ success: true, status: isFrozen ? "Frozen" : "Active" });
    }

    if (action === "lock" || action === "unlock") {
      const isLocked = action === "lock";
      const lockReason = isLocked ? (body.reason?.trim() || null) : null;

      const updatePayload: { is_locked: boolean; lock_reason?: string | null } = {
        is_locked: isLocked,
        lock_reason: lockReason,
      };

      let { error } = await supabaseAdmin
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);

      if (error && error.message.includes("lock_reason")) {
        const fallbackRes = await supabaseAdmin
          .from("profiles")
          .update({ is_locked: isLocked })
          .eq("id", userId);
        error = fallbackRes.error;
      }

      if (error) {
        if (error.message.includes("relation") || error.message.includes("column")) {
          return NextResponse.json({ success: true, warning: "profiles table or is_locked column pending migration" });
        }
        throw error;
      }

      if (isLocked) {
        const lockMsg = body.reason?.trim()
          ? `Your account has been locked to view-only mode. Reason: "${body.reason.trim()}". Please contact support if you need assistance.`
          : "Your account has been locked to view-only mode. Trading and withdrawals are restricted. Please contact support.";

        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          title: "Account Locked",
          message: lockMsg,
          type: "warning",
          is_read: false,
        });
      } else {
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          title: "Account Unlocked",
          message: "Your account has been unlocked. Full trading and transaction capabilities have been restored.",
          type: "success",
          is_read: false,
        });
      }

      // Insert audit log
      await supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        admin_id: null,
        action: isLocked ? "ACCOUNT_LOCKED" : "ACCOUNT_UNLOCKED",
        details: { reason: body.reason || "admin action" },
      });

      return NextResponse.json({ success: true, status: isLocked ? "Locked" : "Active", is_locked: isLocked, lock_reason: lockReason });
    }

    if (action === "adjust-balance") {
      const { currency, delta } = body;
      if (!currency || delta === undefined) {
        return NextResponse.json({ error: "Missing currency or delta for balance adjustment" }, { status: 400 });
      }

      const isCAD = currency.toUpperCase() === "CAD";

      if (isCAD) {
        // Fetch or create active Chequing account
        const { data: existingAcc } = await supabaseAdmin
          .from("user_bank_accounts")
          .select("id, balance")
          .eq("user_id", userId)
          .eq("account_type", "chequing")
          .eq("status", "active")
          .maybeSingle();

        const currentBalance = existingAcc ? Number(existingAcc.balance || 0) : 0;
        const newBalance = currentBalance + delta;

        if (newBalance < 0) {
          return NextResponse.json({ error: `Insufficient CAD balance: Account has $${currentBalance.toFixed(2)} CAD.` }, { status: 400 });
        }

        if (existingAcc) {
          const { error: updateErr } = await supabaseAdmin
            .from("user_bank_accounts")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("id", existingAcc.id);
          if (updateErr) throw updateErr;
        } else {
          const randomAcc = "05496-" + Math.floor(1000000 + Math.random() * 9000000);
          const { error: insertErr } = await supabaseAdmin
            .from("user_bank_accounts")
            .insert({
              user_id: userId,
              account_category: "everyday",
              account_type: "chequing",
              account_name: "Chequing Account",
              account_number: randomAcc,
              currency: "CAD",
              balance: newBalance,
              status: "active",
              approved_at: new Date().toISOString(),
            });
          if (insertErr) throw insertErr;
        }

        // Insert wallet_ledger entry
        await supabaseAdmin
          .from("wallet_ledger")
          .insert({
            user_id: userId,
            type: "ADMIN_ADJUSTMENT",
            provider: "ADMIN",
            currency: "CAD",
            amount: delta,
            status: "COMPLETED",
          });

        // Insert audit log
        await supabaseAdmin.from("audit_logs").insert({
          user_id: userId,
          admin_id: null,
          action: "BALANCE_ADJUSTED",
          details: { currency: "CAD", amount: delta, type: delta > 0 ? "add" : "deduct" },
        });

        return NextResponse.json({ success: true, newBalance });
      } else {
        // Crypto balance adjustment in user_wallets
        const { data: wallet, error: fetchErr } = await supabaseAdmin
          .from("user_wallets")
          .select("balance")
          .eq("user_id", userId)
          .eq("currency", currency)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        const currentBalance = wallet ? Number(wallet.balance) : 0;
        const newBalance = currentBalance + delta;

        if (newBalance < 0) {
          return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
        }

        if (wallet) {
          const { error } = await supabaseAdmin
            .from("user_wallets")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("currency", currency);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin
            .from("user_wallets")
            .insert({ user_id: userId, currency, balance: newBalance });
          if (error) throw error;
        }

        // Insert wallet_ledger entry using admin client to bypass RLS
        const { error: ledgerError } = await supabaseAdmin
          .from("wallet_ledger")
          .insert({
            user_id: userId,
            type: "ADMIN_ADJUSTMENT",
            provider: "ADMIN",
            currency: currency,
            amount: delta,
            status: "COMPLETED",
          });
        if (ledgerError) throw ledgerError;

        // Insert audit log
        await supabaseAdmin.from("audit_logs").insert({
          user_id: userId,
          admin_id: null,
          action: "BALANCE_ADJUSTED",
          details: { currency, amount: delta, type: delta > 0 ? "add" : "deduct" },
        });

        return NextResponse.json({ success: true, newBalance });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to update user status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "edit-users");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      password,
      initialCadBalance = 0,
      kycStatus = "Verified",
    } = body;

    if (!email || !fullName) {
      return NextResponse.json({ error: "Full Name and Email are required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const finalPassword = password && password.trim() ? password.trim() : `CDNT-${Math.random().toString(36).slice(-8)}!`;

    const supabaseAdmin = createAdminClient();

    // 1. Create auth user with confirmed email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        phone: phone ? phone.trim() : null,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const newUser = authData.user;

    // 2. Upsert profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUser.id,
        full_name: fullName.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        is_frozen: false,
        is_locked: false,
        role: "client",
      });

    if (profileError) {
      console.warn("[users POST] Profile upsert notice:", profileError.message);
    }

    // 3. Ensure CAD Chequing Account exists and set balance
    const randomAccNum = `05496-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const parsedBalance = parseFloat(initialCadBalance) || 0;

    const { data: existingAcc } = await supabaseAdmin
      .from("user_bank_accounts")
      .select("id")
      .eq("user_id", newUser.id)
      .eq("account_type", "chequing")
      .maybeSingle();

    if (existingAcc) {
      if (parsedBalance > 0) {
        await supabaseAdmin
          .from("user_bank_accounts")
          .update({ balance: parsedBalance })
          .eq("id", existingAcc.id);
      }
    } else {
      await supabaseAdmin.from("user_bank_accounts").insert({
        user_id: newUser.id,
        account_category: "everyday",
        account_type: "chequing",
        account_name: "Chequing Account",
        account_number: randomAccNum,
        currency: "CAD",
        balance: parsedBalance,
        status: "active",
        approved_at: new Date().toISOString(),
      });
    }

    // 4. Provision default crypto wallets (BTC, ETH, USDT, USDC)
    const defaultCrypto = ["BTC", "ETH", "USDT", "USDC"];
    for (const cur of defaultCrypto) {
      await supabaseAdmin.from("user_wallets").upsert(
        {
          user_id: newUser.id,
          currency: cur,
          balance: 0,
        },
        { onConflict: "user_id,currency" }
      );
    }

    // 5. If initial balance > 0, create a ledger entry
    if (parsedBalance > 0) {
      await supabaseAdmin.from("wallet_ledgers").insert({
        user_id: newUser.id,
        type: "DEPOSIT",
        provider: "ADMIN_INITIAL",
        currency: "CAD",
        amount: parsedBalance,
        status: "COMPLETED",
      });
    }

    // 6. If KYC status requested as Verified, create/update kyc_submissions
    if (kycStatus === "Verified") {
      await supabaseAdmin.from("kyc_submissions").upsert({
        user_id: newUser.id,
        full_name: fullName.trim(),
        status: "approved",
        document_type: "Passport",
        reviewed_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }

    // 7. Send welcome notification
    await supabaseAdmin.from("notifications").insert({
      user_id: newUser.id,
      title: "Welcome to CDNT Bank",
      message: `Your account has been successfully opened by our private banking team. Everyday CAD Chequing is ready.`,
      type: "success",
      is_read: false,
    });

    // 8. Audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: newUser.id,
      admin_id: null,
      action: "MANUAL_CLIENT_ACCOUNT_OPENED",
      details: {
        email: normalizedEmail,
        initialBalance: parsedBalance,
        kycStatus,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: normalizedEmail,
        fullName: fullName.trim(),
        temporaryPassword: finalPassword,
        accountNumber: randomAccNum,
        initialCadBalance: parsedBalance,
      },
    });
  } catch (error: any) {
    console.error("[users POST] Error creating client account:", error);
    return NextResponse.json({ error: error.message || "Failed to create client account" }, { status: 500 });
  }
}


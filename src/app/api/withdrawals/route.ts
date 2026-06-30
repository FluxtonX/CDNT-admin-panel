import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";
import { fetchLiveCADRates } from "@/lib/utils";

// Helper function to send email via Brevo
async function sendBrevoEmail(email: string, subject: string, htmlContent: string) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    console.log(`[LOCAL DEV] Would send email to ${email}: ${subject}`);
    return;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: "CDNTB Support", email: "noreply@cdntbank.com" },
      to: [{ email }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    console.error("[sendBrevoEmail] Brevo API Error:", responseBody);
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "approve-withdrawals");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    // Fetch withdrawal requests
    const { data: withdrawals, error: wdrErr } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (wdrErr) {
      if (wdrErr.code === "PGRST205") {
        // Table not created yet
        return NextResponse.json({ withdrawals: [] });
      }
      throw wdrErr;
    }

    // Fetch profiles to get names/emails
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email");

    if (profErr) throw profErr;

    // Map profiles to withdrawals in-memory
    const mappedWithdrawals = (withdrawals || []).map((wdr: any) => {
      const profile = (profiles || []).find((p: any) => p.id === wdr.user_id);
      return {
        ...wdr,
        user: {
          name: profile?.full_name || "Unknown User",
          email: profile?.email || "N/A",
        }
      };
    });

    return NextResponse.json({ withdrawals: mappedWithdrawals });
  } catch (error: any) {
    console.error("GET Withdrawals Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "approve-withdrawals");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { requestId, status, rejectionReason, adminNote } = await request.json();
    if (!requestId || !status) {
      return NextResponse.json({ error: "requestId and status are required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Fetch withdrawal request details
    const { data: wdr, error: wdrLookupErr } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (wdrLookupErr || !wdr) {
      console.error("Withdrawal lookup failed:", {
        requestId,
        error: wdrLookupErr?.message,
        code: wdrLookupErr?.code,
        details: wdrLookupErr?.details,
      });
      return NextResponse.json(
        { error: "Withdrawal request not found", details: wdrLookupErr?.message },
        { status: 404 }
      );
    }

    const cryptoCurrency = String((wdr as any).currency || (wdr as any).asset || "USDT").toUpperCase();
    let cryptoAmountToDeduct = 0;

    if (status === "approved" || status === "completed") {
      // 2. Fetch live CAD rates
      const rates = await fetchLiveCADRates();
      
      // 3. Convert CAD withdrawal amount to that crypto using live rate
      // fetchLiveCADRates returns keys as uppercase coin symbols: BTC, ETH, USDT, etc.
      const cadRate = Number(rates[cryptoCurrency]) || Number(rates["USDT"]) || 1.36;

      const amountToDeduct = wdr.amount / cadRate;
      cryptoAmountToDeduct = amountToDeduct;

      // 4. Fetch user balance for that specific currency from user_wallets
      const { data: userWallet, error: walletQueryErr } = await supabaseAdmin
        .from("user_wallets")
        .select("balance")
        .eq("user_id", wdr.user_id)
        .eq("currency", cryptoCurrency)
        .maybeSingle();

      if (walletQueryErr) {
        console.error("Error fetching user wallet:", walletQueryErr);
      }

      const currentBalance = userWallet ? Number(userWallet.balance) : 0;
      const newBalance = currentBalance - amountToDeduct;

      // Block if insufficient funds in the specific crypto wallet
      if (newBalance < 0) {
        return NextResponse.json({ error: `Insufficient balance: User only has ${currentBalance.toFixed(6)} ${cryptoCurrency}, but this withdrawal requires ${amountToDeduct.toFixed(6)} ${cryptoCurrency}.` }, { status: 400 });
      }

      // 5. Deduct from the correct currency wallet
      const { error: walletErr } = await supabaseAdmin
        .from("user_wallets")
        .update({ balance: newBalance })
        .eq("user_id", wdr.user_id)
        .eq("currency", cryptoCurrency);
      if (walletErr) throw walletErr;

      // 6. wallet_ledger entry should also use the correct currency
      const { error: ledgerErr } = await supabaseAdmin
        .from("wallet_ledger")
        .insert({
          user_id: wdr.user_id,
          type: "WITHDRAWAL",
          provider: "INTERAC",
          currency: cryptoCurrency,
          amount: amountToDeduct,
          status: "COMPLETED",
        });
      if (ledgerErr) throw ledgerErr;
    }

    const updateData: any = { status };
    if (rejectionReason) updateData.rejection_reason = rejectionReason;
    if (adminNote) updateData.admin_note = adminNote;
    
    const { error } = await supabaseAdmin
      .from("withdrawal_requests")
      .update(updateData)
      .eq("id", requestId);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let userName = "Unknown User";
    let userEmail = "";
    let userId = wdr.user_id;
    let amount = wdr.amount;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", wdr.user_id)
      .single();
    if (profile) {
      userName = profile.full_name;
      userEmail = profile.email;
    }

    const action = (status === "approved" || status === "completed") ? "Withdrawal Approved" : "Withdrawal Rejected";
    const severity = (status === "approved" || status === "completed") ? "Info" : "Warning";

    await supabaseAdmin.from("security_logs").insert({
      action,
      category: "Transaction",
      severity,
      user_name: userName,
      user_id: userId,
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
      details: `${action} of $${amount} CAD for user ${userId}. Note: ${adminNote || 'None'}`,
      user_agent: request.headers.get("user-agent") || "Unknown",
      performed_by_admin: "ADM-001"
    });

    const isApproved = status === "approved" || status === "completed";
    const notifTitle = isApproved ? "Withdrawal Approved" : "Withdrawal Rejected";
    const notifType = isApproved ? "Success" : "Error";
    const notifMessage = isApproved 
      ? `Your withdrawal request for $${amount.toLocaleString()} CAD has been approved and processed.`
      : `Your withdrawal request for $${amount.toLocaleString()} CAD was rejected.${rejectionReason || adminNote ? ` Reason: ${rejectionReason || adminNote}` : ''}`;

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: notifType,
      title: notifTitle,
      message: notifMessage,
      is_read: false
    });

    if (userEmail) {
      const emailDate = new Date().toLocaleString();
      const emailHtml = isApproved 
        ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
             <h2 style="color: #0F172A;">Withdrawal Approved</h2>
             <p style="color: #475569; font-size: 16px;">Hello ${userName},</p>
             <p style="color: #475569; font-size: 16px;">Your withdrawal request has been approved and processed.</p>
             <p style="color: #475569; font-size: 14px;"><strong>Withdrawal Amount:</strong> ${cryptoAmountToDeduct.toFixed(6)} ${cryptoCurrency}</p>
             <p style="color: #475569; font-size: 14px;"><strong>CAD Value:</strong> $${amount.toLocaleString()} CAD</p>
             <p style="color: #475569; font-size: 14px;"><strong>Approval Date:</strong> ${emailDate}</p>
             ${adminNote ? `<p style="color: #475569; font-size: 14px;"><strong>Admin Note:</strong> ${adminNote}</p>` : ''}
             <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
             <p style="color: #94A3B8; font-size: 12px; text-align: center;">Secure Admin Portal &copy; Canadian National Trust Bank</p>
           </div>`
        : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
             <h2 style="color: #0F172A;">Withdrawal Rejected</h2>
             <p style="color: #475569; font-size: 16px;">Hello ${userName},</p>
             <p style="color: #475569; font-size: 16px;">Your withdrawal request was rejected.</p>
             <p style="color: #475569; font-size: 14px;"><strong>Withdrawal Amount:</strong> $${amount.toLocaleString()} CAD</p>
             <p style="color: #475569; font-size: 14px;"><strong>Currency:</strong> ${cryptoCurrency}</p>
             <p style="color: #475569; font-size: 14px;"><strong>Rejection Date:</strong> ${emailDate}</p>
             <p style="color: #475569; font-size: 14px;"><strong>Reason:</strong> ${rejectionReason || adminNote || 'No specific reason provided.'}</p>
             <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
             <p style="color: #94A3B8; font-size: 12px; text-align: center;">Secure Admin Portal &copy; Canadian National Trust Bank</p>
           </div>`;

      // Do not await to avoid blocking the response
      sendBrevoEmail(
        userEmail, 
        isApproved ? "Withdrawal Approved - CDNT Bank" : "Withdrawal Rejected - CDNT Bank", 
        emailHtml
      ).catch(e => console.error("Failed to send withdrawal email:", e));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH Withdrawal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

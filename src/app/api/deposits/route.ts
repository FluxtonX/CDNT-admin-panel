import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAdminPermission } from "@/lib/checkAdminPermission";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "view-transactions");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    // Fetch profiles first to get names/emails for matching
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email");

    if (profErr) throw profErr;

    // Fetch deposit requests
    const { data: deposits, error: depErr } = await supabaseAdmin
      .from("deposit_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (depErr && depErr.code !== "PGRST205") {
      throw depErr;
    }

    // Map profiles to manual deposits
    const mappedDeposits = (deposits || []).map((dep: any) => {
      const profile = (profiles || []).find((p: any) => p.id === dep.user_id);
      return {
        ...dep,
        user: {
          name: profile?.full_name || "Unknown User",
          email: profile?.email || "N/A",
        }
      };
    });

    // Fetch payment_orders (Binance Pay)
    const { data: payOrders, error: payErr } = await supabaseAdmin
      .from("payment_orders")
      .select("*")
      .order("created_at", { ascending: false });

    let mappedPayOrders: any[] = [];
    if (!payErr) {
      mappedPayOrders = (payOrders || []).map((order: any) => {
        const profile = (profiles || []).find((p: any) => p.id === order.user_id);
        return {
          id: order.id,
          user_id: order.user_id,
          asset: order.currency,
          network: "Binance Pay",
          company_address: "BINANCE_PAY",
          expected_amount: order.amount,
          tx_hash: order.merchant_trade_no,
          status: order.status === "PAID" ? "approved" : (order.status === "PENDING" ? "pending" : "rejected"),
          admin_note: order.prepay_id ? `Prepay ID: ${order.prepay_id}` : null,
          created_at: order.created_at,
          reviewed_at: order.paid_at,
          user: {
            name: profile?.full_name || "Unknown User",
            email: profile?.email || "N/A",
          }
        };
      });
    }

    // Merge both types of deposits and sort by created_at descending
    const allDeposits = [...mappedDeposits, ...mappedPayOrders].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ deposits: allDeposits });
  } catch (error: any) {
    console.error("GET Deposits Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { allowed } = await checkAdminPermission(request, "view-transactions");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { requestId, status, adminNote } = await request.json();
    if (!requestId || !status) {
      return NextResponse.json({ error: "requestId and status are required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Check if the requestId exists in payment_orders (Binance Pay)
    const { data: order } = await supabaseAdmin
      .from("payment_orders")
      .select("status, merchant_trade_no, user_id, amount, currency")
      .eq("id", requestId)
      .maybeSingle();

    if (order) {
      // If manual approval on a Binance Pay order, trigger the atomic complete_payment_order RPC
      if (status === "approved") {
        const { data: rpcSuccess, error: rpcError } = await supabaseAdmin.rpc("complete_payment_order", {
          p_merchant_trade_no: order.merchant_trade_no,
          p_transaction_id: "ADMIN_MANUAL_APPROVE",
          p_raw_webhook: { admin_approved: true, note: adminNote || null },
        });
        if (rpcError) throw rpcError;
      } else {
        // If rejected, mark the order as FAILED
        const { error } = await supabaseAdmin
          .from("payment_orders")
          .update({ 
            status: "FAILED", 
            raw_webhook: { admin_rejected: true, note: adminNote || null },
            updated_at: new Date().toISOString()
          })
          .eq("id", requestId);
        if (error) throw error;
      }
    } else {
      // Otherwise update the traditional manual deposit_requests
      const { data: dep } = await supabaseAdmin
        .from("deposit_requests")
        .select("user_id, expected_amount, asset")
        .eq("id", requestId)
        .maybeSingle();

      const { error } = await supabaseAdmin
        .from("deposit_requests")
        .update({ 
          status, 
          admin_note: adminNote || null,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;

      if (dep) {
        const isApproved = status === "approved" || status === "completed";
        const notifTitle = isApproved ? "Deposit Confirmed" : "Deposit Rejected";
        const notifType = isApproved ? "Success" : "Error";
        const notifMessage = isApproved 
          ? `Your deposit of ${dep.expected_amount} ${dep.asset} has been confirmed and added to your balance.`
          : `Your deposit of ${dep.expected_amount} ${dep.asset} was rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`;

        await supabaseAdmin.from("notifications").insert({
          user_id: dep.user_id,
          type: notifType,
          title: notifTitle,
          message: notifMessage,
          is_read: false
        });
      }
    }

    if (order) {
      const isApproved = status === "approved" || status === "completed";
      const notifTitle = isApproved ? "Deposit Confirmed" : "Deposit Rejected";
      const notifType = isApproved ? "Success" : "Error";
      const notifMessage = isApproved 
        ? `Your deposit of ${order.amount} ${order.currency} via Binance Pay has been confirmed.`
        : `Your deposit of ${order.amount} ${order.currency} via Binance Pay was rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`;

      await supabaseAdmin.from("notifications").insert({
        user_id: order.user_id,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        is_read: false
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH Deposit Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

// ラベル作成済みフラグをリセット（再発行用）
export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdminAuth(req);
    if (!admin) return unauthorized();

    const tenantId = await resolveTenantIdOrThrow(req);
    const { orderId } = await req.json();

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // 該当注文の存在確認（テナント制限付き）
    const { data: order, error: fetchErr } = await strictWithTenant(
      supabaseAdmin.from("orders").select("id, shipping_list_created_at, shipping_status"),
      tenantId
    )
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "注文が見つかりません" }, { status: 404 });
    }

    if (!order.shipping_list_created_at) {
      return NextResponse.json({ error: "ラベル未作成の注文です" }, { status: 400 });
    }

    if (order.shipping_status === "shipped") {
      return NextResponse.json({ error: "発送済みの注文はリセットできません" }, { status: 400 });
    }

    // shipping_list_created_at をNULLにリセット
    const { error: updateErr } = await strictWithTenant(
      supabaseAdmin.from("orders").update({ shipping_list_created_at: null }),
      tenantId
    ).eq("id", orderId);

    if (updateErr) {
      console.error("ラベルリセットエラー:", updateErr);
      return serverError(updateErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("ラベルリセットエラー:", e);
    return serverError(e instanceof Error ? e.message : "Unknown error");
  }
}

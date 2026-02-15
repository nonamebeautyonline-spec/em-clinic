// app/api/admin/update-order-address/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const session = req.cookies.get("admin_session")?.value;
  if (!session) return false;
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(session, secret);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await verifyAdmin(req))) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const body = await req.json().catch(() => ({} as any));
    const orderId = (body.orderId ?? "").trim();
    const rawPostal = (body.postalCode ?? "").trim();
    const address = (body.address ?? "").trim();
    const shippingName = (body.shippingName ?? "").trim();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "orderId は必須です" }, { status: 400 });
    }

    const postalDigits = rawPostal.replace(/[^0-9]/g, "");
    if (postalDigits.length !== 7) {
      return NextResponse.json({ ok: false, error: "郵便番号は7桁で入力してください" }, { status: 400 });
    }
    const postalCode = `${postalDigits.slice(0, 3)}-${postalDigits.slice(3)}`;

    if (!address) {
      return NextResponse.json({ ok: false, error: "住所を入力してください" }, { status: 400 });
    }
    if (address.length > 200) {
      return NextResponse.json({ ok: false, error: "住所は200文字以内で入力してください" }, { status: 400 });
    }
    if (shippingName && shippingName.length > 50) {
      return NextResponse.json({ ok: false, error: "名義は50文字以内で入力してください" }, { status: 400 });
    }

    // 注文の存在確認
    const { data: order, error: fetchError } = await withTenant(
      supabaseAdmin
        .from("orders")
        .select("id, patient_id")
        .eq("id", orderId),
      tenantId
    ).maybeSingle();

    if (fetchError || !order) {
      return NextResponse.json({ ok: false, error: "注文が見つかりません" }, { status: 404 });
    }

    // 更新（管理者は発送済み・リスト作成済みチェックなし）
    const updateData: Record<string, string> = {
      postal_code: postalCode,
      address,
      updated_at: new Date().toISOString(),
    };
    if (shippingName) {
      updateData.shipping_name = shippingName;
    }

    const { error: updateError } = await withTenant(
      supabaseAdmin
        .from("orders")
        .update(updateData)
        .eq("id", orderId),
      tenantId
    );

    if (updateError) {
      console.error("[admin/update-order-address] DB update error:", updateError);
      return NextResponse.json({ ok: false, error: "更新に失敗しました" }, { status: 500 });
    }

    // キャッシュ無効化
    if (order.patient_id) {
      await invalidateDashboardCache(order.patient_id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/update-order-address error", e);
    return NextResponse.json({ ok: false, error: "サーバーエラー" }, { status: 500 });
  }
}

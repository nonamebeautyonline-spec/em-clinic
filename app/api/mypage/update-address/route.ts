// app/api/mypage/update-address/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateAddressSchema } from "@/lib/validations/patient";

export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);
    const cookieStore = await cookies();
    const patientId =
      cookieStore.get("__Host-patient_id")?.value ||
      cookieStore.get("patient_id")?.value ||
      "";

    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const parsed = await parseBody(req, updateAddressSchema);
    if ("error" in parsed) return parsed.error;
    const orderId = parsed.data.orderId.trim();
    const rawPostal = parsed.data.postalCode.trim();
    const address = parsed.data.address.trim();
    const shippingName = (parsed.data.shippingName ?? "").trim();

    // 郵便番号の正規化（7桁チェック）
    const postalDigits = rawPostal.replace(/[^0-9]/g, "");
    if (postalDigits.length !== 7) {
      return NextResponse.json(
        { ok: false, error: "郵便番号は7桁で入力してください" },
        { status: 400 }
      );
    }
    const postalCode = `${postalDigits.slice(0, 3)}-${postalDigits.slice(3)}`;

    // 注文を取得して権限チェック
    const { data: order, error: fetchError } = await withTenant(supabaseAdmin
      .from("orders")
      .select("id, patient_id, shipping_status, tracking_number, shipping_list_created_at")
      .eq("id", orderId), tenantId)
      .maybeSingle();

    if (fetchError || !order) {
      return NextResponse.json(
        { ok: false, error: "注文が見つかりません" },
        { status: 404 }
      );
    }

    if (order.patient_id !== patientId) {
      return NextResponse.json(
        { ok: false, error: "この注文を変更する権限がありません" },
        { status: 403 }
      );
    }

    // 発送済みチェック
    if (order.shipping_status === "shipped" || order.tracking_number) {
      return NextResponse.json(
        {
          ok: false,
          error: "already_shipped",
          message: "発送済みのため変更できません。ヤマト運輸の追跡番号からお手続きください。",
        },
        { status: 400 }
      );
    }

    // 発送リスト作成済みチェック
    if (order.shipping_list_created_at) {
      return NextResponse.json(
        {
          ok: false,
          error: "shipping_list_created",
          message: "発送準備に入ったため、届け先の変更はLINEからお問い合わせください。",
        },
        { status: 400 }
      );
    }

    // 更新
    const updateData: Record<string, string> = {
      postal_code: postalCode,
      address,
      updated_at: new Date().toISOString(),
    };
    if (shippingName) {
      updateData.shipping_name = shippingName;
    }
    const { error: updateError } = await withTenant(supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", orderId), tenantId);

    if (updateError) {
      console.error("[update-address] DB update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "更新に失敗しました" },
        { status: 500 }
      );
    }

    // キャッシュ無効化
    await invalidateDashboardCache(patientId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/mypage/update-address error", e);
    return NextResponse.json(
      { ok: false, error: "サーバーエラー" },
      { status: 500 }
    );
  }
}

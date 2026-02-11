// app/api/mypage/update-address/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json().catch(() => ({} as any));
    const orderId = (body.orderId ?? "").trim();
    const rawPostal = (body.postalCode ?? "").trim();
    const address = (body.address ?? "").trim();

    // バリデーション
    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId は必須です" },
        { status: 400 }
      );
    }

    const postalDigits = rawPostal.replace(/[^0-9]/g, "");
    if (postalDigits.length !== 7) {
      return NextResponse.json(
        { ok: false, error: "郵便番号は7桁で入力してください" },
        { status: 400 }
      );
    }
    const postalCode = `${postalDigits.slice(0, 3)}-${postalDigits.slice(3)}`;

    if (!address) {
      return NextResponse.json(
        { ok: false, error: "住所を入力してください" },
        { status: 400 }
      );
    }
    if (address.length > 200) {
      return NextResponse.json(
        { ok: false, error: "住所は200文字以内で入力してください" },
        { status: 400 }
      );
    }

    // 注文を取得して権限チェック
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, patient_id, shipping_status, tracking_number")
      .eq("id", orderId)
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

    // 13時カットオフ（JST）
    const now = new Date();
    const jstHour = (now.getUTCHours() + 9) % 24;
    if (jstHour >= 13) {
      return NextResponse.json(
        {
          ok: false,
          error: "past_cutoff",
          message: "13時を過ぎたため、届け先の変更はLINEからお問い合わせください。",
        },
        { status: 400 }
      );
    }

    // 更新
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        postal_code: postalCode,
        address,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

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

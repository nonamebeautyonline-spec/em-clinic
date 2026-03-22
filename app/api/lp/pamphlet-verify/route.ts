// パンフレット閲覧コード検証API（公開エンドポイント — 認証不要）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { code, slug } = (await req.json()) as { code?: string; slug?: string };

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json({ ok: false, message: "コードを入力してください" }, { status: 400 });
    }

    // テナント解決（slug から）— slug が無ければデフォルトテナント
    let tenantId = "00000000-0000-0000-0000-000000000001";
    if (slug) {
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("slug", slug)
        .single();
      if (tenant) tenantId = tenant.id;
    }

    const { data, error } = await supabaseAdmin
      .from("pamphlet_codes")
      .select("id, expires_at, is_active")
      .eq("tenant_id", tenantId)
      .eq("code", code.trim())
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, message: "無効なコードです" }, { status: 401 });
    }

    if (!data.is_active) {
      return NextResponse.json({ ok: false, message: "このコードは無効化されています" }, { status: 401 });
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, message: "このコードは有効期限切れです" }, { status: 401 });
    }

    // 閲覧カウント・最終使用日時を更新
    await supabaseAdmin
      .from("pamphlet_codes")
      .update({ used_count: (data as any).used_count + 1 || 1, last_used_at: new Date().toISOString() })
      .eq("id", data.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

// カルテメモ編集API（カルテ検索画面から直接編集）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// カルテメモ更新
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "リクエストボディが不正です" },
        { status: 400 }
      );
    }

    const { intakeId, note } = body;
    if (!intakeId) {
      return NextResponse.json(
        { error: "intakeId は必須です" },
        { status: 400 }
      );
    }

    // ロック確認
    const { data: intake } = await supabaseAdmin
      .from("intake")
      .select("id, locked_at")
      .eq("id", intakeId)
      .single();

    if (!intake) {
      return NextResponse.json(
        { error: "カルテが見つかりません" },
        { status: 404 }
      );
    }

    if (intake.locked_at) {
      return NextResponse.json(
        { error: "このカルテはロックされています。管理者にロック解除を依頼してください。" },
        { status: 403 }
      );
    }

    // 更新
    const { error: updateErr } = await supabaseAdmin
      .from("intake")
      .update({
        note: note || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId);

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

const LINE_API = "https://api.line.me/v2/bot/richmenu/bulk/link";

function getToken() {
  return process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
}

// 複数患者にリッチメニューを一括割り当て
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { patient_ids, rich_menu_id } = await req.json();

    if (!Array.isArray(patient_ids) || patient_ids.length === 0 || !rich_menu_id) {
      return NextResponse.json({ error: "patient_ids と rich_menu_id は必須です" }, { status: 400 });
    }

    // リッチメニューのLINE側IDを取得
    const { data: menu } = await supabaseAdmin
      .from("rich_menus")
      .select("id, name, line_rich_menu_id")
      .eq("id", rich_menu_id)
      .single();

    if (!menu) {
      return NextResponse.json({ error: "リッチメニューが見つかりません" }, { status: 404 });
    }

    if (!menu.line_rich_menu_id) {
      return NextResponse.json({ error: "このリッチメニューはLINEに登録されていません。先にリッチメニュー設定からLINEに登録してください。" }, { status: 400 });
    }

    // 患者のLINE UIDを取得（大量IDに対応するためバッチ処理）
    const lineUserIds: string[] = [];
    const BATCH_SIZE = 200;
    for (let i = 0; i < patient_ids.length; i += BATCH_SIZE) {
      const batch = patient_ids.slice(i, i + BATCH_SIZE);
      const { data: intakes } = await supabaseAdmin
        .from("intake")
        .select("patient_id, line_id")
        .in("patient_id", batch)
        .not("line_id", "is", null);

      if (intakes) {
        for (const r of intakes) {
          if (r.line_id) lineUserIds.push(r.line_id);
        }
      }
    }

    if (lineUserIds.length === 0) {
      return NextResponse.json({ error: "LINE連携済みのユーザーがいません", linked: 0, no_uid: patient_ids.length }, { status: 400 });
    }

    const token = getToken();
    let linked = 0;
    let failed = 0;

    // LINE API: 500人ずつ分割してbulk link
    for (let i = 0; i < lineUserIds.length; i += 500) {
      const batch = lineUserIds.slice(i, i + 500);
      const res = await fetch(LINE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          richMenuId: menu.line_rich_menu_id,
          userIds: batch,
        }),
      });

      if (res.ok) {
        linked += batch.length;
      } else {
        const text = await res.text().catch(() => "");
        console.error(`[Rich Menu Bulk Link] Error ${res.status}:`, text);
        failed += batch.length;
      }
    }

    const noUid = patient_ids.length - lineUserIds.length;
    return NextResponse.json({ ok: true, linked, failed, no_uid: noUid, total: patient_ids.length });
  } catch (e: any) {
    console.error("[Rich Menu Bulk Link] Unhandled error:", e?.message || e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

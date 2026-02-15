import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

const LINE_API = "https://api.line.me/v2/bot/richmenu/bulk/link";

// 複数患者にリッチメニューを一括割り当て
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = resolveTenantId(req);
    const { patient_ids, rich_menu_id } = await req.json();

    if (!Array.isArray(patient_ids) || patient_ids.length === 0 || !rich_menu_id) {
      return NextResponse.json({ error: "patient_ids と rich_menu_id は必須です" }, { status: 400 });
    }

    // リッチメニューのLINE側IDを取得
    const { data: menu } = await withTenant(
      supabaseAdmin
        .from("rich_menus")
        .select("id, name, line_rich_menu_id")
        .eq("id", rich_menu_id)
        .single(),
      tenantId
    );

    if (!menu) {
      return NextResponse.json({ error: "リッチメニューが見つかりません" }, { status: 404 });
    }

    if (!menu.line_rich_menu_id) {
      return NextResponse.json({ error: "このリッチメニューはLINEに登録されていません。先にリッチメニュー設定からLINEに登録してください。" }, { status: 400 });
    }

    // 患者のLINE UIDをpatientsテーブルから取得（大量IDに対応するためバッチ処理）
    const lineUserIds: string[] = [];
    const BATCH_SIZE = 200;
    for (let i = 0; i < patient_ids.length; i += BATCH_SIZE) {
      const batch = patient_ids.slice(i, i + BATCH_SIZE);
      const { data: pData } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, line_id")
          .in("patient_id", batch)
          .not("line_id", "is", null),
        tenantId
      );

      if (pData) {
        for (const r of pData) {
          if (r.line_id) lineUserIds.push(r.line_id);
        }
      }
    }

    if (lineUserIds.length === 0) {
      return NextResponse.json({ error: "LINE連携済みのユーザーがいません", linked: 0, no_uid: patient_ids.length }, { status: 400 });
    }

    const token = await getSettingOrEnv("line", "channel_access_token", "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";
    let linked = 0;
    let failed = 0;

    // LINE API: 500人ずつ分割してbulk link → 失敗時は個別APIにフォールバック
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
        console.error(`[Rich Menu Bulk Link] Batch error ${res.status}:`, text, "-> falling back to individual calls");

        // 個別APIで1件ずつ割り当て
        for (const uid of batch) {
          try {
            const r = await fetch(
              `https://api.line.me/v2/bot/user/${uid}/richmenu/${menu.line_rich_menu_id}`,
              { method: "POST", headers: { Authorization: `Bearer ${token}` } }
            );
            if (r.ok) linked++;
            else failed++;
          } catch {
            failed++;
          }
        }
      }
    }

    const noUid = patient_ids.length - lineUserIds.length;
    return NextResponse.json({ ok: linked > 0, linked, failed, no_uid: noUid, total: patient_ids.length });
  } catch (e: any) {
    console.error("[Rich Menu Bulk Link] Unhandled error:", e?.message || e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

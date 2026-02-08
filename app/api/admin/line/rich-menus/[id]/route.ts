import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { createLineRichMenu, uploadRichMenuImage, deleteLineRichMenu, setDefaultRichMenu, bulkLinkRichMenu } from "@/lib/line-richmenu";

/**
 * メニュー名に基づいて、個別リンク対象のLINE user IDを取得
 * - "処方後"         → ordersがある患者
 * - "個人情報入力後"  → intakeにいてordersがない患者
 * - "個人情報入力前"  → デフォルトメニューなので個別リンク不要
 */
async function getTargetLineUserIds(menuName: string, _menuId: number): Promise<string[]> {
  const PAGE = 1000;

  if (menuName === "処方後") {
    // ordersにある患者のline_idを取得
    const lineIds: string[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabaseAdmin
        .from("orders")
        .select("patient_id")
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;

      const patientIds = Array.from(new Set(data.map(d => d.patient_id)));
      const { data: intakes } = await supabaseAdmin
        .from("intake")
        .select("line_id")
        .in("patient_id", patientIds)
        .not("line_id", "is", null);

      if (intakes) lineIds.push(...intakes.map(i => i.line_id).filter(Boolean));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return Array.from(new Set(lineIds));
  }

  if (menuName === "個人情報入力後") {
    // intakeにいてordersがない患者
    const lineIds: string[] = [];
    let from = 0;
    while (true) {
      const { data: intakes } = await supabaseAdmin
        .from("intake")
        .select("patient_id, line_id")
        .not("line_id", "is", null)
        .range(from, from + PAGE - 1);
      if (!intakes || intakes.length === 0) break;

      const patientIds = intakes.map(i => i.patient_id);
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("patient_id")
        .in("patient_id", patientIds);

      const orderPatientIds = new Set(orders?.map(o => o.patient_id) || []);
      for (const i of intakes) {
        if (i.line_id && !orderPatientIds.has(i.patient_id)) {
          lineIds.push(i.line_id);
        }
      }

      if (intakes.length < PAGE) break;
      from += PAGE;
    }
    return Array.from(new Set(lineIds));
  }

  // "個人情報入力前"等 → デフォルトメニューで対応、個別リンク不要
  return [];
}

// リッチメニュー更新 + LINE API再登録
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // 1. 既存メニューを取得（LINE側IDチェック用）
    const { data: existing } = await supabaseAdmin
      .from("rich_menus")
      .select("line_rich_menu_id")
      .eq("id", Number(id))
      .single();

    const oldLineMenuId = existing?.line_rich_menu_id || null;

    // 2. DB更新（まずDBだけ更新してレスポンスを速く返す）
    const { data, error } = await supabaseAdmin
      .from("rich_menus")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", Number(id))
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 3. LINE API処理をレスポンス返却後にバックグラウンドで実行
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "";
    if (data.image_url) {
      after(async () => {
        try {
          const lineRichMenuId = await createLineRichMenu(data, origin);
          if (!lineRichMenuId) {
            console.error("[Rich Menu PUT after] LINE menu create failed");
            return;
          }

          const imageOk = await uploadRichMenuImage(lineRichMenuId, data.image_url);
          if (!imageOk) {
            await deleteLineRichMenu(lineRichMenuId).catch(() => {});
            console.error("[Rich Menu PUT after] Image upload failed, cleaned up");
            return;
          }

          // 新メニュー作成成功 → DB更新
          await supabaseAdmin
            .from("rich_menus")
            .update({ line_rich_menu_id: lineRichMenuId, is_active: true })
            .eq("id", data.id);

          // selected=true の場合のみデフォルトメニューに設定
          if (data.selected) {
            await setDefaultRichMenu(lineRichMenuId);
          }

          // 旧メニューのユーザーを新メニューに再リンク + 旧メニュー削除
          if (oldLineMenuId && oldLineMenuId !== lineRichMenuId) {
            // メニュー名に基づいて対象ユーザーを特定し再リンク
            const targetUserIds = await getTargetLineUserIds(data.name, data.id);
            if (targetUserIds.length > 0) {
              const result = await bulkLinkRichMenu(targetUserIds, lineRichMenuId);
              console.log(`[Rich Menu PUT after] Re-linked ${result.linked} users (failed: ${result.failed}) to new menu ${lineRichMenuId}`);
            }
            await deleteLineRichMenu(oldLineMenuId).catch(() => {});
          }

          console.log("[Rich Menu PUT after] LINE menu updated:", lineRichMenuId);
        } catch (e) {
          console.error("[Rich Menu PUT after] Error:", e);
        }
      });
    }

    return NextResponse.json({ menu: data });
  } catch (e: any) {
    console.error("[Rich Menu PUT] Unhandled error:", e?.message || e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

// リッチメニュー削除 + LINE API削除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // 1. LINE側のIDを取得
    const { data: existing } = await supabaseAdmin
      .from("rich_menus")
      .select("line_rich_menu_id")
      .eq("id", Number(id))
      .single();

    // 2. LINE側から削除
    if (existing?.line_rich_menu_id) {
      await deleteLineRichMenu(existing.line_rich_menu_id);
    }

    // 3. DB削除
    const { error } = await supabaseAdmin
      .from("rich_menus")
      .delete()
      .eq("id", Number(id));

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[Rich Menu DELETE] Unhandled error:", e?.message || e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

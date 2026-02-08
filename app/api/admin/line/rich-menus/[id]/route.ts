import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { createLineRichMenu, uploadRichMenuImage, deleteLineRichMenu, setDefaultRichMenu, bulkLinkRichMenu } from "@/lib/line-richmenu";

/**
 * メニュー名に基づいて、個別リンク対象のLINE user IDを取得
 * - "処方後"         → ordersがある患者
 * - "個人情報入力後"  → intakeにいてordersがない患者
 * - "個人情報入力前"  → デフォルトメニューなので個別リンク不要
 */
async function getTargetLineUserIds(menuName: string): Promise<string[]> {
  const PAGE = 1000;

  if (menuName === "処方後") {
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

  return [];
}

// Vercel Function の最大実行時間を延長（Pro: 最大300秒）
export const maxDuration = 120;

// リッチメニュー更新 + LINE API再登録（同期実行）
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const tag = `[RichMenu:${id}]`;

    // 1. 既存メニューを取得
    const { data: existing } = await supabaseAdmin
      .from("rich_menus")
      .select("line_rich_menu_id")
      .eq("id", Number(id))
      .single();

    const oldLineMenuId = existing?.line_rich_menu_id || null;

    // 2. DB更新
    const { data, error } = await supabaseAdmin
      .from("rich_menus")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", Number(id))
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 3. LINE API同期（画像がある場合のみ）
    if (!data.image_url) {
      return NextResponse.json({ menu: data });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "";
    const syncLog: string[] = [];

    // Step 1: LINE APIに新メニュー作成
    console.log(`${tag} Step1: Creating LINE menu`);
    const lineRichMenuId = await createLineRichMenu(data, origin);
    if (!lineRichMenuId) {
      console.error(`${tag} Step1 FAILED`);
      syncLog.push("LINE menu create failed");
      return NextResponse.json({ menu: data, sync_error: syncLog.join("; ") }, { status: 200 });
    }
    console.log(`${tag} Step1 OK: ${lineRichMenuId}`);
    syncLog.push(`created: ${lineRichMenuId}`);

    // Step 2: 画像アップロード（3回リトライ）
    console.log(`${tag} Step2: Uploading image`);
    const imageOk = await uploadRichMenuImage(lineRichMenuId, data.image_url);
    if (!imageOk) {
      await deleteLineRichMenu(lineRichMenuId).catch(() => {});
      console.error(`${tag} Step2 FAILED`);
      syncLog.push("image upload failed");
      return NextResponse.json({ menu: data, sync_error: syncLog.join("; ") }, { status: 200 });
    }
    console.log(`${tag} Step2 OK`);

    // Step 3: DB更新（line_rich_menu_id）
    console.log(`${tag} Step3: Updating DB`);
    const { error: dbErr } = await supabaseAdmin
      .from("rich_menus")
      .update({ line_rich_menu_id: lineRichMenuId, is_active: true })
      .eq("id", data.id);
    if (dbErr) {
      console.error(`${tag} Step3 FAILED: ${dbErr.message}`);
    } else {
      console.log(`${tag} Step3 OK`);
      data.line_rich_menu_id = lineRichMenuId;
    }

    // Step 4: デフォルトメニュー設定
    if (data.selected) {
      console.log(`${tag} Step4: Setting as default`);
      const ok = await setDefaultRichMenu(lineRichMenuId);
      console.log(`${tag} Step4 ${ok ? "OK" : "FAILED"}`);
    }

    // Step 5: ユーザー再リンク + 旧メニュー削除
    if (oldLineMenuId && oldLineMenuId !== lineRichMenuId) {
      console.log(`${tag} Step5: Re-linking users`);
      const targetUserIds = await getTargetLineUserIds(data.name);
      console.log(`${tag} Step5: ${targetUserIds.length} target users`);
      if (targetUserIds.length > 0) {
        const result = await bulkLinkRichMenu(targetUserIds, lineRichMenuId);
        console.log(`${tag} Step5: Re-linked ${result.linked} (failed: ${result.failed})`);
        syncLog.push(`relinked: ${result.linked}`);
      }
      console.log(`${tag} Step5: Deleting old ${oldLineMenuId}`);
      await deleteLineRichMenu(oldLineMenuId).catch(() => {});
    }

    console.log(`${tag} DONE`);
    return NextResponse.json({ menu: data, sync_ok: true, sync_log: syncLog });
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

    const { data: existing } = await supabaseAdmin
      .from("rich_menus")
      .select("line_rich_menu_id")
      .eq("id", Number(id))
      .single();

    if (existing?.line_rich_menu_id) {
      await deleteLineRichMenu(existing.line_rich_menu_id);
    }

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

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// Supabaseは1リクエスト最大1000行のため、全件取得にはページネーションが必要
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll(buildQuery: () => any, pageSize = 1000) {
  const all: any[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return { data: all, error: null };
}

// 友達一覧（タグ・マーク・友達情報を統合して返す）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 並列でデータ取得（1000行超に対応）
  const [intakeRes, tagsRes, marksRes, fieldDefsRes, fieldValsRes] = await Promise.all([
    fetchAll(
      () => supabaseAdmin.from("intake").select("patient_id, patient_name, line_id, line_display_name, line_picture_url").not("patient_id", "is", null).order("created_at", { ascending: false }),
    ),
    fetchAll(
      () => supabaseAdmin.from("patient_tags").select("patient_id, tag_id, tag_definitions(id, name, color)"),
    ),
    fetchAll(
      () => supabaseAdmin.from("patient_marks").select("*"),
    ),
    supabaseAdmin
      .from("friend_field_definitions")
      .select("*")
      .order("sort_order", { ascending: true }),
    fetchAll(
      () => supabaseAdmin.from("friend_field_values").select("patient_id, field_id, value, friend_field_definitions(name)"),
    ),
  ]);

  if (intakeRes.error) {
    return NextResponse.json({ error: intakeRes.error.message }, { status: 500 });
  }

  // patient_idでユニーク化（最新レコード優先）
  const patientMap = new Map<string, { patient_id: string; patient_name: string; line_id: string | null; line_display_name: string | null; line_picture_url: string | null }>();
  for (const row of intakeRes.data || []) {
    if (!patientMap.has(row.patient_id)) {
      patientMap.set(row.patient_id, row);
    }
  }

  // タグをマッピング
  const tagMap = new Map<string, { id: number; name: string; color: string }[]>();
  for (const row of tagsRes.data || []) {
    const td = row.tag_definitions as any;
    if (!td) continue;
    if (!tagMap.has(row.patient_id)) tagMap.set(row.patient_id, []);
    tagMap.get(row.patient_id)!.push({ id: td.id, name: td.name, color: td.color });
  }

  // マークをマッピング
  const markMap = new Map<string, string>();
  for (const row of marksRes.data || []) {
    markMap.set(row.patient_id, row.mark);
  }

  // フィールド値をマッピング
  const fieldValMap = new Map<string, Record<string, string>>();
  for (const row of fieldValsRes.data || []) {
    const fd = row.friend_field_definitions as any;
    if (!fd) continue;
    if (!fieldValMap.has(row.patient_id)) fieldValMap.set(row.patient_id, {});
    fieldValMap.get(row.patient_id)![fd.name] = row.value || "";
  }

  // 最新メッセージを取得（各患者の直近1件）
  // last_sent_atは顧客からのメッセージ・アクションの最新時刻（ソート用）
  // last_messageは表示用テキスト（eventタイプを除く）
  const { data: lastMessages } = await fetchAll(
    () => supabaseAdmin.from("message_log").select("patient_id, content, sent_at, message_type, event_type, direction").order("sent_at", { ascending: false }),
  );

  const lastMsgMap = new Map<string, { content: string; sent_at: string }>();
  const lastIncomingMap = new Map<string, string>();
  for (const row of lastMessages || []) {
    if (!row.patient_id) continue;
    // ソート用: 顧客からのメッセージ・アクション（incoming）の最新時刻のみ
    // 管理側からの送信（outgoing）は表示順に影響させない
    if (!lastIncomingMap.has(row.patient_id) && row.direction !== "outgoing") {
      lastIncomingMap.set(row.patient_id, row.sent_at);
    }
    // 表示用: イベント以外の最新メッセージ
    if (!lastMsgMap.has(row.patient_id) && row.message_type !== "event" && row.event_type !== "system") {
      lastMsgMap.set(row.patient_id, { content: row.content, sent_at: row.sent_at });
    }
  }

  // ===== 自動タグ＋リッチメニュー付与 =====
  const LINE_ACCESS_TOKEN =
    process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN ||
    process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";

  // orders/answerers データを並列取得
  const [orderPatientsRes, answerersRes] = await Promise.all([
    fetchAll(() => supabaseAdmin.from("orders").select("patient_id").not("patient_id", "is", null)),
    fetchAll(() => supabaseAdmin.from("answerers").select("patient_id, name, tel").not("name", "is", null)),
  ]);

  const orderPatientIds = new Set(
    (orderPatientsRes.data || []).map((o: any) => o.patient_id as string)
  );
  const answererPatientIds = new Set(
    (answerersRes.data || [])
      .filter((a: any) => a.name?.trim())
      .map((a: any) => a.patient_id as string)
  );
  // verify完了済み（tel登録済み）患者のSet
  const verifiedPatientIds = new Set(
    (answerersRes.data || [])
      .filter((a: any) => a.name?.trim() && a.tel)
      .map((a: any) => a.patient_id as string)
  );

  // タグ定義を並列取得
  const [prescTagRes, infoTagRes] = await Promise.all([
    supabaseAdmin.from("tag_definitions").select("id, name, color").eq("name", "処方ずみ").maybeSingle(),
    supabaseAdmin.from("tag_definitions").select("id, name, color").eq("name", "個人情報提出ずみ").maybeSingle(),
  ]);
  const prescTagDef = prescTagRes.data;
  const infoTagDef = infoTagRes.data;

  // 既存タグをSetに変換
  const existingPrescSet = new Set<string>();
  const existingInfoSet = new Set<string>();
  for (const row of tagsRes.data || []) {
    const td = row.tag_definitions as any;
    if (prescTagDef && td?.id === prescTagDef.id) existingPrescSet.add(row.patient_id);
    if (infoTagDef && td?.id === infoTagDef.id) existingInfoSet.add(row.patient_id);
  }

  // --- 処方ずみタグ付与 ---
  if (prescTagDef) {
    const needsPresc = [...orderPatientIds].filter(pid => !pid.startsWith("LINE_") && !existingPrescSet.has(pid));
    if (needsPresc.length > 0) {
      const rows = needsPresc.map(pid => ({ patient_id: pid, tag_id: prescTagDef.id, assigned_by: "auto_order" }));
      await supabaseAdmin.from("patient_tags").upsert(rows, { onConflict: "patient_id,tag_id" });
      console.log(`[friends-list] auto-assigned 処方ずみ tag to ${needsPresc.length} patients`);
      for (const pid of needsPresc) {
        if (!tagMap.has(pid)) tagMap.set(pid, []);
        tagMap.get(pid)!.push({ id: prescTagDef.id, name: prescTagDef.name, color: prescTagDef.color });
      }
    }
  }

  // --- 個人情報提出ずみタグ付与（ordersなし & answerers.nameあり）---
  if (infoTagDef) {
    const needsInfo = [...answererPatientIds].filter(pid =>
      !pid.startsWith("LINE_") && !orderPatientIds.has(pid) && !existingInfoSet.has(pid)
    );
    if (needsInfo.length > 0) {
      const rows = needsInfo.map(pid => ({ patient_id: pid, tag_id: infoTagDef.id, assigned_by: "auto" }));
      await supabaseAdmin.from("patient_tags").upsert(rows, { onConflict: "patient_id,tag_id" });
      console.log(`[friends-list] auto-assigned 個人情報提出ずみ tag to ${needsInfo.length} patients`);
      for (const pid of needsInfo) {
        if (!tagMap.has(pid)) tagMap.set(pid, []);
        tagMap.get(pid)!.push({ id: infoTagDef.id, name: infoTagDef.name, color: infoTagDef.color });
      }
    }
  }

  // --- リッチメニュー切り替え ---
  if (LINE_ACCESS_TOKEN) {
    const [prescMenuRes, infoMenuRes] = await Promise.all([
      supabaseAdmin.from("rich_menus").select("line_rich_menu_id").eq("name", "処方後").maybeSingle(),
      supabaseAdmin.from("rich_menus").select("line_rich_menu_id").eq("name", "個人情報入力後").maybeSingle(),
    ]);
    const prescMenu = prescMenuRes.data?.line_rich_menu_id;
    const infoMenu = infoMenuRes.data?.line_rich_menu_id;

    if (prescMenu || infoMenu) {
      // リッチメニュー対象: orders有 or verify完了済み(tel登録済み)の患者
      const allTargets = [...patientMap.values()].filter(p =>
        p.line_id && !p.patient_id.startsWith("LINE_") && (orderPatientIds.has(p.patient_id) || verifiedPatientIds.has(p.patient_id))
      );

      // 5件ずつ並列処理（LINE APIレート制限対策）
      for (let i = 0; i < allTargets.length; i += 5) {
        const batch = allTargets.slice(i, i + 5);
        await Promise.all(batch.map(async (p) => {
          const targetMenu = orderPatientIds.has(p.patient_id) ? prescMenu : infoMenu;
          if (!targetMenu || !p.line_id) return;
          try {
            const currentRes = await fetch(`https://api.line.me/v2/bot/user/${p.line_id}/richmenu`, {
              headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
            });
            const current = currentRes.ok ? await currentRes.json() : null;
            if (current?.richMenuId !== targetMenu) {
              await fetch(`https://api.line.me/v2/bot/user/${p.line_id}/richmenu/${targetMenu}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
              });
              const menuName = targetMenu === prescMenu ? "処方後" : "個人情報入力後";
              console.log(`[friends-list] auto-assigned ${menuName} rich menu to ${p.patient_id}`);
            }
          } catch (err) {
            console.error(`[friends-list] rich menu error for ${p.patient_id}:`, err);
          }
        }));
      }
    }
  }

  // 統合
  const patients = Array.from(patientMap.values()).map(p => {
    const lastMsg = lastMsgMap.get(p.patient_id);
    const lastIncoming = lastIncomingMap.get(p.patient_id);
    return {
      patient_id: p.patient_id,
      patient_name: p.patient_name || "",
      line_id: p.line_id,
      line_display_name: p.line_display_name || null,
      line_picture_url: p.line_picture_url || null,
      mark: markMap.get(p.patient_id) || "none",
      tags: tagMap.get(p.patient_id) || [],
      fields: fieldValMap.get(p.patient_id) || {},
      last_message: lastMsg?.content || null,
      last_sent_at: lastIncoming || null,
    };
  });

  return NextResponse.json({ patients });
}

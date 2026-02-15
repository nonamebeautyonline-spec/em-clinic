// app/api/admin/line/broadcast/ab-test/route.ts — A/Bテスト配信
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTargets } from "../route";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// A/Bテスト配信実行
export async function POST(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { name, filter_rules, message_a, message_b, split_ratio } = await req.json();
  if (!message_a?.trim() || !message_b?.trim()) {
    return NextResponse.json({ error: "メッセージA・Bの両方が必要です" }, { status: 400 });
  }

  const ratio = Math.min(Math.max(split_ratio || 50, 10), 90); // 10〜90%

  // 対象者取得（テナントIDを渡してフィルタリング）
  const allTargets = await resolveTargets(filter_rules || {}, tenantId);
  const sendable = allTargets.filter(t => t.line_id);

  if (sendable.length === 0) {
    return NextResponse.json({ error: "配信対象者がいません" }, { status: 400 });
  }

  // ランダムシャッフル
  for (let i = sendable.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sendable[i], sendable[j]] = [sendable[j], sendable[i]];
  }

  const splitIdx = Math.round(sendable.length * ratio / 100);
  const groupA = sendable.slice(0, splitIdx);
  const groupB = sendable.slice(splitIdx);

  const testName = name || `A/Bテスト ${new Date().toLocaleDateString("ja-JP")}`;

  // 配信レコード作成（A/Bそれぞれ）
  const [{ data: broadcastA }, { data: broadcastB }] = await Promise.all([
    supabaseAdmin.from("broadcasts").insert({
      ...tenantPayload(tenantId),
      name: `${testName} [A]`,
      filter_rules: filter_rules || {},
      message_content: message_a,
      status: "sending",
      total_targets: groupA.length,
      created_by: "admin",
    }).select().single(),
    supabaseAdmin.from("broadcasts").insert({
      ...tenantPayload(tenantId),
      name: `${testName} [B]`,
      filter_rules: filter_rules || {},
      message_content: message_b,
      status: "sending",
      total_targets: groupB.length,
      created_by: "admin",
    }).select().single(),
  ]);

  if (!broadcastA || !broadcastB) {
    return NextResponse.json({ error: "配信レコード作成失敗" }, { status: 500 });
  }

  // 次回予約情報の取得
  const allIds = sendable.map(t => t.patient_id);
  const nextReservationMap = new Map<string, { date: string; time: string }>();
  if (allIds.length > 0) {
    const { data: reservations } = await withTenant(
      supabaseAdmin
        .from("reservations")
        .select("patient_id, reserved_date, reserved_time")
        .in("patient_id", allIds)
        .neq("status", "canceled")
        .gte("reserved_date", new Date().toISOString().split("T")[0])
        .order("reserved_date", { ascending: true }),
      tenantId
    );
    for (const r of reservations || []) {
      if (!nextReservationMap.has(r.patient_id)) {
        nextReservationMap.set(r.patient_id, { date: r.reserved_date, time: r.reserved_time?.substring(0, 5) || "" });
      }
    }
  }

  const todayStr = new Date().toLocaleDateString("ja-JP");

  const resolveMsg = (msg: string, target: typeof sendable[0]) => {
    const nextRes = nextReservationMap.get(target.patient_id);
    return msg
      .replace(/\{name\}/g, target.patient_name || "")
      .replace(/\{patient_id\}/g, target.patient_id)
      .replace(/\{send_date\}/g, todayStr)
      .replace(/\{next_reservation_date\}/g, nextRes?.date || "")
      .replace(/\{next_reservation_time\}/g, nextRes?.time || "");
  };

  // 送信関数
  const sendToGroup = async (
    group: typeof sendable,
    message: string,
    broadcastId: number,
  ) => {
    let sent = 0, failed = 0;
    for (const target of group) {
      const resolved = resolveMsg(message, target);
      try {
        const res = await pushMessage(target.line_id!, [{ type: "text", text: resolved }], tenantId ?? undefined);
        const status = res?.ok ? "sent" : "failed";
        if (status === "sent") sent++; else failed++;
        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(tenantId),
          patient_id: target.patient_id,
          line_uid: target.line_id,
          message_type: "broadcast",
          content: resolved,
          status,
          campaign_id: broadcastId,
          direction: "outgoing",
        });
      } catch {
        failed++;
        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(tenantId),
          patient_id: target.patient_id,
          line_uid: target.line_id,
          message_type: "broadcast",
          content: resolved,
          status: "failed",
          campaign_id: broadcastId,
          direction: "outgoing",
        });
      }
    }
    return { sent, failed };
  };

  // 並列送信
  const [resultA, resultB] = await Promise.all([
    sendToGroup(groupA, message_a, broadcastA.id),
    sendToGroup(groupB, message_b, broadcastB.id),
  ]);

  // レコード更新
  const now = new Date().toISOString();
  await Promise.all([
    withTenant(
      supabaseAdmin.from("broadcasts").update({
        status: "sent", sent_at: now,
        sent_count: resultA.sent, failed_count: resultA.failed, no_uid_count: 0,
      }).eq("id", broadcastA.id),
      tenantId
    ),
    withTenant(
      supabaseAdmin.from("broadcasts").update({
        status: "sent", sent_at: now,
        sent_count: resultB.sent, failed_count: resultB.failed, no_uid_count: 0,
      }).eq("id", broadcastB.id),
      tenantId
    ),
  ]);

  return NextResponse.json({
    ok: true,
    test_name: testName,
    total: sendable.length,
    no_uid: allTargets.length - sendable.length,
    variant_a: { broadcast_id: broadcastA.id, targets: groupA.length, sent: resultA.sent, failed: resultA.failed },
    variant_b: { broadcast_id: broadcastB.id, targets: groupB.length, sent: resultB.sent, failed: resultB.failed },
  });
}

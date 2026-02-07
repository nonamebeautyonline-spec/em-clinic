import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";

interface FilterCondition {
  type: string;
  tag_id?: number;
  match?: string;
  values?: string[];
  field_id?: number;
  operator?: string;
  value?: string;
}

interface FilterRules {
  include?: { operator?: string; conditions: FilterCondition[] };
  exclude?: { conditions: FilterCondition[] };
}

// 配信履歴一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("broadcasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ broadcasts: data });
}

// 一斉配信実行
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, filter_rules, message, scheduled_at } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "メッセージは必須です" }, { status: 400 });
  }

  // 対象患者を取得
  const targets = await resolveTargets(filter_rules || {});

  // 配信レコード作成
  const { data: broadcast, error: insertError } = await supabaseAdmin
    .from("broadcasts")
    .insert({
      name: name || `配信 ${new Date().toLocaleDateString("ja-JP")}`,
      filter_rules: filter_rules || {},
      message_content: message,
      status: scheduled_at ? "scheduled" : "sending",
      scheduled_at,
      total_targets: targets.length,
      created_by: "admin",
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // 予約送信の場合はここで終了
  if (scheduled_at) {
    return NextResponse.json({ ok: true, broadcast_id: broadcast.id, total: targets.length, status: "scheduled" });
  }

  // 予約日時の差し込み用: 全対象患者の次回予約を一括取得
  const targetPatientIds = targets.map(t => t.patient_id);
  const nextReservationMap = new Map<string, { date: string; time: string }>();
  if (targetPatientIds.length > 0) {
    const { data: reservations } = await supabaseAdmin
      .from("reservations")
      .select("patient_id, reserved_date, reserved_time")
      .in("patient_id", targetPatientIds)
      .neq("status", "canceled")
      .gte("reserved_date", new Date().toISOString().split("T")[0])
      .order("reserved_date", { ascending: true })
      .order("reserved_time", { ascending: true });

    for (const r of reservations || []) {
      if (!nextReservationMap.has(r.patient_id)) {
        nextReservationMap.set(r.patient_id, {
          date: r.reserved_date,
          time: r.reserved_time?.substring(0, 5) || "",
        });
      }
    }
  }

  const todayStr = new Date().toLocaleDateString("ja-JP");

  // 即時送信
  let sentCount = 0;
  let failedCount = 0;
  let noUidCount = 0;

  for (const target of targets) {
    if (!target.line_id) {
      noUidCount++;
      await supabaseAdmin.from("message_log").insert({
        patient_id: target.patient_id,
        message_type: "broadcast",
        content: message,
        status: "no_uid",
        campaign_id: broadcast.id,
      });
      continue;
    }

    const nextRes = nextReservationMap.get(target.patient_id);
    const resolvedMsg = message
      .replace(/\{name\}/g, target.patient_name || "")
      .replace(/\{patient_id\}/g, target.patient_id)
      .replace(/\{send_date\}/g, todayStr)
      .replace(/\{next_reservation_date\}/g, nextRes?.date || "")
      .replace(/\{next_reservation_time\}/g, nextRes?.time || "");

    try {
      const res = await pushMessage(target.line_id, [{ type: "text", text: resolvedMsg }]);
      const status = res?.ok ? "sent" : "failed";
      if (status === "sent") sentCount++;
      else failedCount++;

      await supabaseAdmin.from("message_log").insert({
        patient_id: target.patient_id,
        line_uid: target.line_id,
        message_type: "broadcast",
        content: resolvedMsg,
        status,
        campaign_id: broadcast.id,
      });
    } catch {
      failedCount++;
      await supabaseAdmin.from("message_log").insert({
        patient_id: target.patient_id,
        line_uid: target.line_id,
        message_type: "broadcast",
        content: resolvedMsg,
        status: "failed",
        campaign_id: broadcast.id,
      });
    }
  }

  // 配信レコード更新
  await supabaseAdmin.from("broadcasts").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    sent_count: sentCount,
    failed_count: failedCount,
    no_uid_count: noUidCount,
  }).eq("id", broadcast.id);

  return NextResponse.json({
    ok: true,
    broadcast_id: broadcast.id,
    total: targets.length,
    sent: sentCount,
    failed: failedCount,
    no_uid: noUidCount,
  });
}

// フィルタルールに基づいて対象患者を解決
export async function resolveTargets(rules: FilterRules) {
  // intakeから全患者を取得（line_id付き、最新レコード優先）
  // Supabaseのデフォルトは1000行制限のため、明示的にlimitを指定
  const { data: allPatients } = await supabaseAdmin
    .from("intake")
    .select("patient_id, patient_name, line_id")
    .not("patient_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(100000);

  if (!allPatients) return [];

  // patient_idでユニーク化（最新レコード優先）
  const patientMap = new Map<string, { patient_id: string; patient_name: string; line_id: string | null }>();
  for (const p of allPatients) {
    if (!patientMap.has(p.patient_id)) {
      patientMap.set(p.patient_id, p);
    }
  }

  let targets = Array.from(patientMap.values());

  // 絞り込み条件
  if (rules.include?.conditions?.length) {
    for (const cond of rules.include.conditions) {
      targets = await applyCondition(targets, cond, true);
    }
  }

  // 除外条件
  if (rules.exclude?.conditions?.length) {
    for (const cond of rules.exclude.conditions) {
      targets = await applyCondition(targets, cond, false);
    }
  }

  return targets;
}

async function applyCondition(
  targets: { patient_id: string; patient_name: string; line_id: string | null }[],
  condition: FilterCondition,
  isInclude: boolean
) {
  switch (condition.type) {
    case "tag": {
      const { data: tagged } = await supabaseAdmin
        .from("patient_tags")
        .select("patient_id")
        .eq("tag_id", condition.tag_id!)
        .limit(100000);
      const taggedSet = new Set((tagged || []).map(t => t.patient_id));

      if (isInclude) {
        // has: タグを持つ患者のみ残す
        if (condition.match === "has") return targets.filter(t => taggedSet.has(t.patient_id));
        // not_has: タグを持たない患者のみ残す
        return targets.filter(t => !taggedSet.has(t.patient_id));
      } else {
        // 除外: タグを持つ患者を除外
        if (condition.match === "has") return targets.filter(t => !taggedSet.has(t.patient_id));
        return targets.filter(t => taggedSet.has(t.patient_id));
      }
    }

    case "mark": {
      const { data: marks } = await supabaseAdmin
        .from("patient_marks")
        .select("patient_id, mark")
        .in("mark", condition.values || [])
        .limit(100000);
      const markedSet = new Set((marks || []).map(m => m.patient_id));

      if (isInclude) return targets.filter(t => markedSet.has(t.patient_id));
      return targets.filter(t => !markedSet.has(t.patient_id));
    }

    case "field": {
      const { data: fieldVals } = await supabaseAdmin
        .from("friend_field_values")
        .select("patient_id, value")
        .eq("field_id", condition.field_id!)
        .limit(100000);

      const matchSet = new Set<string>();
      for (const fv of fieldVals || []) {
        if (matchFieldCondition(fv.value, condition.operator || "=", condition.value || "")) {
          matchSet.add(fv.patient_id);
        }
      }

      if (isInclude) return targets.filter(t => matchSet.has(t.patient_id));
      return targets.filter(t => !matchSet.has(t.patient_id));
    }

    case "has_line_uid": {
      if (isInclude) return targets.filter(t => !!t.line_id);
      return targets.filter(t => !t.line_id);
    }

    default:
      return targets;
  }
}

function matchFieldCondition(actual: string | null, operator: string, expected: string): boolean {
  if (actual === null) return false;
  const numActual = Number(actual);
  const numExpected = Number(expected);
  const isNumeric = !isNaN(numActual) && !isNaN(numExpected);

  switch (operator) {
    case "=": return actual === expected;
    case "!=": return actual !== expected;
    case ">": return isNumeric && numActual > numExpected;
    case ">=": return isNumeric && numActual >= numExpected;
    case "<": return isNumeric && numActual < numExpected;
    case "<=": return isNumeric && numActual <= numExpected;
    case "contains": return actual.includes(expected);
    default: return actual === expected;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import {
  getVisitCounts, getPurchaseAmounts, getLastVisitDates, getReorderCounts,
  matchBehaviorCondition
} from "@/lib/behavior-filters";
import { parseBody } from "@/lib/validations/helpers";
import { broadcastSchema } from "@/lib/validations/line-broadcast";
import { invalidateFriendsListCache } from "@/lib/redis";
import { logAudit } from "@/lib/audit";

// Supabaseは1リクエスト最大1000行のため、全件取得にはページネーションが必要
async function fetchAll(buildQuery: () => { range: (from: number, to: number) => PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }> }, pageSize = 5000) {
  const all: Record<string, unknown>[] = [];
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

interface FilterCondition {
  type: string;
  tag_id?: number;
  match?: string;
  values?: string[];
  field_id?: number;
  operator?: string;
  value?: string;
  // 行動データフィルタ用
  value_end?: string;
  date_range?: string;
}

interface FilterRules {
  include?: { operator?: string; conditions: FilterCondition[] };
  exclude?: { conditions: FilterCondition[] };
}

// 配信履歴一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("broadcasts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ broadcasts: data });
}

// 一斉配信実行
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, broadcastSchema);
  if ("error" in parsed) return parsed.error;
  const { name, filter_rules, message, scheduled_at } = parsed.data;

  // 対象患者を取得（テナントIDを渡してフィルタリング）
  const targets = await resolveTargets(filter_rules || {}, tenantId);

  // 配信レコード作成
  const { data: broadcast, error: insertError } = await supabaseAdmin
    .from("broadcasts")
    .insert({
      ...tenantPayload(tenantId),
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

  if (insertError) return serverError(insertError.message);

  // 予約送信の場合はここで終了
  if (scheduled_at) {
    logAudit(req, "broadcast.create", "broadcast", "unknown");
    return NextResponse.json({ ok: true, broadcast_id: broadcast.id, total: targets.length, status: "scheduled" });
  }

  // 予約日時の差し込み用: 全対象患者の次回予約を一括取得
  const targetPatientIds = targets.map(t => t.patient_id);
  const nextReservationMap = new Map<string, { date: string; time: string }>();
  if (targetPatientIds.length > 0) {
    const { data: reservations } = await strictWithTenant(
      supabaseAdmin
        .from("reservations")
        .select("patient_id, reserved_date, reserved_time")
        .in("patient_id", targetPatientIds)
        .neq("status", "canceled")
        .gte("reserved_date", new Date().toISOString().split("T")[0])
        .order("reserved_date", { ascending: true })
        .order("reserved_time", { ascending: true }),
      tenantId
    );

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

  // 即時送信（10件ずつ並列バッチ）
  let sentCount = 0;
  let failedCount = 0;
  let noUidCount = 0;

  // LINE未連携を先にログ記録
  const noUidTargets = targets.filter(t => !t.line_id);
  const sendable = targets.filter(t => t.line_id);
  noUidCount = noUidTargets.length;

  if (noUidTargets.length > 0) {
    await supabaseAdmin.from("message_log").insert(
      noUidTargets.map(t => ({
        ...tenantPayload(tenantId),
        patient_id: t.patient_id,
        event_type: "message",
        message_type: "broadcast",
        content: message,
        status: "no_uid",
        campaign_id: broadcast.id,
        direction: "outgoing",
      }))
    );
  }

  const BATCH_SIZE = 10;
  for (let i = 0; i < sendable.length; i += BATCH_SIZE) {
    const batch = sendable.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (target) => {
        const nextRes = nextReservationMap.get(target.patient_id);
        const resolvedMsg = message
          .replace(/\{name\}/g, target.patient_name || "")
          .replace(/\{patient_id\}/g, target.patient_id)
          .replace(/\{send_date\}/g, todayStr)
          .replace(/\{next_reservation_date\}/g, nextRes?.date || "")
          .replace(/\{next_reservation_time\}/g, nextRes?.time || "");

        let status = "failed";
        try {
          const res = await pushMessage(target.line_id!, [{ type: "text", text: resolvedMsg }], tenantId ?? undefined);
          status = res?.ok ? "sent" : "failed";
        } catch {
          // status remains "failed"
        }

        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(tenantId),
          patient_id: target.patient_id,
          line_uid: target.line_id,
          event_type: "message",
          message_type: "broadcast",
          content: resolvedMsg,
          status,
          campaign_id: broadcast.id,
          direction: "outgoing",
        });

        return status === "sent";
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sentCount++;
      else failedCount++;
    }
  }

  // 配信レコード更新
  await strictWithTenant(
    supabaseAdmin.from("broadcasts").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
      no_uid_count: noUidCount,
    }).eq("id", broadcast.id),
    tenantId
  );

  // friends-list Redisキャッシュ無効化（fire-and-forget）
  invalidateFriendsListCache(tenantId || "00000000-0000-0000-0000-000000000001").catch(() => {});

  return NextResponse.json({
    ok: true,
    broadcast_id: broadcast.id,
    total: targets.length,
    sent: sentCount,
    failed: failedCount,
    no_uid: noUidCount,
  });
}

// フィルタルールに基づいて対象患者を解決（テナントフィルタ付き）
export async function resolveTargets(rules: FilterRules, tenantId: string | null = null) {
  // patients テーブルから patient_name, line_id を取得（intake の冗長カラムを使わない）
  const [intakeRes, patientsRes] = await Promise.all([
    fetchAll(
      () => strictWithTenant(
        supabaseAdmin.from("intake").select("patient_id").not("patient_id", "is", null).order("created_at", { ascending: false }),
        tenantId
      ),
    ),
    fetchAll(
      () => strictWithTenant(
        supabaseAdmin.from("patients").select("patient_id, name, line_id"),
        tenantId
      ),
    ),
  ]);

  const allIntake = intakeRes.data;
  if (!allIntake || allIntake.length === 0) {
    console.log("[resolveTargets] intake returned 0 rows");
    return [];
  }

  // patients テーブルの name, line_id をマッピング
  const pMap = new Map<string, { name: string; line_id: string | null }>();
  for (const p of (patientsRes.data || []) as { patient_id: string; name: string | null; line_id: string | null }[]) {
    if (p.patient_id) {
      pMap.set(p.patient_id, { name: p.name || "", line_id: p.line_id || null });
    }
  }

  // patient_idでユニーク化（最新レコード優先）
  const patientMap = new Map<string, { patient_id: string; patient_name: string; line_id: string | null }>();
  for (const row of allIntake) {
    if (!patientMap.has(row.patient_id as string)) {
      const pt = pMap.get(row.patient_id as string);
      patientMap.set(row.patient_id as string, {
        patient_id: row.patient_id as string,
        patient_name: pt?.name || "",
        line_id: pt?.line_id || null,
      });
    }
  }

  let targets = Array.from(patientMap.values());
  console.log(`[resolveTargets] intake: ${allIntake.length} rows → ${targets.length} unique patients`);

  // 絞り込み条件
  if (rules.include?.conditions?.length) {
    for (const cond of rules.include.conditions) {
      const before = targets.length;
      targets = await applyCondition(targets, cond, true, tenantId);
      console.log(`[resolveTargets] include ${cond.type}(${cond.tag_id || cond.values || ""}): ${before} → ${targets.length}`);
    }
  }

  // 除外条件
  if (rules.exclude?.conditions?.length) {
    for (const cond of rules.exclude.conditions) {
      const before = targets.length;
      targets = await applyCondition(targets, cond, false, tenantId);
      console.log(`[resolveTargets] exclude ${cond.type}: ${before} → ${targets.length}`);
    }
  }

  return targets;
}

async function applyCondition(
  targets: { patient_id: string; patient_name: string; line_id: string | null }[],
  condition: FilterCondition,
  isInclude: boolean,
  tenantId: string | null = null
) {
  switch (condition.type) {
    case "tag": {
      const { data: tagged } = await fetchAll(
        () => strictWithTenant(
          supabaseAdmin.from("patient_tags").select("patient_id").eq("tag_id", condition.tag_id!),
          tenantId
        )
      );
      const taggedSet = new Set((tagged || []).map(t => t.patient_id));
      console.log(`[applyCondition] tag_id=${condition.tag_id}, tagged patients:`, Array.from(taggedSet));

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
      const { data: marks } = await fetchAll(
        () => strictWithTenant(
          supabaseAdmin.from("patient_marks").select("patient_id, mark").in("mark", condition.values || []),
          tenantId
        )
      );
      const markedSet = new Set((marks || []).map(m => m.patient_id));

      if (isInclude) return targets.filter(t => markedSet.has(t.patient_id));
      return targets.filter(t => !markedSet.has(t.patient_id));
    }

    case "field": {
      const { data: fieldVals } = await fetchAll(
        () => strictWithTenant(
          supabaseAdmin.from("friend_field_values").select("patient_id, value").eq("field_id", condition.field_id!),
          tenantId
        )
      );

      const matchSet = new Set<string>();
      for (const fv of fieldVals || []) {
        if (matchFieldCondition(fv.value as string | null, condition.operator || "=", condition.value || "")) {
          matchSet.add(fv.patient_id as string);
        }
      }

      if (isInclude) return targets.filter(t => matchSet.has(t.patient_id));
      return targets.filter(t => !matchSet.has(t.patient_id));
    }

    case "has_line_uid": {
      if (isInclude) return targets.filter(t => !!t.line_id);
      return targets.filter(t => !t.line_id);
    }

    case "visit_count": {
      const pids = targets.map(t => t.patient_id);
      const counts = await getVisitCounts(pids, condition.date_range, tenantId);
      const matchSet = new Set<string>();
      for (const [pid, count] of counts) {
        if (matchBehaviorCondition(count, condition.operator || ">=", condition.value || "0", condition.value_end)) {
          matchSet.add(pid);
        }
      }
      if (isInclude) return targets.filter(t => matchSet.has(t.patient_id));
      return targets.filter(t => !matchSet.has(t.patient_id));
    }

    case "purchase_amount": {
      const pids = targets.map(t => t.patient_id);
      const amounts = await getPurchaseAmounts(pids, condition.date_range, tenantId);
      const matchSet = new Set<string>();
      for (const [pid, amount] of amounts) {
        if (matchBehaviorCondition(amount, condition.operator || ">=", condition.value || "0", condition.value_end)) {
          matchSet.add(pid);
        }
      }
      if (isInclude) return targets.filter(t => matchSet.has(t.patient_id));
      return targets.filter(t => !matchSet.has(t.patient_id));
    }

    case "last_visit": {
      const pids = targets.map(t => t.patient_id);
      const dates = await getLastVisitDates(pids, tenantId);
      const matchSet = new Set<string>();
      for (const [pid, date] of dates) {
        if (date && matchBehaviorCondition(date, condition.operator || "within_days", condition.value || "30")) {
          matchSet.add(pid);
        }
      }
      if (isInclude) return targets.filter(t => matchSet.has(t.patient_id));
      return targets.filter(t => !matchSet.has(t.patient_id));
    }

    case "reorder_count": {
      const pids = targets.map(t => t.patient_id);
      const counts = await getReorderCounts(pids, tenantId);
      const matchSet = new Set<string>();
      for (const [pid, count] of counts) {
        if (matchBehaviorCondition(count, condition.operator || ">=", condition.value || "0", condition.value_end)) {
          matchSet.add(pid);
        }
      }
      if (isInclude) return targets.filter(t => matchSet.has(t.patient_id));
      return targets.filter(t => !matchSet.has(t.patient_id));
    }

    case "registered_date": {
      const op = condition.operator || ">=";
      const val = condition.value || "";
      if (!val) return targets;
      const pids = targets.map(t => t.patient_id);
      const { data: patientsData } = await fetchAll(
        () => strictWithTenant(
          supabaseAdmin.from("patients").select("patient_id, created_at").in("patient_id", pids),
          tenantId
        )
      );
      const matchSet = new Set<string>();
      for (const p of patientsData || []) {
        const createdDate = (p.created_at as string)?.split("T")[0] || "";
        let matched = false;
        if (op === ">=" || op === "after") matched = createdDate >= val;
        else if (op === "<=" || op === "before") matched = createdDate <= val;
        else if (op === "=") matched = createdDate === val;
        if (matched) matchSet.add(p.patient_id as string);
      }
      if (isInclude) return targets.filter(t => matchSet.has(t.patient_id));
      return targets.filter(t => !matchSet.has(t.patient_id));
    }

    case "intake_status": {
      const statusVal = condition.value || "none";
      const pids = targets.map(t => t.patient_id);
      // intake.status でフィルタ
      const { data: intakes } = await fetchAll(
        () => strictWithTenant(
          supabaseAdmin.from("intake").select("patient_id, status").in("patient_id", pids),
          tenantId
        )
      );
      // 各patient_idの最新ステータスを集計
      const statusMap = new Map<string, string>();
      for (const row of intakes || []) {
        const pid = row.patient_id as string;
        const st = row.status as string | null;
        if (st === "OK") statusMap.set(pid, "OK");
        else if (st === "NG" && statusMap.get(pid) !== "OK") statusMap.set(pid, "NG");
      }
      const matchSet = new Set<string>();
      for (const pid of pids) {
        const actual = statusMap.get(pid) || "none";
        if (actual === statusVal) matchSet.add(pid);
      }
      if (isInclude) return targets.filter(t => matchSet.has(t.patient_id));
      return targets.filter(t => !matchSet.has(t.patient_id));
    }

    case "reservation_status": {
      const statusVal = condition.value || "none";
      const pids = targets.map(t => t.patient_id);
      const today = new Date().toISOString().split("T")[0];
      // アクティブな予約 = 今日以降かつキャンセルされていない予約
      const { data: reservations } = await fetchAll(
        () => strictWithTenant(
          supabaseAdmin.from("reservations")
            .select("patient_id")
            .in("patient_id", pids)
            .gte("reserved_date", today)
            .neq("status", "canceled"),
          tenantId
        )
      );
      const hasReservation = new Set((reservations || []).map(r => r.patient_id as string));
      const matchSet = new Set<string>();
      for (const pid of pids) {
        const actual = hasReservation.has(pid) ? "has" : "none";
        if (actual === statusVal) matchSet.add(pid);
      }
      if (isInclude) return targets.filter(t => matchSet.has(t.patient_id));
      return targets.filter(t => !matchSet.has(t.patient_id));
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

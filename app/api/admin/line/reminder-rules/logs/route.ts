// app/api/admin/line/reminder-rules/logs/route.ts — リマインド送信ログ
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

// 送信ログ取得（日別・ルール別集計）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  // reminder_sent_log を直近30日分取得（scheduled_messages の status と結合）
  const { data: logs, error } = await withTenant(
    supabaseAdmin
      .from("reminder_sent_log")
      .select("id, rule_id, reservation_id, scheduled_message_id, created_at")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false }),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!logs || logs.length === 0) return NextResponse.json({ logs: [] });

  // scheduled_message_ids を取得して status を確認
  const msgIds = [...new Set(logs.map((l: any) => l.scheduled_message_id).filter(Boolean))];
  const statusMap = new Map<number, string>();

  if (msgIds.length > 0) {
    const { data: msgs } = await withTenant(
      supabaseAdmin
        .from("scheduled_messages")
        .select("id, status")
        .in("id", msgIds),
      tenantId
    );
    for (const m of msgs || []) {
      statusMap.set(m.id, m.status);
    }
  }

  // ルール名取得
  const ruleIds = [...new Set(logs.map((l: any) => l.rule_id))];
  const { data: rules } = await withTenant(
    supabaseAdmin
      .from("reminder_rules")
      .select("id, name, message_format, send_hour, send_minute, target_day_offset")
      .in("id", ruleIds),
    tenantId
  );
  const ruleMap = new Map<number, any>();
  for (const r of rules || []) {
    ruleMap.set(r.id, r);
  }

  // 日別・ルール別に集計
  const grouped = new Map<string, { rule_id: number; rule_name: string; date: string; total: number; sent: number; failed: number; scheduled: number; message_format: string; send_time: string }>();

  for (const log of logs) {
    const dateStr = log.created_at.split("T")[0]; // YYYY-MM-DD
    const key = `${log.rule_id}_${dateStr}`;
    const rule = ruleMap.get(log.rule_id);
    const status = log.scheduled_message_id ? (statusMap.get(log.scheduled_message_id) || "scheduled") : "unknown";

    if (!grouped.has(key)) {
      const hh = rule?.send_hour != null ? String(rule.send_hour).padStart(2, "0") : "--";
      const mm = rule?.send_minute != null ? String(rule.send_minute).padStart(2, "0") : "00";
      grouped.set(key, {
        rule_id: log.rule_id,
        rule_name: rule?.name || `ルール#${log.rule_id}`,
        date: dateStr,
        total: 0,
        sent: 0,
        failed: 0,
        scheduled: 0,
        message_format: rule?.message_format || "text",
        send_time: `${hh}:${mm}`,
      });
    }

    const entry = grouped.get(key)!;
    entry.total++;
    if (status === "sent") entry.sent++;
    else if (status === "failed") entry.failed++;
    else entry.scheduled++;
  }

  // 日付降順でソート
  const result = [...grouped.values()].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.rule_id - b.rule_id;
  });

  return NextResponse.json({ logs: result });
}

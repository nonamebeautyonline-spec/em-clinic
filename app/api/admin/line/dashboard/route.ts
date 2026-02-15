import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

async function fetchAll(buildQuery: () => any, pageSize = 5000) {
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

// 特定日のフォロワー統計を取得
async function fetchFollowerStats(dateStr: string, token: string) {
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.line.me/v2/bot/insight/followers?date=${dateStr}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "ready") return null;
    return {
      date: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`,
      followers: data.followers || 0,
      targetedReaches: data.targetedReaches || 0,
      blocks: data.blocks || 0,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const lineToken = await getSettingOrEnv("line", "channel_access_token", "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";

  // 1. フォロワー統計（昨日 + 過去7日分を並列取得）
  const dates: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }

  const dailyResults = await Promise.all(dates.map(d => fetchFollowerStats(d, lineToken)));
  const dailyStats = dailyResults.filter(Boolean) as {
    date: string; followers: number; targetedReaches: number; blocks: number;
  }[];

  // 最新（昨日）の統計
  const stats = dailyStats.length > 0
    ? { followers: dailyStats[0].followers, targetedReaches: dailyStats[0].targetedReaches, blocks: dailyStats[0].blocks }
    : { followers: 0, targetedReaches: 0, blocks: 0 };

  // 2. 今月の送信数
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;
  const { count: monthlySent } = await withTenant(
    supabaseAdmin
      .from("message_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", monthStart),
    tenantId
  );

  // 3. 最新送信メッセージ10件
  const { data: recentMsgs } = await withTenant(
    supabaseAdmin
      .from("message_log")
      .select("id, patient_id, message_type, content, status, sent_at")
      .order("sent_at", { ascending: false })
      .limit(10),
    tenantId
  );

  // patient_id → patient_name のマッピング（patients テーブルから取得）
  const patientIds = [...new Set((recentMsgs || []).map(m => m.patient_id).filter(Boolean))];
  let nameMap = new Map<string, string>();
  if (patientIds.length > 0) {
    const { data: patientRows } = await fetchAll(() =>
      withTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name")
          .in("patient_id", patientIds),
        tenantId
      )
    );
    for (const row of patientRows || []) {
      if (!nameMap.has(row.patient_id)) {
        nameMap.set(row.patient_id, row.name || "");
      }
    }
  }

  const recentMessages = (recentMsgs || []).map(m => ({
    ...m,
    patient_name: nameMap.get(m.patient_id) || m.patient_id || "—",
  }));

  return NextResponse.json({
    stats,
    monthlySent: monthlySent || 0,
    dailyStats,
    recentMessages,
  });
}

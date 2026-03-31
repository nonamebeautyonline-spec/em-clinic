// lib/conversion-tracking.ts — コンバージョンポイント定義・記録・レポート
//
// CVポイント: 「初診予約完了=30,000円」等の目標定義
// CVイベント: 実際にCVが発生した記録（患者・金額・アフィリエイト紐付け）
//
// 使い方:
//   import { trackConversion, getConversionReport } from "@/lib/conversion-tracking";
//   await trackConversion({ conversionPointId, patientId, tenantId });

import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant, tenantPayload } from "@/lib/tenant";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export interface ConversionPoint {
  id: string;
  name: string;
  event_type: string;
  value: number | null;
  tenant_id: string;
  created_at: string;
}

export interface ConversionEvent {
  id: string;
  conversion_point_id: string;
  patient_id: string;
  affiliate_code: string | null;
  metadata: Record<string, unknown> | null;
  tenant_id: string;
  created_at: string;
}

export interface ConversionReportItem {
  conversionPointId: string;
  conversionPointName: string;
  eventType: string;
  totalCount: number;
  totalValue: number;
}

// ---------------------------------------------------------------------------
// CVポイント CRUD
// ---------------------------------------------------------------------------

export async function getConversionPoints(tenantId: string): Promise<ConversionPoint[]> {
  const { data } = await strictWithTenant(
    supabaseAdmin
      .from("conversion_points")
      .select("*")
      .order("created_at", { ascending: false }),
    tenantId,
  );
  return (data ?? []) as ConversionPoint[];
}

export async function createConversionPoint(
  input: { name: string; eventType: string; value?: number | null },
  tenantId: string,
): Promise<ConversionPoint> {
  const { data, error } = await supabaseAdmin
    .from("conversion_points")
    .insert({
      ...tenantPayload(tenantId),
      name: input.name,
      event_type: input.eventType,
      value: input.value ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`CVポイント作成失敗: ${error.message}`);
  return data as ConversionPoint;
}

export async function deleteConversionPoint(id: string, tenantId: string): Promise<void> {
  await strictWithTenant(
    supabaseAdmin.from("conversion_points").delete().eq("id", id),
    tenantId,
  );
}

// ---------------------------------------------------------------------------
// CVイベント記録
// ---------------------------------------------------------------------------

export async function trackConversion(input: {
  conversionPointId: string;
  patientId: string;
  tenantId: string;
  affiliateCode?: string;
  metadata?: Record<string, unknown>;
}): Promise<ConversionEvent> {
  const { data, error } = await supabaseAdmin
    .from("conversion_events")
    .insert({
      ...tenantPayload(input.tenantId),
      conversion_point_id: input.conversionPointId,
      patient_id: input.patientId,
      affiliate_code: input.affiliateCode ?? null,
      metadata: input.metadata ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`CV記録失敗: ${error.message}`);
  return data as ConversionEvent;
}

// ---------------------------------------------------------------------------
// CVイベント取得（フィルター付き）
// ---------------------------------------------------------------------------

export async function getConversionEvents(
  tenantId: string,
  opts: {
    conversionPointId?: string;
    patientId?: string;
    affiliateCode?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<ConversionEvent[]> {
  let query = strictWithTenant(
    supabaseAdmin
      .from("conversion_events")
      .select("*")
      .order("created_at", { ascending: false }),
    tenantId,
  );

  if (opts.conversionPointId) query = query.eq("conversion_point_id", opts.conversionPointId);
  if (opts.patientId) query = query.eq("patient_id", opts.patientId);
  if (opts.affiliateCode) query = query.eq("affiliate_code", opts.affiliateCode);
  if (opts.startDate) query = query.gte("created_at", opts.startDate);
  if (opts.endDate) query = query.lte("created_at", opts.endDate);

  query = query.limit(opts.limit ?? 100);
  if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 100) - 1);

  const { data } = await query;
  return (data ?? []) as ConversionEvent[];
}

// ---------------------------------------------------------------------------
// CVレポート（CVポイント別の集計）
// ---------------------------------------------------------------------------

export async function getConversionReport(
  tenantId: string,
  opts: { startDate?: string; endDate?: string } = {},
): Promise<ConversionReportItem[]> {
  // CVポイント一覧取得
  const points = await getConversionPoints(tenantId);

  // CVイベント全件取得（テナント内）
  let eventsQuery = strictWithTenant(
    supabaseAdmin.from("conversion_events").select("conversion_point_id"),
    tenantId,
  );
  if (opts.startDate) eventsQuery = eventsQuery.gte("created_at", opts.startDate);
  if (opts.endDate) eventsQuery = eventsQuery.lte("created_at", opts.endDate);

  const { data: events } = await eventsQuery;

  // ポイント別にカウント
  const countMap = new Map<string, number>();
  for (const ev of events ?? []) {
    const pid = (ev as { conversion_point_id: string }).conversion_point_id;
    countMap.set(pid, (countMap.get(pid) ?? 0) + 1);
  }

  return points.map((p) => ({
    conversionPointId: p.id,
    conversionPointName: p.name,
    eventType: p.event_type,
    totalCount: countMap.get(p.id) ?? 0,
    totalValue: (countMap.get(p.id) ?? 0) * (p.value ?? 0),
  }));
}

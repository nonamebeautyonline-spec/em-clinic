// app/api/admin/kpi-targets/route.ts
// KPI目標設定 API — 目標の取得・設定・削除

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth, getAdminUserId } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { unauthorized, serverError } from "@/lib/api-error";

// 有効な metric_type の一覧
const VALID_METRIC_TYPES = [
  "revenue",        // 売上目標（円）
  "new_patients",   // 新規患者数
  "reservations",   // 予約数
  "paid_count",     // 決済完了数
  "repeat_rate",    // リピート率（%）
  "payment_rate",   // 診療後決済率（%）
] as const;

type MetricType = (typeof VALID_METRIC_TYPES)[number];

// year_month のバリデーション（YYYY-MM形式）
function isValidYearMonth(ym: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(ym);
}

/**
 * GET /api/admin/kpi-targets
 * クエリパラメータ:
 *   year_month: 対象月（例: 2026-03）
 *   with_actuals: "true" の場合、実績値も返す
 */
export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(request);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(request);
    const searchParams = request.nextUrl.searchParams;
    const yearMonth = searchParams.get("year_month");
    const withActuals = searchParams.get("with_actuals") === "true";

    // 目標データ取得
    let query = supabaseAdmin
      .from("kpi_targets")
      .select("*")
      .order("metric_type");

    query = strictWithTenant(query, tenantId);

    if (yearMonth && isValidYearMonth(yearMonth)) {
      query = query.eq("year_month", yearMonth);
    }

    const { data: targets, error } = await query;
    if (error) {
      console.error("[kpi-targets] GET error:", error);
      return serverError(error.message);
    }

    // 実績値を計算して返す
    if (withActuals && yearMonth && isValidYearMonth(yearMonth)) {
      const actuals = await fetchActuals(tenantId, yearMonth);
      const enriched = (targets || []).map((t: { metric_type: string; target_value: number; [key: string]: unknown }) => ({
        ...t,
        actual_value: actuals[t.metric_type as MetricType] ?? null,
        achievement_rate: actuals[t.metric_type as MetricType] != null && t.target_value > 0
          ? Math.round((actuals[t.metric_type as MetricType]! / t.target_value) * 1000) / 10
          : null,
      }));
      return NextResponse.json({ targets: enriched, actuals });
    }

    return NextResponse.json({ targets: targets || [] });
  } catch (err) {
    console.error("[kpi-targets] GET unexpected error:", err);
    return serverError("KPI目標の取得に失敗しました");
  }
}

/**
 * POST /api/admin/kpi-targets
 * Body: { metric_type, target_value, year_month, period? }
 * Upsert（tenant_id + metric_type + period + year_month のユニーク制約利用）
 */
export async function POST(request: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(request);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(request);
    const userId = await getAdminUserId(request);
    const body = await request.json();

    const { metric_type, target_value, year_month, period = "monthly" } = body;

    // バリデーション
    if (!metric_type || !VALID_METRIC_TYPES.includes(metric_type)) {
      return NextResponse.json(
        { error: `無効な指標タイプです。有効値: ${VALID_METRIC_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    if (target_value == null || isNaN(Number(target_value)) || Number(target_value) < 0) {
      return NextResponse.json(
        { error: "目標値は0以上の数値を指定してください" },
        { status: 400 },
      );
    }
    if (!year_month || !isValidYearMonth(year_month)) {
      return NextResponse.json(
        { error: "年月はYYYY-MM形式で指定してください（例: 2026-03）" },
        { status: 400 },
      );
    }

    // Upsert（ユニーク制約: tenant_id, metric_type, period, year_month）
    const { data, error } = await supabaseAdmin
      .from("kpi_targets")
      .upsert(
        {
          ...tenantPayload(tenantId),
          metric_type,
          target_value: Number(target_value),
          period,
          year_month,
          created_by: userId,
        },
        { onConflict: "tenant_id,metric_type,period,year_month" },
      )
      .select()
      .single();

    if (error) {
      console.error("[kpi-targets] POST error:", error);
      return serverError(error.message);
    }

    return NextResponse.json({ target: data }, { status: 200 });
  } catch (err) {
    console.error("[kpi-targets] POST unexpected error:", err);
    return serverError("KPI目標の保存に失敗しました");
  }
}

/**
 * DELETE /api/admin/kpi-targets
 * Body: { id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(request);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(request);
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "IDが指定されていません" }, { status: 400 });
    }

    let query = supabaseAdmin.from("kpi_targets").delete().eq("id", id);
    query = strictWithTenant(query, tenantId);

    const { error } = await query;
    if (error) {
      console.error("[kpi-targets] DELETE error:", error);
      return serverError(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[kpi-targets] DELETE unexpected error:", err);
    return serverError("KPI目標の削除に失敗しました");
  }
}

// ─── 実績値の計算 ──────────────────────────────────────────

async function fetchActuals(
  tenantId: string | null,
  yearMonth: string,
): Promise<Partial<Record<MetricType, number>>> {
  // yearMonth = "2026-03" → startISO, endISO
  const [year, month] = yearMonth.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  // JST変換した日付文字列（予約の reserved_date は YYYY-MM-DD 形式）
  const jstStart = `${yearMonth}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const jstEnd = `${nextMonth}-01`;

  const [
    revenueResult,
    newPatientsResult,
    reservationsResult,
    paidCountResult,
    // リピート率・決済率は別途計算
    consultedResult,
    paidAfterConsultResult,
    totalPatientsResult,
    repeatPatientsResult,
  ] = await Promise.all([
    // 売上: orders の paid_at が期間内のもの（credit_card + bank_transfer confirmed）
    strictWithTenant(
      supabaseAdmin
        .from("orders")
        .select("amount")
        .gte("paid_at", startISO)
        .lt("paid_at", endISO)
        .limit(10000),
      tenantId,
    ),
    // 新規患者: intake の created_at が期間内
    strictWithTenant(
      supabaseAdmin
        .from("intake")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startISO)
        .lt("created_at", endISO),
      tenantId,
    ),
    // 予約数
    strictWithTenant(
      supabaseAdmin
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .gte("reserved_date", jstStart)
        .lt("reserved_date", jstEnd),
      tenantId,
    ),
    // 決済完了数
    strictWithTenant(
      supabaseAdmin
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("paid_at", startISO)
        .lt("paid_at", endISO),
      tenantId,
    ),
    // 診察完了（OK）の患者
    strictWithTenant(
      supabaseAdmin
        .from("reservations")
        .select("patient_id")
        .eq("status", "OK")
        .gte("reserved_date", jstStart)
        .lt("reserved_date", jstEnd)
        .limit(10000),
      tenantId,
    ),
    // 診察後に決済した患者
    strictWithTenant(
      supabaseAdmin
        .from("orders")
        .select("patient_id")
        .gte("paid_at", startISO)
        .lt("paid_at", endISO)
        .limit(10000),
      tenantId,
    ),
    // 総患者（period内で1回以上注文あり）
    strictWithTenant(
      supabaseAdmin
        .from("orders")
        .select("patient_id")
        .gte("paid_at", startISO)
        .lt("paid_at", endISO)
        .limit(10000),
      tenantId,
    ),
    // リピート患者（2回以上注文歴がある患者）
    // 簡易版: 期間内に paid_at がある注文の patient_id のうち、それ以前にも注文がある患者
    strictWithTenant(
      supabaseAdmin
        .from("orders")
        .select("patient_id")
        .lt("paid_at", startISO)
        .limit(10000),
      tenantId,
    ),
  ]);

  // 売上合計
  const revenue = (revenueResult.data || []).reduce(
    (sum: number, r: { amount: number }) => sum + (Number(r.amount) || 0),
    0,
  );

  // 新規患者数
  const newPatients = newPatientsResult.count || 0;

  // 予約数
  const reservations = reservationsResult.count || 0;

  // 決済完了数
  const paidCount = paidCountResult.count || 0;

  // 診療後決済率
  const consultedIds = new Set<string>(
    (consultedResult.data || []).map((r: { patient_id: string }) => r.patient_id),
  );
  const paidIds = new Set<string>(
    (paidAfterConsultResult.data || []).map((r: { patient_id: string }) => r.patient_id),
  );
  const consultedAndPaid = Array.from(consultedIds).filter((id) => paidIds.has(id));
  const paymentRate =
    consultedIds.size > 0
      ? Math.round((consultedAndPaid.length / consultedIds.size) * 1000) / 10
      : 0;

  // リピート率
  const currentPatientIds = new Set<string>(
    (totalPatientsResult.data || []).map((r: { patient_id: string }) => r.patient_id),
  );
  const previousPatientIds = new Set<string>(
    (repeatPatientsResult.data || []).map((r: { patient_id: string }) => r.patient_id),
  );
  const repeatPatients = Array.from(currentPatientIds).filter((id) =>
    previousPatientIds.has(id),
  );
  const repeatRate =
    currentPatientIds.size > 0
      ? Math.round((repeatPatients.length / currentPatientIds.size) * 1000) / 10
      : 0;

  return {
    revenue,
    new_patients: newPatients,
    reservations,
    paid_count: paidCount,
    payment_rate: paymentRate,
    repeat_rate: repeatRate,
  };
}

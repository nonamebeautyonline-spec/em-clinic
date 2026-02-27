import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

// 売上トレンドAPI: 月別・年別の売上推移と前期比較を提供
export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(request);
    const searchParams = request.nextUrl.searchParams;
    const granularity = searchParams.get("granularity") || "monthly"; // monthly | yearly
    const monthsBack = parseInt(searchParams.get("months") || "12", 10);

    const jstOffset = 9 * 60 * 60 * 1000;
    const now = new Date();
    const jstNow = new Date(now.getTime() + jstOffset);
    const currentYear = jstNow.getUTCFullYear();
    const currentMonth = jstNow.getUTCMonth();

    if (granularity === "yearly") {
      return await getYearlyTrends(tenantId, currentYear, jstOffset);
    }

    return await getMonthlyTrends(tenantId, currentYear, currentMonth, monthsBack, jstOffset);
  } catch (error) {
    console.error("[dashboard-trends] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

async function getMonthlyTrends(
  tenantId: string | null,
  currentYear: number,
  currentMonth: number,
  monthsBack: number,
  jstOffset: number,
) {
  // 過去N月分のデータを取得
  const startDate = new Date(Date.UTC(currentYear, currentMonth - monthsBack, 1, 0, 0, 0) - jstOffset);
  const endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 1, 0, 0, 0) - jstOffset);

  const [squareResult, bankResult, refundResult] = await Promise.all([
    withTenant(
      supabaseAdmin.from("orders").select("amount, paid_at, patient_id")
        .eq("payment_method", "credit_card")
        .not("paid_at", "is", null)
        .gte("paid_at", startDate.toISOString())
        .lt("paid_at", endDate.toISOString())
        .limit(100000),
      tenantId,
    ),
    withTenant(
      supabaseAdmin.from("orders").select("amount, created_at, patient_id")
        .eq("payment_method", "bank_transfer")
        .in("status", ["pending_confirmation", "confirmed"])
        .gte("created_at", startDate.toISOString())
        .lt("created_at", endDate.toISOString())
        .limit(100000),
      tenantId,
    ),
    withTenant(
      supabaseAdmin.from("orders").select("refunded_amount, amount, refunded_at")
        .eq("refund_status", "COMPLETED")
        .gte("refunded_at", startDate.toISOString())
        .lt("refunded_at", endDate.toISOString())
        .limit(100000),
      tenantId,
    ),
  ]);

  const squareOrders = squareResult.data || [];
  const bankOrders = bankResult.data || [];
  const refundOrders = refundResult.data || [];

  // 月別に集計
  const monthlyMap = new Map<string, {
    square: number;
    bankTransfer: number;
    refunded: number;
    orderCount: number;
    patientIds: Set<string>;
  }>();

  // 対象月のキーを事前生成
  for (let i = monthsBack; i >= 0; i--) {
    const m = new Date(Date.UTC(currentYear, currentMonth - i, 1));
    const key = `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, { square: 0, bankTransfer: 0, refunded: 0, orderCount: 0, patientIds: new Set() });
  }

  for (const order of squareOrders) {
    const jstDate = new Date(new Date(order.paid_at).getTime() + jstOffset);
    const key = `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const entry = monthlyMap.get(key);
    if (entry) {
      entry.square += order.amount || 0;
      entry.orderCount++;
      if (order.patient_id) entry.patientIds.add(order.patient_id);
    }
  }

  for (const order of bankOrders) {
    const jstDate = new Date(new Date(order.created_at).getTime() + jstOffset);
    const key = `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const entry = monthlyMap.get(key);
    if (entry) {
      entry.bankTransfer += order.amount || 0;
      entry.orderCount++;
      if (order.patient_id) entry.patientIds.add(order.patient_id);
    }
  }

  for (const order of refundOrders) {
    const jstDate = new Date(new Date(order.refunded_at).getTime() + jstOffset);
    const key = `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const entry = monthlyMap.get(key);
    if (entry) {
      entry.refunded += order.refunded_amount ?? order.amount ?? 0;
    }
  }

  const trends = [...monthlyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      period: month,
      label: formatMonthLabel(month),
      square: data.square,
      bankTransfer: data.bankTransfer,
      total: data.square + data.bankTransfer - data.refunded,
      gross: data.square + data.bankTransfer,
      refunded: data.refunded,
      orderCount: data.orderCount,
      uniquePatients: data.patientIds.size,
    }));

  // 前月比の計算
  const current = trends[trends.length - 1];
  const previous = trends.length >= 2 ? trends[trends.length - 2] : null;
  const yoyMonth = trends.length >= 13 ? trends[trends.length - 13] : null;

  return NextResponse.json({
    granularity: "monthly",
    trends,
    comparison: {
      mom: previous ? calcChange(current?.total || 0, previous.total) : null, // 前月比
      yoy: yoyMonth ? calcChange(current?.total || 0, yoyMonth.total) : null, // 前年同月比
    },
    currentPeriod: current || null,
  });
}

async function getYearlyTrends(
  tenantId: string | null,
  currentYear: number,
  jstOffset: number,
) {
  const yearsBack = 5;
  const startDate = new Date(Date.UTC(currentYear - yearsBack, 0, 1, 0, 0, 0) - jstOffset);
  const endDate = new Date(Date.UTC(currentYear + 1, 0, 1, 0, 0, 0) - jstOffset);

  const [squareResult, bankResult, refundResult] = await Promise.all([
    withTenant(
      supabaseAdmin.from("orders").select("amount, paid_at, patient_id")
        .eq("payment_method", "credit_card")
        .not("paid_at", "is", null)
        .gte("paid_at", startDate.toISOString())
        .lt("paid_at", endDate.toISOString())
        .limit(100000),
      tenantId,
    ),
    withTenant(
      supabaseAdmin.from("orders").select("amount, created_at, patient_id")
        .eq("payment_method", "bank_transfer")
        .in("status", ["pending_confirmation", "confirmed"])
        .gte("created_at", startDate.toISOString())
        .lt("created_at", endDate.toISOString())
        .limit(100000),
      tenantId,
    ),
    withTenant(
      supabaseAdmin.from("orders").select("refunded_amount, amount, refunded_at")
        .eq("refund_status", "COMPLETED")
        .gte("refunded_at", startDate.toISOString())
        .lt("refunded_at", endDate.toISOString())
        .limit(100000),
      tenantId,
    ),
  ]);

  const squareOrders = squareResult.data || [];
  const bankOrders = bankResult.data || [];
  const refundOrders = refundResult.data || [];

  // 年別に集計
  const yearlyMap = new Map<string, {
    square: number;
    bankTransfer: number;
    refunded: number;
    orderCount: number;
    patientIds: Set<string>;
  }>();

  for (let y = currentYear - yearsBack; y <= currentYear; y++) {
    yearlyMap.set(String(y), { square: 0, bankTransfer: 0, refunded: 0, orderCount: 0, patientIds: new Set() });
  }

  for (const order of squareOrders) {
    const jstDate = new Date(new Date(order.paid_at).getTime() + jstOffset);
    const key = String(jstDate.getUTCFullYear());
    const entry = yearlyMap.get(key);
    if (entry) {
      entry.square += order.amount || 0;
      entry.orderCount++;
      if (order.patient_id) entry.patientIds.add(order.patient_id);
    }
  }

  for (const order of bankOrders) {
    const jstDate = new Date(new Date(order.created_at).getTime() + jstOffset);
    const key = String(jstDate.getUTCFullYear());
    const entry = yearlyMap.get(key);
    if (entry) {
      entry.bankTransfer += order.amount || 0;
      entry.orderCount++;
      if (order.patient_id) entry.patientIds.add(order.patient_id);
    }
  }

  for (const order of refundOrders) {
    const jstDate = new Date(new Date(order.refunded_at).getTime() + jstOffset);
    const key = String(jstDate.getUTCFullYear());
    const entry = yearlyMap.get(key);
    if (entry) {
      entry.refunded += order.refunded_amount ?? order.amount ?? 0;
    }
  }

  const trends = [...yearlyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, data]) => ({
      period: year,
      label: `${year}年`,
      square: data.square,
      bankTransfer: data.bankTransfer,
      total: data.square + data.bankTransfer - data.refunded,
      gross: data.square + data.bankTransfer,
      refunded: data.refunded,
      orderCount: data.orderCount,
      uniquePatients: data.patientIds.size,
    }));

  const current = trends[trends.length - 1];
  const previous = trends.length >= 2 ? trends[trends.length - 2] : null;

  return NextResponse.json({
    granularity: "yearly",
    trends,
    comparison: {
      yoy: previous ? calcChange(current?.total || 0, previous.total) : null,
    },
    currentPeriod: current || null,
  });
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${year}/${parseInt(month, 10)}`;
}

function calcChange(current: number, previous: number): { amount: number; rate: number } | null {
  if (previous === 0 && current === 0) return { amount: 0, rate: 0 };
  if (previous === 0) return { amount: current, rate: 100 };
  const amount = current - previous;
  const rate = Math.round((amount / previous) * 100);
  return { amount, rate };
}

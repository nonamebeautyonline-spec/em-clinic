import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

// 初診→再診転換率API: 月別コホート分析を提供
export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(request);
    const monthsBack = 12;
    const jstOffset = 9 * 60 * 60 * 1000;
    const now = new Date();
    const jstNow = new Date(now.getTime() + jstOffset);
    const currentYear = jstNow.getUTCFullYear();
    const currentMonth = jstNow.getUTCMonth();

    const startDate = new Date(Date.UTC(currentYear, currentMonth - monthsBack, 1, 0, 0, 0) - jstOffset);

    // 全期間の注文データを取得（patient_id + 決済日）
    const { data: allOrders } = await withTenant(
      supabaseAdmin.from("orders").select("patient_id, paid_at, created_at")
        .not("patient_id", "is", null)
        .gte("created_at", startDate.toISOString())
        .limit(100000),
      tenantId,
    );

    // 全患者の初回注文を取得（初診月を特定するため）
    const { data: firstOrders } = await withTenant(
      supabaseAdmin.from("orders").select("patient_id, created_at")
        .not("patient_id", "is", null)
        .order("created_at", { ascending: true })
        .limit(100000),
      tenantId,
    );

    const orders = allOrders || [];
    const allFirstOrders = firstOrders || [];

    // 患者ごとの初回注文日を特定
    const patientFirstOrder = new Map<string, string>();
    for (const order of allFirstOrders) {
      if (order.patient_id && !patientFirstOrder.has(order.patient_id)) {
        patientFirstOrder.set(order.patient_id, order.created_at);
      }
    }

    // 月別コホート: 初診月→再診した患者数
    const cohortMap = new Map<string, {
      newPatients: number;
      returnedPatients: number;
      patientIds: Set<string>;
      returnedIds: Set<string>;
      avgDaysToReturn: number;
      daysSum: number;
      returnCount: number;
    }>();

    // 対象月のキーを事前生成
    for (let i = monthsBack; i >= 0; i--) {
      const m = new Date(Date.UTC(currentYear, currentMonth - i, 1));
      const key = `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}`;
      cohortMap.set(key, {
        newPatients: 0,
        returnedPatients: 0,
        patientIds: new Set(),
        returnedIds: new Set(),
        avgDaysToReturn: 0,
        daysSum: 0,
        returnCount: 0,
      });
    }

    // 初診月ごとに患者をグルーピング
    for (const [patientId, firstDate] of patientFirstOrder) {
      const jstDate = new Date(new Date(firstDate).getTime() + jstOffset);
      const key = `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, "0")}`;
      const entry = cohortMap.get(key);
      if (entry) {
        entry.newPatients++;
        entry.patientIds.add(patientId);
      }
    }

    // 2回目以降の注文を特定して転換率を計算
    const patientOrderDates = new Map<string, string[]>();
    for (const order of orders) {
      if (!order.patient_id) continue;
      const dates = patientOrderDates.get(order.patient_id) || [];
      dates.push(order.created_at);
      patientOrderDates.set(order.patient_id, dates);
    }

    for (const [patientId, dates] of patientOrderDates) {
      if (dates.length < 2) continue;
      const firstDate = patientFirstOrder.get(patientId);
      if (!firstDate) continue;

      const jstFirst = new Date(new Date(firstDate).getTime() + jstOffset);
      const cohortKey = `${jstFirst.getUTCFullYear()}-${String(jstFirst.getUTCMonth() + 1).padStart(2, "0")}`;
      const entry = cohortMap.get(cohortKey);
      if (entry && !entry.returnedIds.has(patientId)) {
        entry.returnedIds.add(patientId);
        entry.returnedPatients++;

        // 初回→2回目の日数
        const sortedDates = dates.sort();
        if (sortedDates.length >= 2) {
          const first = new Date(sortedDates[0]).getTime();
          const second = new Date(sortedDates[1]).getTime();
          const days = Math.round((second - first) / (1000 * 60 * 60 * 24));
          entry.daysSum += days;
          entry.returnCount++;
        }
      }
    }

    const cohorts = [...cohortMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        period: month,
        label: formatMonthLabel(month),
        newPatients: data.newPatients,
        returnedPatients: data.returnedPatients,
        conversionRate: data.newPatients > 0
          ? Math.round((data.returnedPatients / data.newPatients) * 100)
          : 0,
        avgDaysToReturn: data.returnCount > 0
          ? Math.round(data.daysSum / data.returnCount)
          : null,
      }));

    // 全体の転換率
    const totalNew = cohorts.reduce((sum, c) => sum + c.newPatients, 0);
    const totalReturned = cohorts.reduce((sum, c) => sum + c.returnedPatients, 0);

    return NextResponse.json({
      cohorts,
      overall: {
        totalNew,
        totalReturned,
        conversionRate: totalNew > 0 ? Math.round((totalReturned / totalNew) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("[dashboard-conversion] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${year}/${parseInt(month, 10)}`;
}

// app/api/admin/line/coupons/analytics/route.ts — クーポン効果分析API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

// ---------- 型定義 ----------
interface CouponRow {
  id: number;
  name: string;
  code: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
}

interface IssueRow {
  coupon_id: number;
  status: string;
  used_at: string | null;
  issued_at: string | null;
  order_id: string | null;
}

interface OrderRow {
  id: string;
  amount: number;
}

interface DailyPoint {
  date: string;
  issued: number;
  used: number;
}

interface CouponStat {
  coupon_id: number;
  name: string;
  code: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  issued_count: number;
  used_count: number;
  usage_rate: number;
  total_discount: number;
  avg_order_amount: number;
}

interface AnalyticsResponse {
  summary: {
    total_issued: number;
    total_used: number;
    usage_rate: number;
    total_discount: number;
    avg_order_amount: number;
  };
  daily: DailyPoint[];
  by_coupon: CouponStat[];
}

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    // 1. 全クーポン取得
    const { data: coupons, error: cErr } = await strictWithTenant(
      supabaseAdmin.from("coupons").select("id, name, code, discount_type, discount_value"),
      tenantId,
    );
    if (cErr) return serverError(cErr.message);
    const couponList = (coupons || []) as CouponRow[];
    if (couponList.length === 0) {
      const empty: AnalyticsResponse = {
        summary: { total_issued: 0, total_used: 0, usage_rate: 0, total_discount: 0, avg_order_amount: 0 },
        daily: [],
        by_coupon: [],
      };
      return NextResponse.json(empty);
    }

    // 2. coupon_issues 取得（期間フィルタ付き）
    let q = supabaseAdmin
      .from("coupon_issues")
      .select("coupon_id, status, used_at, issued_at, order_id");
    if (from) q = q.gte("issued_at", `${from}T00:00:00+09:00`);
    if (to) q = q.lte("issued_at", `${to}T23:59:59+09:00`);
    const { data: issues, error: iErr } = await strictWithTenant(q, tenantId);
    if (iErr) return serverError(iErr.message);
    const issueList = (issues || []) as IssueRow[];

    // 3. 利用済みクーポンに紐づく注文の金額取得
    const usedOrderIds = issueList
      .filter((i) => i.status === "used" && i.order_id)
      .map((i) => i.order_id as string);

    let orderMap: Record<string, number> = {};
    if (usedOrderIds.length > 0) {
      // 50件ずつバッチで取得（Supabase IN句上限対策）
      const BATCH = 50;
      for (let i = 0; i < usedOrderIds.length; i += BATCH) {
        const batch = usedOrderIds.slice(i, i + BATCH);
        const { data: orders } = await strictWithTenant(
          supabaseAdmin.from("orders").select("id, amount").in("id", batch),
          tenantId,
        );
        for (const o of (orders || []) as OrderRow[]) {
          orderMap[o.id] = o.amount;
        }
      }
    }

    // 4. クーポンマスター参照用マップ
    const couponMap = new Map(couponList.map((c) => [c.id, c]));

    // 5. クーポン別集計
    const byCouponMap = new Map<number, { issued: number; used: number; orderAmounts: number[]; totalDiscount: number }>();
    for (const c of couponList) {
      byCouponMap.set(c.id, { issued: 0, used: 0, orderAmounts: [], totalDiscount: 0 });
    }

    for (const issue of issueList) {
      const stat = byCouponMap.get(issue.coupon_id);
      if (!stat) continue;
      stat.issued++;
      if (issue.status === "used") {
        stat.used++;
        const coupon = couponMap.get(issue.coupon_id);
        if (coupon) {
          if (issue.order_id && orderMap[issue.order_id] !== undefined) {
            const orderAmount = orderMap[issue.order_id];
            stat.orderAmounts.push(orderAmount);
            // 割引額を計算
            if (coupon.discount_type === "fixed") {
              stat.totalDiscount += coupon.discount_value;
            } else {
              stat.totalDiscount += Math.round(orderAmount * coupon.discount_value / 100);
            }
          } else {
            // order_idがない場合は定義値で推定
            if (coupon.discount_type === "fixed") {
              stat.totalDiscount += coupon.discount_value;
            }
          }
        }
      }
    }

    // 6. 日別集計
    const dailyMap = new Map<string, { issued: number; used: number }>();
    for (const issue of issueList) {
      // 配布日
      if (issue.issued_at) {
        const d = issue.issued_at.slice(0, 10);
        if (!dailyMap.has(d)) dailyMap.set(d, { issued: 0, used: 0 });
        dailyMap.get(d)!.issued++;
      }
      // 利用日
      if (issue.status === "used" && issue.used_at) {
        const d = issue.used_at.slice(0, 10);
        if (!dailyMap.has(d)) dailyMap.set(d, { issued: 0, used: 0 });
        dailyMap.get(d)!.used++;
      }
    }

    const daily: DailyPoint[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, issued: v.issued, used: v.used }));

    // 7. サマリー
    const totalIssued = issueList.length;
    const totalUsed = issueList.filter((i) => i.status === "used").length;
    let totalDiscount = 0;
    const allOrderAmounts: number[] = [];
    for (const [, stat] of byCouponMap) {
      totalDiscount += stat.totalDiscount;
      allOrderAmounts.push(...stat.orderAmounts);
    }
    const avgOrderAmount = allOrderAmounts.length > 0
      ? Math.round(allOrderAmounts.reduce((s, a) => s + a, 0) / allOrderAmounts.length)
      : 0;

    // 8. クーポン別詳細
    const byCoupon: CouponStat[] = couponList.map((c) => {
      const stat = byCouponMap.get(c.id)!;
      return {
        coupon_id: c.id,
        name: c.name,
        code: c.code,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        issued_count: stat.issued,
        used_count: stat.used,
        usage_rate: stat.issued > 0 ? Math.round((stat.used / stat.issued) * 1000) / 10 : 0,
        total_discount: stat.totalDiscount,
        avg_order_amount: stat.orderAmounts.length > 0
          ? Math.round(stat.orderAmounts.reduce((s, a) => s + a, 0) / stat.orderAmounts.length)
          : 0,
      };
    });

    const result: AnalyticsResponse = {
      summary: {
        total_issued: totalIssued,
        total_used: totalUsed,
        usage_rate: totalIssued > 0 ? Math.round((totalUsed / totalIssued) * 1000) / 10 : 0,
        total_discount: totalDiscount,
        avg_order_amount: avgOrderAmount,
      },
      daily,
      by_coupon: byCoupon,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[coupon/analytics] error:", err);
    return serverError("クーポン効果分析データの取得に失敗しました");
  }
}

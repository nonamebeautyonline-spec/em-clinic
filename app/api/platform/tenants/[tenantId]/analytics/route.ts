// app/api/platform/tenants/[tenantId]/analytics/route.ts
// プラットフォーム管理: テナント詳細分析API（月別推移データ）

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  const { tenantId } = await params;
  const url = new URL(req.url);
  const months = Math.min(24, Math.max(1, parseInt(url.searchParams.get("months") || "6", 10)));

  try {
    // テナント存在チェック
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "テナントが見つかりません" },
        { status: 404 },
      );
    }

    // 月の配列を生成（直近Nヶ月）
    const monthList: { key: string; start: string; end: string }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
      monthList.push({
        key: `${year}-${month}`,
        start: `${year}-${month}-01T00:00:00`,
        end: `${year}-${month}-${String(lastDay).padStart(2, "0")}T23:59:59`,
      });
    }

    const since = monthList[0].start;

    // 各データを並列取得
    const [patientsRes, ordersRes, reservationsRes, lineFriendsRes] = await Promise.all([
      // 患者数推移
      supabaseAdmin
        .from("patients")
        .select("created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", since),
      // 売上推移
      supabaseAdmin
        .from("orders")
        .select("paid_at, amount")
        .eq("tenant_id", tenantId)
        .not("paid_at", "is", null)
        .gte("paid_at", since),
      // 予約数推移
      supabaseAdmin
        .from("reservations")
        .select("reserved_date")
        .eq("tenant_id", tenantId)
        .gte("reserved_date", monthList[0].key + "-01"),
      // LINE友だち推移
      supabaseAdmin
        .from("patients")
        .select("created_at")
        .eq("tenant_id", tenantId)
        .not("line_id", "is", null)
        .gte("created_at", since),
    ]);

    // 月別に集計
    const monthly = monthList.map((m) => {
      // 患者数: その月に作成された患者数
      const patients = (patientsRes.data || []).filter((p) => {
        const created = p.created_at?.slice(0, 7);
        return created === m.key;
      }).length;

      // 売上: その月のpaid_at合計
      const revenue = (ordersRes.data || [])
        .filter((o) => o.paid_at?.slice(0, 7) === m.key)
        .reduce((sum, o) => sum + (o.amount || 0), 0);

      // 予約数: その月のreserved_date
      const reservations = (reservationsRes.data || []).filter((r) => {
        const rd = r.reserved_date?.slice(0, 7);
        return rd === m.key;
      }).length;

      // LINE友だち: その月に追加されたLINE友だち数
      const lineFriends = (lineFriendsRes.data || []).filter((p) => {
        const created = p.created_at?.slice(0, 7);
        return created === m.key;
      }).length;

      return {
        month: m.key,
        patients,
        revenue,
        reservations,
        lineFriends,
      };
    });

    return NextResponse.json({ ok: true, monthly });
  } catch (err) {
    console.error("[platform/tenants/analytics] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "分析データの取得に失敗しました" },
      { status: 500 },
    );
  }
}

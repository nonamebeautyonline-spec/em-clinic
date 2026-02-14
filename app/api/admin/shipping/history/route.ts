// 過去の発送履歴API（日別集計+詳細）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to");     // YYYY-MM-DD

  if (!from || !to) {
    return NextResponse.json({ error: "from/to required" }, { status: 400 });
  }

  // shipping_dateが設定されている（=発送済み）注文を日付範囲で取得
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("id, patient_id, tracking_number, shipping_date, shipping_name")
    .gte("shipping_date", from)
    .lte("shipping_date", to)
    .not("shipping_date", "is", null)
    .order("shipping_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // patient_idから名前を取得
  const pids = Array.from(new Set((orders || []).map(o => o.patient_id).filter(Boolean)));
  const nameMap: Record<string, string> = {};
  if (pids.length > 0) {
    const { data: patients } = await supabaseAdmin
      .from("intake")
      .select("patient_id, patient_name")
      .in("patient_id", pids);
    for (const p of patients || []) {
      if (!nameMap[p.patient_id]) {
        nameMap[p.patient_id] = p.patient_name || "";
      }
    }
  }

  // 日別に集計
  const dailyMap: Record<string, { patient_id: string; patient_name: string; tracking_number: string }[]> = {};
  for (const o of orders || []) {
    const date = o.shipping_date;
    if (!date) continue;
    if (!dailyMap[date]) dailyMap[date] = [];
    dailyMap[date].push({
      patient_id: o.patient_id,
      patient_name: nameMap[o.patient_id] || o.shipping_name || "",
      tracking_number: o.tracking_number || "",
    });
  }

  // 日付降順でソート
  const days = Object.entries(dailyMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, count: items.length, items }));

  return NextResponse.json({ days });
}

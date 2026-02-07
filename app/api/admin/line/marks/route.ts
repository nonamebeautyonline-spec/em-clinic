import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// 対応マーク一覧（各マークの患者数付き）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("mark_definitions")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // マークごとの患者数を一括取得
  const { data: allPM } = await supabaseAdmin
    .from("patient_marks")
    .select("mark")
    .limit(100000);

  const countMap = new Map<string, number>();
  for (const pm of allPM || []) {
    countMap.set(pm.mark, (countMap.get(pm.mark) || 0) + 1);
  }

  const marks = (data || []).map(m => ({
    ...m,
    patient_count: countMap.get(m.value) || 0,
  }));

  return NextResponse.json({ marks });
}

// 対応マーク作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, color, icon } = await req.json();
  if (!label?.trim()) {
    return NextResponse.json({ error: "選択肢名は必須です" }, { status: 400 });
  }

  // value を label から自動生成（ユニーク）
  const value = `custom_${Date.now()}`;

  // 最大sort_orderを取得
  const { data: maxRow } = await supabaseAdmin
    .from("mark_definitions")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("mark_definitions")
    .insert({ value, label: label.trim(), color: color || "#6B7280", icon: icon || "●", sort_order: nextOrder })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mark: data });
}

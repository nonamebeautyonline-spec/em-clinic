import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { createMarkSchema } from "@/lib/validations/line-common";

// 対応マーク一覧（各マークの患者数付き）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const simple = req.nextUrl.searchParams.get("simple") === "true";

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("mark_definitions")
      .select("*")
      .order("sort_order", { ascending: true }),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // simple=true: 定義のみ返す（カウント不要なページ用）
  if (simple) {
    return NextResponse.json({ marks: data || [] });
  }

  // マークごとの患者数をDB集計で取得（1000行制限を回避）
  const countMap = new Map<string, number>();
  let assignedTotal = 0;
  for (const m of data || []) {
    if (m.value === "none") continue;
    const { count } = await withTenant(
      supabaseAdmin
        .from("patient_marks")
        .select("*", { count: "exact", head: true })
        .eq("mark", m.value),
      tenantId
    );
    const c = count || 0;
    countMap.set(m.value, c);
    assignedTotal += c;
  }

  // 未対応（none）= 全患者 - マーク付き患者数
  const { count: totalPatients } = await withTenant(
    supabaseAdmin
      .from("intake")
      .select("patient_id", { count: "exact", head: true })
      .not("patient_id", "is", null),
    tenantId
  );
  countMap.set("none", (totalPatients || 0) - assignedTotal);

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

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, createMarkSchema);
  if ("error" in parsed) return parsed.error;
  const { label, color, icon } = parsed.data;

  // value を label から自動生成（ユニーク）
  const value = `custom_${Date.now()}`;

  // 最大sort_orderを取得
  const { data: maxRow } = await withTenant(
    supabaseAdmin
      .from("mark_definitions")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1),
    tenantId
  ).single();

  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("mark_definitions")
    .insert({ ...tenantPayload(tenantId), value, label: label.trim(), color: color || "#6B7280", icon: icon || "●", sort_order: nextOrder })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mark: data });
}

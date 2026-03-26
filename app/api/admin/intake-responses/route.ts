// app/api/admin/intake-responses/route.ts — 問診回答一覧API（ページネーション・統計対応）
// GET ?template_id=1&page=1&limit=20        → 回答一覧
// GET ?template_id=1&mode=stats              → 回答統計（概要タブ用）

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import type { IntakeFormField } from "@/lib/intake-form-defaults";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get("template_id");
  const mode = searchParams.get("mode");

  try {
    // テンプレート一覧を取得
    const { data: templates, error: tplError } = await supabaseAdmin
      .from("intake_form_definitions")
      .select("id, name, fields, is_active, created_at")
      .eq("tenant_id", tenantId)
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false });

    if (tplError) {
      console.error("[intake-responses] テンプレート取得エラー:", tplError);
      return serverError("テンプレートの取得に失敗しました");
    }

    // テンプレート選択
    const activeTemplate = templateId
      ? templates?.find((t) => String(t.id) === templateId)
      : templates?.find((t) => t.is_active) || templates?.[0];

    // 総件数（answers が空のレコードを除外）
    const { count, error: countError } = await supabaseAdmin
      .from("intake")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .not("answers", "is", null)
      .neq("answers", "{}");

    if (countError) {
      console.error("[intake-responses] 件数取得エラー:", countError);
      return serverError("問診回答の取得に失敗しました");
    }

    const totalCount = count || 0;

    // 統計モード
    if (mode === "stats") {
      return handleStats(tenantId, totalCount, templates, activeTemplate);
    }

    // 回答一覧モード
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)),
    );
    return handleList(tenantId, totalCount, templates, activeTemplate, page, limit);
  } catch (err) {
    console.error("[intake-responses] 予期しないエラー:", err);
    return serverError("問診回答の取得に失敗しました");
  }
}

// ── 統計モード ──────────────────────────────────────────

async function handleStats(
  tenantId: string,
  totalCount: number,
  templates: { id: number; name: string; fields: unknown; is_active: boolean; created_at: string }[] | null,
  activeTemplate: { id: number; name: string; fields: unknown; is_active: boolean; created_at: string } | undefined,
) {
  // 全回答のanswersを取得（統計用 — answersのみ）
  const allAnswers: Record<string, string>[] = [];
  let offset = 0;
  const PAGE = 5000;
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("intake")
      .select("answers")
      .eq("tenant_id", tenantId)
      .not("answers", "is", null)
      .neq("answers", "{}")
      .range(offset, offset + PAGE - 1);
    if (error) break;
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (row.answers) allAnswers.push(row.answers as Record<string, string>);
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  // フィールド定義から統計を集計
  const fields = (activeTemplate?.fields || []) as IntakeFormField[];
  const fieldStats: {
    fieldId: string;
    label: string;
    type: string;
    counts: { value: string; label: string; count: number }[];
    totalAnswered: number;
  }[] = [];

  for (const field of fields) {
    if (field.type === "heading") continue;

    // 選択肢のあるフィールドのみカウント集計
    if (field.options && field.options.length > 0) {
      const countMap: Record<string, number> = {};
      for (const opt of field.options) {
        countMap[opt.value] = 0;
      }
      let answered = 0;
      for (const ans of allAnswers) {
        const v = ans[field.id];
        if (v !== undefined && v !== null && v !== "") {
          answered++;
          // チェックボックス（カンマ区切り）対応
          const values = field.type === "checkbox" ? v.split(",").map((s: string) => s.trim()) : [v];
          for (const val of values) {
            if (val in countMap) countMap[val]++;
            else countMap[val] = (countMap[val] || 0) + 1;
          }
        }
      }
      fieldStats.push({
        fieldId: field.id,
        label: field.label,
        type: field.type,
        counts: Object.entries(countMap).map(([value, count]) => {
          const opt = field.options!.find((o) => o.value === value);
          return { value, label: opt?.label || value, count };
        }),
        totalAnswered: answered,
      });
    } else {
      // テキスト系フィールドは回答数のみ
      let answered = 0;
      for (const ans of allAnswers) {
        const v = ans[field.id];
        if (v !== undefined && v !== null && v !== "") answered++;
      }
      fieldStats.push({
        fieldId: field.id,
        label: field.label,
        type: field.type,
        counts: [],
        totalAnswered: answered,
      });
    }
  }

  return NextResponse.json({
    templates: (templates || []).map((t) => ({
      id: t.id,
      name: t.name,
      isActive: t.is_active,
    })),
    activeTemplate: activeTemplate
      ? { id: activeTemplate.id, name: activeTemplate.name, fields: activeTemplate.fields, createdAt: activeTemplate.created_at }
      : null,
    totalCount,
    fieldStats,
  });
}

// ── 回答一覧モード ──────────────────────────────────────

async function handleList(
  tenantId: string,
  totalCount: number,
  templates: { id: number; name: string; fields: unknown; is_active: boolean; created_at: string }[] | null,
  activeTemplate: { id: number; name: string; fields: unknown; is_active: boolean; created_at: string } | undefined,
  page: number,
  limit: number,
) {
  const offset = (page - 1) * limit;

  const { data: intakes, error: intakeError } = await supabaseAdmin
    .from("intake")
    .select("id, patient_id, reserve_id, status, answers, note, created_at")
    .eq("tenant_id", tenantId)
    .not("answers", "is", null)
    .neq("answers", "{}")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (intakeError) {
    console.error("[intake-responses] 問診回答取得エラー:", intakeError);
    return serverError("問診回答の取得に失敗しました");
  }

  // 患者情報
  const patientIds = [...new Set((intakes || []).map((i) => i.patient_id).filter(Boolean))];
  const patientsMap: Record<string, { name: string | null; tel: string | null }> = {};

  if (patientIds.length > 0) {
    const { data: pData } = await supabaseAdmin
      .from("patients")
      .select("patient_id, name, tel")
      .eq("tenant_id", tenantId)
      .in("patient_id", patientIds);

    if (pData) {
      for (const p of pData) {
        patientsMap[p.patient_id] = { name: p.name, tel: p.tel };
      }
    }
  }

  // 予約情報
  const reserveIds = [...new Set((intakes || []).map((i) => i.reserve_id).filter(Boolean))];
  const reservationsMap: Record<string, { reserved_date: string | null; prescription_menu: string | null }> = {};

  if (reserveIds.length > 0) {
    const { data: rData } = await supabaseAdmin
      .from("reservations")
      .select("reserve_id, reserved_date, prescription_menu")
      .in("reserve_id", reserveIds);

    if (rData) {
      for (const r of rData) {
        reservationsMap[r.reserve_id] = {
          reserved_date: r.reserved_date,
          prescription_menu: r.prescription_menu,
        };
      }
    }
  }

  const responses = (intakes || []).map((intake) => {
    const patient = patientsMap[intake.patient_id] || {};
    const reservation = intake.reserve_id ? reservationsMap[intake.reserve_id] || {} : {};
    return {
      id: intake.id,
      patientId: intake.patient_id,
      patientName: patient.name || null,
      patientTel: patient.tel || null,
      reservedDate: (reservation as { reserved_date?: string | null }).reserved_date || null,
      prescriptionMenu: (reservation as { prescription_menu?: string | null }).prescription_menu || null,
      status: intake.status,
      answers: intake.answers || {},
      note: intake.note,
      createdAt: intake.created_at,
    };
  });

  return NextResponse.json({
    templates: (templates || []).map((t) => ({
      id: t.id,
      name: t.name,
      isActive: t.is_active,
    })),
    activeTemplate: activeTemplate
      ? { id: activeTemplate.id, name: activeTemplate.name, fields: activeTemplate.fields }
      : null,
    responses,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
}

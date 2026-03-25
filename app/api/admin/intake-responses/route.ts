// app/api/admin/intake-responses/route.ts — 問診回答一覧API（ページネーション対応）
// GET ?template_id=1&page=1&limit=20

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);

  const templateId = searchParams.get("template_id");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)),
  );

  try {
    // テンプレート一覧を取得
    const { data: templates, error: tplError } = await supabaseAdmin
      .from("intake_form_definitions")
      .select("id, name, fields, is_active")
      .eq("tenant_id", tenantId)
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false });

    if (tplError) {
      console.error("[intake-responses] テンプレート取得エラー:", tplError);
      return serverError("テンプレートの取得に失敗しました");
    }

    // テンプレート選択（指定なしの場合はアクティブなもの）
    const activeTemplate = templateId
      ? templates?.find((t) => String(t.id) === templateId)
      : templates?.find((t) => t.is_active) || templates?.[0];

    // 件数を取得
    const { count, error: countError } = await supabaseAdmin
      .from("intake")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    if (countError) {
      console.error("[intake-responses] 件数取得エラー:", countError);
      return serverError("問診回答の取得に失敗しました");
    }

    const totalCount = count || 0;
    const offset = (page - 1) * limit;

    // 問診回答を取得（ページ単位）
    const { data: intakes, error: intakeError } = await supabaseAdmin
      .from("intake")
      .select("id, patient_id, reserve_id, status, answers, note, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (intakeError) {
      console.error("[intake-responses] 問診回答取得エラー:", intakeError);
      return serverError("問診回答の取得に失敗しました");
    }

    // 患者情報を取得
    const patientIds = [...new Set((intakes || []).map((i) => i.patient_id).filter(Boolean))];
    let patientsMap: Record<string, { name: string | null; tel: string | null }> = {};

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

    // 予約情報を取得
    const reserveIds = [...new Set((intakes || []).map((i) => i.reserve_id).filter(Boolean))];
    let reservationsMap: Record<string, { reserved_date: string | null; prescription_menu: string | null }> = {};

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

    // レスポンス組み立て
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
        ? {
            id: activeTemplate.id,
            name: activeTemplate.name,
            fields: activeTemplate.fields,
          }
        : null,
      responses,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    console.error("[intake-responses] 予期しないエラー:", err);
    return serverError("問診回答の取得に失敗しました");
  }
}

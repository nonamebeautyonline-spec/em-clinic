// app/api/admin/ehr/export-csv/route.ts — CSVエクスポート
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { parseBody } from "@/lib/validations/helpers";
import { ehrCsvExportSchema } from "@/lib/validations/ehr";
import { toEhrPatient, toEhrKarte } from "@/lib/ehr/mapper";
import { generatePatientCsv, generateKarteCsv } from "@/lib/ehr/csv-adapter";
import type { EhrPatient, EhrKarte } from "@/lib/ehr/types";

/**
 * POST: CSVエクスポート
 * body: { type: "patient" | "karte", patient_ids?: string[] }
 * CSV文字列をレスポンスとして返す
 */
export async function POST(req: NextRequest) {
  // 管理者認証
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  // リクエストボディのバリデーション
  const parsed = await parseBody(req, ehrCsvExportSchema);
  if (parsed.error) return parsed.error;

  const { type, patient_ids } = parsed.data;

  try {
    // 現在の日時をファイル名に使用
    const timestamp = new Date().toISOString().slice(0, 10);

    if (type === "patient") {
      // 患者データ取得
      let query = supabaseAdmin.from("patients").select("*");
      query = withTenant(query, tenantId);

      // patient_ids が指定されている場合はフィルタ
      if (patient_ids && patient_ids.length > 0) {
        query = query.in("patient_id", patient_ids);
      }

      const { data: patients, error } = await query;
      if (error) {
        return NextResponse.json(
          { error: `データ取得に失敗しました: ${error.message}` },
          { status: 500 },
        );
      }

      // EhrPatient形式に変換
      const ehrPatients: EhrPatient[] = (patients || []).map((p) =>
        toEhrPatient(p, null),
      );

      // CSV生成
      const csv = generatePatientCsv(ehrPatients);

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="patients_${timestamp}.csv"`,
        },
      });
    } else {
      // カルテデータ取得（intakeテーブルからnote有りレコード）
      let query = supabaseAdmin
        .from("intake")
        .select("*, patients!inner(patient_id, name, name_kana, sex, birthday, tel)")
        .not("note", "is", null)
        .order("created_at", { ascending: false });

      query = withTenant(query, tenantId);

      // patient_ids が指定されている場合はフィルタ
      if (patient_ids && patient_ids.length > 0) {
        query = query.in("patient_id", patient_ids);
      }

      const { data: intakes, error } = await query;
      if (error) {
        return NextResponse.json(
          { error: `データ取得に失敗しました: ${error.message}` },
          { status: 500 },
        );
      }

      // EhrKarte形式に変換
      const ehrKartes: EhrKarte[] = (intakes || []).map((intake: any) => {
        const patient = intake.patients || {
          patient_id: intake.patient_id,
          name: null,
        };
        return toEhrKarte(intake, patient);
      });

      // CSV生成
      const csv = generateKarteCsv(ehrKartes);

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="kartes_${timestamp}.csv"`,
        },
      });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "CSVエクスポートに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

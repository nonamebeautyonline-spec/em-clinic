// app/api/admin/karte/[id]/pdf/route.ts
// カルテPDFダウンロードAPI

import { NextRequest, NextResponse } from "next/server";
import { unauthorized, notFound, serverError } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { generateKartePDF } from "@/lib/karte-pdf";
import type { KarteSoapData, KarteVitalData } from "@/lib/karte-pdf";
import { parseJsonToSoap } from "@/lib/soap-parser";

export const dynamic = "force-dynamic";

/**
 * GET: カルテPDFダウンロード
 * intakeのIDからカルテ情報を取得してPDFを生成
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 管理者認証
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantId(req);
    const { id } = await params;
    const intakeId = Number(id);

    if (!intakeId || isNaN(intakeId)) {
      return notFound("カルテIDが不正です");
    }

    // intakeデータ取得
    const intakeQuery = supabaseAdmin
      .from("intake")
      .select("id, patient_id, note, note_format, prescription_menu, reserved_date, reserved_time, status, created_at, answers")
      .eq("id", intakeId);

    const { data: intake, error: intakeErr } = await withTenant(intakeQuery, tenantId).maybeSingle();

    if (intakeErr) {
      console.error("[karte/pdf] intake取得エラー:", intakeErr);
      return serverError("カルテデータの取得に失敗しました");
    }

    if (!intake) {
      return notFound("カルテが見つかりません");
    }

    // 患者情報取得
    let patientName = "-";
    let clinicName = "Clinic";

    if (intake.patient_id) {
      const patientQuery = supabaseAdmin
        .from("patients")
        .select("name")
        .eq("patient_id", intake.patient_id)
        .limit(1);

      const { data: patient } = await withTenant(patientQuery, tenantId).maybeSingle();
      if (patient?.name) {
        patientName = patient.name;
      }
    }

    // テナント名をクリニック名として使用
    if (tenantId) {
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("name")
        .eq("id", tenantId)
        .maybeSingle();
      if (tenant?.name) {
        clinicName = tenant.name;
      }
    }

    // SOAP構造のパース
    let soap: KarteSoapData = { s: "", o: "", a: "", p: "" };
    if (intake.note) {
      if (intake.note_format === "soap") {
        const parsed = parseJsonToSoap(intake.note);
        soap = { s: parsed.s, o: parsed.o, a: parsed.a, p: parsed.p };
      } else {
        soap = { s: intake.note, o: "", a: "", p: "" };
      }
    }

    // バイタル取得（直近1件）
    let vitals: KarteVitalData | null = null;
    if (intake.patient_id) {
      try {
        const vitalsQuery = supabaseAdmin
          .from("patient_vitals")
          .select("measured_at, height, weight, bmi, systolic, diastolic, pulse, temperature")
          .eq("patient_id", intake.patient_id)
          .order("measured_at", { ascending: false })
          .limit(1);

        const { data: vitalsData } = await withTenant(vitalsQuery, tenantId);
        if (vitalsData && vitalsData.length > 0) {
          const v = vitalsData[0];
          vitals = {
            measuredAt: v.measured_at ? v.measured_at.split("T")[0] : "",
            height: v.height,
            weight: v.weight,
            bmi: v.bmi,
            systolic: v.systolic,
            diastolic: v.diastolic,
            pulse: v.pulse,
            temperature: v.temperature,
          };
        }
      } catch {
        // patient_vitalsテーブル未作成時は無視
      }
    }

    // 写真URL取得
    let imageUrls: string[] = [];
    try {
      const imagesQuery = supabaseAdmin
        .from("karte_images")
        .select("url")
        .eq("intake_id", intakeId)
        .order("created_at", { ascending: true });

      const { data: images } = await withTenant(imagesQuery, tenantId);
      if (images) {
        imageUrls = images.map((img: { url: string }) => img.url).filter(Boolean);
      }
    } catch {
      // karte_imagesテーブル未作成時は無視
    }

    // 日付フォーマット
    const formatDate = (isoString: string | null): string => {
      if (!isoString) return "-";
      return isoString.split("T")[0];
    };

    // PDF生成
    const pdfBuffer = generateKartePDF({
      clinicName,
      patientName,
      patientId: intake.patient_id || "-",
      date: formatDate(intake.created_at),
      soap,
      prescriptionMenu: intake.prescription_menu || null,
      vitals,
      templateName: null, // テンプレート名はintakeに保存されていないため省略
      imageUrls,
      reservedDate: intake.reserved_date || null,
      reservedTime: intake.reserved_time || null,
      status: intake.status || null,
    });

    // PDFレスポンス
    const body = new Uint8Array(pdfBuffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="karte-${intakeId}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("[karte/pdf] 予期しないエラー:", err);
    return serverError("PDF生成中にエラーが発生しました");
  }
}

// テンプレート変数プレビューAPI
// テンプレート内容の変数を実データまたはサンプルデータで置換して返す
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { templatePreviewSchema } from "@/lib/validations/template-preview";

/** 今日の日付をフォーマット */
function formatToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

/** サンプルデータ（患者未指定時に使用） */
function getSampleData() {
  return {
    name: "田中太郎",
    patient_id: "SAMPLE-001",
    send_date: formatToday(),
    next_reservation_date: "2026/03/01",
    next_reservation_time: "14:00",
  };
}

/** テンプレート変数を置換 */
function replaceVariables(
  templateContent: string,
  vars: Record<string, string>,
): string {
  let result = templateContent;
  result = result.replace(/\{name\}/g, vars.name || "");
  result = result.replace(/\{patient_id\}/g, vars.patient_id || "");
  result = result.replace(/\{send_date\}/g, vars.send_date || "");
  result = result.replace(/\{next_reservation_date\}/g, vars.next_reservation_date || "");
  result = result.replace(/\{next_reservation_time\}/g, vars.next_reservation_time || "");
  return result;
}

export async function POST(req: NextRequest) {
  // 認証チェック
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  // リクエストボディのバリデーション
  const parsed = await parseBody(req, templatePreviewSchema);
  if ("error" in parsed) return parsed.error;

  const { template_content, patient_id } = parsed.data;

  // 患者IDが未指定 → サンプルデータで置換
  if (!patient_id) {
    const sample = getSampleData();
    const preview = replaceVariables(template_content, sample);
    return NextResponse.json({
      ok: true,
      preview,
      variables: sample,
      source: "sample",
    });
  }

  // 患者IDが指定されている場合 → 実データで置換
  try {
    // 患者情報を取得
    const { data: patient } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("name, patient_id")
        .eq("patient_id", patient_id)
        .maybeSingle(),
      tenantId,
    );

    if (!patient) {
      return NextResponse.json(
        { error: "指定された患者が見つかりません" },
        { status: 404 },
      );
    }

    // 次回予約を取得（将来日の最も近い予約）
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const { data: nextReservation } = await withTenant(
      supabaseAdmin
        .from("reservations")
        .select("reserved_date, reserved_time")
        .eq("patient_id", patient_id)
        .gte("reserved_date", today)
        .neq("status", "canceled")
        .order("reserved_date", { ascending: true })
        .order("reserved_time", { ascending: true })
        .limit(1)
        .maybeSingle(),
      tenantId,
    );

    // 予約日のフォーマット（YYYY-MM-DD → YYYY/MM/DD）
    const reservationDate = nextReservation?.reserved_date
      ? nextReservation.reserved_date.replace(/-/g, "/")
      : "未定";
    const reservationTime = nextReservation?.reserved_time || "未定";

    const vars = {
      name: patient.name || "",
      patient_id: patient.patient_id || "",
      send_date: formatToday(),
      next_reservation_date: reservationDate,
      next_reservation_time: reservationTime,
    };

    const preview = replaceVariables(template_content, vars);

    return NextResponse.json({
      ok: true,
      preview,
      variables: vars,
      source: "patient",
    });
  } catch (error) {
    console.error("テンプレートプレビューエラー:", error);
    return NextResponse.json(
      { error: "プレビュー生成中にエラーが発生しました" },
      { status: 500 },
    );
  }
}

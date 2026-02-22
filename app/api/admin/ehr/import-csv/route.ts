// app/api/admin/ehr/import-csv/route.ts — CSVインポート
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, tenantPayload } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { parsePatientCsv, parseKarteCsv } from "@/lib/ehr/csv-adapter";
import { fromEhrPatient, fromEhrKarte } from "@/lib/ehr/mapper";
import { normalizeJPPhone } from "@/lib/phone";

/**
 * POST: CSVファイルをインポート
 * FormDataで受信: file (CSVファイル), type ("patient" | "karte")
 */
export async function POST(req: NextRequest) {
  // 管理者認証
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  try {
    // FormDataからファイルとタイプを取得
    const formData = await req.formData();
    const file = formData.get("file");
    const type = formData.get("type") as string;

    // バリデーション
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "CSVファイルが指定されていません" },
        { status: 400 },
      );
    }

    if (type !== "patient" && type !== "karte") {
      return NextResponse.json(
        { error: "typeは「patient」または「karte」を指定してください" },
        { status: 400 },
      );
    }

    // ファイルをテキストに変換
    const text = await file.text();
    if (!text.trim()) {
      return NextResponse.json(
        { error: "CSVファイルが空です" },
        { status: 400 },
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    if (type === "patient") {
      // 患者CSVインポート
      const patients = parsePatientCsv(text);

      for (const ehrPatient of patients) {
        try {
          const updates = fromEhrPatient(ehrPatient);

          // 電話番号の正規化（fromEhrPatient内でも行われるが明示的に再確認）
          if (updates.tel) {
            updates.tel = normalizeJPPhone(updates.tel);
          }

          // 外部IDで既存患者を検索
          const { data: existing } = await supabaseAdmin
            .from("patients")
            .select("patient_id")
            .eq("patient_id", ehrPatient.externalId)
            .maybeSingle();

          if (existing) {
            // 既存患者を更新
            await supabaseAdmin
              .from("patients")
              .update({ ...updates, updated_at: new Date().toISOString() })
              .eq("patient_id", existing.patient_id);
          } else {
            // 新規患者として登録
            await supabaseAdmin.from("patients").insert({
              patient_id: ehrPatient.externalId,
              ...updates,
              ...tenantPayload(tenantId),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          imported++;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`患者「${ehrPatient.name}」(ID: ${ehrPatient.externalId}): ${msg}`);
          skipped++;
        }
      }
    } else {
      // カルテCSVインポート
      const kartes = parseKarteCsv(text);

      for (const ehrKarte of kartes) {
        try {
          const { note } = fromEhrKarte(ehrKarte);

          if (!note) {
            skipped++;
            continue;
          }

          // intakeにINSERT
          await supabaseAdmin.from("intake").insert({
            patient_id: ehrKarte.patientExternalId,
            note,
            status: "OK",
            ...tenantPayload(tenantId),
            created_at: ehrKarte.date
              ? new Date(ehrKarte.date).toISOString()
              : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          imported++;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`カルテ(患者ID: ${ehrKarte.patientExternalId}, 日付: ${ehrKarte.date}): ${msg}`);
          skipped++;
        }
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "CSVインポートに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

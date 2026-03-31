// app/api/admin/hotpepper/import-csv/route.ts — SALON BOARD CSVインポートAPI
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, tenantPayload } from "@/lib/tenant";
import { parseHotpepperCsv } from "@/lib/hotpepper-csv-parser";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  // 管理者認証
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return badRequest("CSVファイルが指定されていません");
    }

    const text = await file.text();
    if (!text.trim()) {
      return badRequest("CSVファイルが空です");
    }

    const reservations = parseHotpepperCsv(text);
    if (reservations.length === 0) {
      return badRequest("CSVにデータ行がありません");
    }

    // テナントの全患者を取得してJSでマッチング（.in()はURL長制限のため使わない）
    const { data: allPatients } = await supabaseAdmin
      .from("patients")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .limit(100000);

    // テナントの全スタイリストを取得
    const { data: allStylists } = await supabaseAdmin
      .from("stylists")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .limit(10000);

    const patients = allPatients || [];
    const stylists = allStylists || [];

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < reservations.length; idx++) {
      const res = reservations[idx];
      const rowNum = idx + 2; // ヘッダー行+1始まり

      try {
        // お客様名が空ならスキップ
        if (!res.customerName) {
          errors.push(`行${rowNum}: お客様名が空です`);
          skipped++;
          continue;
        }

        // 患者検索（名前部分一致）
        const matchedPatient = patients.find(
          (p) => p.name && p.name.includes(res.customerName),
        );
        if (!matchedPatient) {
          errors.push(`行${rowNum}: 患者「${res.customerName}」が見つかりません`);
          skipped++;
          continue;
        }

        const patientId = matchedPatient.id;

        // スタイリスト検索（完全一致 → 部分一致）
        let stylistId: string | null = null;
        if (res.staffName) {
          const exact = stylists.find((s) => s.name === res.staffName);
          if (exact) {
            stylistId = exact.id;
          } else {
            const partial = stylists.find(
              (s) => s.name && s.name.includes(res.staffName),
            );
            if (partial) stylistId = partial.id;
          }
        }

        // 重複チェック: 同日・同患者で既存レコードがあればスキップ
        const { data: existing } = await supabaseAdmin
          .from("salon_visits")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("patient_id", patientId)
          .eq("visit_date", res.reserveDate)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // salon_visitsにINSERT
        const { error: insertError } = await supabaseAdmin
          .from("salon_visits")
          .insert({
            ...tenantPayload(tenantId),
            patient_id: patientId,
            stylist_id: stylistId,
            visit_date: res.reserveDate,
            menu_items: JSON.stringify([{ name: res.menuName, price: res.amount }]),
            total_amount: res.amount,
            payment_method: "cash",
            notes: res.notes || null,
          });

        if (insertError) {
          errors.push(`行${rowNum}: ${insertError.message}`);
          skipped++;
          continue;
        }

        imported++;
      } catch (e) {
        errors.push(`行${rowNum}: ${e instanceof Error ? e.message : String(e)}`);
        skipped++;
      }
    }

    logAudit(req, "hotpepper.import_csv", "salon_visits", "import", {
      imported,
      skipped,
      total: reservations.length,
    });

    return NextResponse.json({
      ok: true,
      imported,
      skipped,
      errors,
      total: reservations.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "CSVインポートに失敗しました";
    return serverError(message);
  }
}

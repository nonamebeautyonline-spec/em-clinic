// app/api/admin/ehr/sync/route.ts — 電子カルテ手動同期
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { ehrSyncSchema } from "@/lib/validations/ehr";
import {
  createAdapter,
  pushPatient,
  pullPatient,
  pushKarte,
  pullKarte,
} from "@/lib/ehr/sync";
import type { SyncResult } from "@/lib/ehr/types";

/**
 * POST: 手動同期
 * patient_ids / direction / resource_type に応じて
 * push/pull x patient/karte の組み合わせで同期を実行する
 */
export async function POST(req: NextRequest) {
  // 管理者認証
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  // リクエストボディのバリデーション
  const parsed = await parseBody(req, ehrSyncSchema);
  if (parsed.error) return parsed.error;

  const { patient_ids, direction, resource_type } = parsed.data;

  try {
    // アダプター生成
    const adapter = await createAdapter(tenantId ?? undefined);
    if (!adapter) {
      return NextResponse.json(
        { error: "EHRプロバイダーが設定されていません" },
        { status: 400 },
      );
    }

    const results: SyncResult[] = [];

    for (const id of patient_ids) {
      // 患者同期（resource_type が "patient" または "both"）
      if (resource_type === "patient" || resource_type === "both") {
        if (direction === "push") {
          // pushの場合: patient_ids はLオペ内部IDとして扱う
          results.push(await pushPatient(id, adapter, tenantId ?? undefined));
        } else {
          // pullの場合: patient_ids は外部IDとして扱う
          results.push(await pullPatient(id, adapter, tenantId ?? undefined));
        }
      }

      // カルテ同期（resource_type が "karte" または "both"）
      if (resource_type === "karte" || resource_type === "both") {
        if (direction === "push") {
          results.push(await pushKarte(id, adapter, tenantId ?? undefined));
        } else {
          // pullKarteはLオペ内部IDを使用
          results.push(await pullKarte(id, adapter, tenantId ?? undefined));
        }
      }
    }

    return NextResponse.json({ results });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "同期処理に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

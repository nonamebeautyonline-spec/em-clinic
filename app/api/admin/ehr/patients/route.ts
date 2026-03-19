// app/api/admin/ehr/patients/route.ts — 外部カルテ患者検索
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { ehrPatientSearchSchema } from "@/lib/validations/ehr";
import { createAdapter } from "@/lib/ehr/sync";

/**
 * GET: 外部カルテから患者を検索
 * クエリパラメータ: name, tel, birthday
 */
export async function GET(req: NextRequest) {
  // 管理者認証
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  // クエリパラメータのバリデーション
  const url = new URL(req.url);
  const rawQuery = {
    name: url.searchParams.get("name") || undefined,
    tel: url.searchParams.get("tel") || undefined,
    birthday: url.searchParams.get("birthday") || undefined,
  };

  const parseResult = ehrPatientSearchSchema.safeParse(rawQuery);
  if (!parseResult.success) {
    const messages = parseResult.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`,
    );
    return NextResponse.json({ ok: false, error: "検索パラメータが不正です", details: messages }, { status: 400 });
  }

  const query = parseResult.data;

  try {
    // アダプター生成
    const adapter = await createAdapter(tenantId ?? undefined);
    if (!adapter) {
      return badRequest("EHRプロバイダーが設定されていません");
    }

    // 外部カルテで患者検索
    const patients = await adapter.searchPatients(query);

    return NextResponse.json({ patients });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "患者検索に失敗しました";
    return serverError(message);
  }
}

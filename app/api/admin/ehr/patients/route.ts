// app/api/admin/ehr/patients/route.ts — 外部カルテ患者検索
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

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
    return NextResponse.json(
      { error: "検索パラメータが不正です", details: messages },
      { status: 400 },
    );
  }

  const query = parseResult.data;

  try {
    // アダプター生成
    const adapter = await createAdapter(tenantId ?? undefined);
    if (!adapter) {
      return NextResponse.json(
        { error: "EHRプロバイダーが設定されていません" },
        { status: 400 },
      );
    }

    // 外部カルテで患者検索
    const patients = await adapter.searchPatients(query);

    return NextResponse.json({ patients });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "患者検索に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

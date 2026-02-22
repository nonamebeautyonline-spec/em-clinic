// app/api/admin/ehr/test-connection/route.ts — 電子カルテ接続テスト
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { ehrTestConnectionSchema } from "@/lib/validations/ehr";
import { createAdapter } from "@/lib/ehr/sync";

/**
 * POST: 電子カルテ接続テスト
 * 指定されたプロバイダーでアダプターを生成し、接続テストを実行する
 */
export async function POST(req: NextRequest) {
  // 管理者認証
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  // リクエストボディのバリデーション
  const parsed = await parseBody(req, ehrTestConnectionSchema);
  if (parsed.error) return parsed.error;

  const { provider } = parsed.data;

  try {
    // アダプター生成
    const adapter = await createAdapter(tenantId ?? undefined);
    if (!adapter) {
      return NextResponse.json(
        { ok: false, message: `プロバイダー「${provider}」の設定が見つかりません。先にEHR設定を行ってください` },
        { status: 400 },
      );
    }

    // 接続テスト実行
    const result = await adapter.testConnection();

    return NextResponse.json({ ok: result.ok, message: result.message });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "接続テストに失敗しました";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

// app/api/admin/shared-templates/[id]/import/route.ts
// テナント側: 共有テンプレートを自テナントのmessage_templatesにインポート

import { NextRequest, NextResponse } from "next/server";
import { forbidden, notFound, serverError, badRequest } from "@/lib/api-error";
import { verifyAdminAuth, getAdminTenantId } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

/**
 * POST: 共有テンプレートを自テナントにインポート
 * 共有テンプレートの内容をmessage_templatesにコピーする
 */
export async function POST(req: NextRequest, { params }: Params) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) return forbidden("権限がありません");

  const { id } = await params;
  if (!id) return badRequest("IDが必要です");

  const tenantId = await getAdminTenantId(req);

  try {
    // 共有テンプレートを取得（有効なもののみ）
    const { data: shared, error: fetchError } = await supabaseAdmin
      .from("shared_templates")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (fetchError || !shared) {
      return notFound("共有テンプレートが見つかりません");
    }

    // テンプレートタイプに応じたmessage_type決定
    const messageType = shared.template_type === "flex" ? "flex" : "text";

    // message_templatesにインポート
    const insertData: Record<string, unknown> = {
      ...tenantPayload(tenantId),
      name: shared.name,
      content: shared.content?.text || shared.description || "",
      message_type: messageType,
      category: shared.category || "未分類",
    };

    // flex_contentがある場合は設定
    if (shared.template_type === "flex" && shared.content) {
      insertData.flex_content = shared.content;
    }

    const { data: imported, error: insertError } = await supabaseAdmin
      .from("message_templates")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("[admin/shared-templates/[id]/import] INSERT error:", insertError);
      return serverError(`テンプレートのインポートに失敗しました: ${insertError.message}`);
    }

    // 監査ログ（fire-and-forget）
    logAudit(req, "import_shared_template", "message_template", imported.id, {
      shared_template_id: id,
      shared_template_name: shared.name,
    });

    return NextResponse.json({
      ok: true,
      template: imported,
      message: `「${shared.name}」をインポートしました`,
    }, { status: 201 });
  } catch (err) {
    console.error("[admin/shared-templates/[id]/import] POST unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}

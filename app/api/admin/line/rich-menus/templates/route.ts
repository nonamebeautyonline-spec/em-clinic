// app/api/admin/line/rich-menus/templates/route.ts
// リッチメニューテンプレートプリセット一覧API
//
// テナントの業種（industry）に応じてフィルタしたテンプレートを返す。
// テンプレートはDBではなくコード内定義（lib/salon-richmenu-templates.ts）。

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { getTemplatesForIndustry, getTemplateById } from "@/lib/salon-richmenu-templates";
import type { Industry } from "@/lib/feature-flags";

// テンプレート一覧取得（業種フィルタ付き）
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req);

    // テナントの業種を取得
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("industry")
      .eq("id", tenantId)
      .maybeSingle();

    const industry: Industry = (tenant?.industry as Industry) ?? "clinic";

    // クエリパラメータで特定テンプレートを指定可能
    const templateId = req.nextUrl.searchParams.get("id");
    if (templateId) {
      const template = getTemplateById(templateId);
      if (!template) {
        return NextResponse.json({ error: "テンプレートが見つかりません" }, { status: 404 });
      }
      return NextResponse.json({ template });
    }

    // 業種に応じたテンプレート一覧を返す
    const templates = getTemplatesForIndustry(industry);

    return NextResponse.json({ templates, industry });
  } catch (e) {
    console.error("[RichMenu Templates GET] Error:", (e as Error).message || e);
    return serverError("サーバーエラーが発生しました");
  }
}

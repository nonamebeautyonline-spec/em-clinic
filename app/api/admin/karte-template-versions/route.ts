// カルテテンプレートバージョン履歴API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

// バージョン履歴一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const templateId = req.nextUrl.searchParams.get("template_id");
  if (!templateId) {
    return badRequest("template_id は必須です");
  }

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("karte_template_versions")
      .select("id, template_id, version, name, category, body, changed_by, created_at")
      .eq("template_id", parseInt(templateId))
      .order("version", { ascending: false }),
    tenantId,
  );

  if (error) return serverError(error.message);

  return NextResponse.json({ ok: true, versions: data || [] });
}

const restoreSchema = z.object({
  template_id: z.number(),
  version_id: z.number(),
});

// 旧バージョンに復元
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, restoreSchema);
  if ("error" in parsed) return parsed.error;
  const { template_id, version_id } = parsed.data;

  // 復元元のバージョンを取得
  const { data: version } = await withTenant(
    supabaseAdmin
      .from("karte_template_versions")
      .select("body, name, category")
      .eq("id", version_id)
      .eq("template_id", template_id),
    tenantId,
  ).single();

  if (!version) {
    return notFound("バージョンが見つかりません");
  }

  // 現在のテンプレートをバージョン履歴に保存（復元前）
  const { data: current } = await withTenant(
    supabaseAdmin
      .from("karte_templates")
      .select("id, name, category, body, current_version")
      .eq("id", template_id),
    tenantId,
  ).single();

  if (current) {
    await supabaseAdmin.from("karte_template_versions").insert({
      template_id: current.id,
      version: current.current_version || 1,
      name: current.name,
      category: current.category || "general",
      body: current.body,
      changed_by: "復元",
      ...tenantPayload(tenantId),
    });
  }

  // テンプレート本体を復元版で更新
  const newVersion = (current?.current_version || 1) + 1;
  const { data: updated, error } = await withTenant(
    supabaseAdmin
      .from("karte_templates")
      .update({
        body: version.body,
        name: version.name,
        current_version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", template_id)
      .select(),
    tenantId,
  ).single();

  if (error) return serverError(error.message);

  return NextResponse.json({ ok: true, template: updated });
}

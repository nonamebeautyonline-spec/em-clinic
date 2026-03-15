import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { createTemplateSchema } from "@/lib/validations/line-common";

// テンプレート一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin.from("message_templates").select("*").order("updated_at", { ascending: false }),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ templates: data });
}

// テンプレート作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, createTemplateSchema);
  if ("error" in parsed) return parsed.error;
  const { name, content, message_type, category, flex_content, imagemap_actions } = parsed.data;

  // flex/imagemap テンプレートはcontent不要の場合がある
  if (message_type !== "flex" && message_type !== "imagemap" && !content?.trim()) {
    return badRequest("内容は必須です");
  }

  const { data, error } = await supabaseAdmin
    .from("message_templates")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      content: content?.trim() || "",
      message_type: message_type || "text",
      category,
      flex_content: flex_content || null,
      imagemap_actions: imagemap_actions || null,
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ template: data });
}

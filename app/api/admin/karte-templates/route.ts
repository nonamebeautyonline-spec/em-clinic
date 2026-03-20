// カルテテンプレート CRUD API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { karteTemplateCreateSchema, karteTemplateUpdateSchema } from "@/lib/validations/admin-operations";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// 一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("karte_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    tenantId
  );

  if (error) {
    // テーブルが存在しない場合はデフォルトテンプレートを返す
    if (error.message.includes("does not exist")) {
      return NextResponse.json({
        ok: true,
        templates: getDefaultTemplates(),
        fromDefaults: true,
      });
    }
    return serverError(error.message);
  }

  // テンプレートが0件ならデフォルトを返す
  if (!data || data.length === 0) {
    return NextResponse.json({
      ok: true,
      templates: getDefaultTemplates(),
      fromDefaults: true,
    });
  }

  return NextResponse.json({ ok: true, templates: data });
}

// テンプレート作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const parsed = await parseBody(req, karteTemplateCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("karte_templates")
    .insert({
      ...tenantPayload(tenantId),
      name: body.name,
      category: body.category || "general",
      body: body.body,
      sort_order: body.sort_order || 0,
    })
    .select()
    .single();

  if (error)
    return serverError(error.message);

  logAudit(req, "karte_template.create", "karte_template", "unknown");
  return NextResponse.json({ ok: true, template: data });
}

// テンプレート更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const parsed = await parseBody(req, karteTemplateUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  // body 変更時は更新前のバージョンを保存
  if (body.body !== undefined) {
    const { data: current } = await strictWithTenant(
      supabaseAdmin
        .from("karte_templates")
        .select("id, name, category, body, current_version")
        .eq("id", body.id),
      tenantId,
    ).single();

    if (current) {
      await supabaseAdmin.from("karte_template_versions").insert({
        template_id: current.id,
        version: current.current_version || 1,
        name: current.name,
        category: current.category || "general",
        body: current.body,
        ...tenantPayload(tenantId),
      });
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.name !== undefined) updates.name = body.name;
  if (body.body !== undefined) updates.body = body.body;
  if (body.category !== undefined) updates.category = body.category;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  // body 変更時はバージョンインクリメント
  if (body.body !== undefined) {
    const { data: cur } = await strictWithTenant(
      supabaseAdmin.from("karte_templates").select("current_version").eq("id", body.id),
      tenantId,
    ).single();
    updates.current_version = (cur?.current_version || 1) + 1;
  }

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("karte_templates")
      .update(updates)
      .eq("id", body.id)
      .select(),
    tenantId
  ).single();

  if (error)
    return serverError(error.message);

  logAudit(req, "karte_template.update", "karte_template", String(body.id));
  return NextResponse.json({ ok: true, template: data });
}

// テンプレート削除（論理削除）
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return badRequest("id は必須です");
  }

  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("karte_templates")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", parseInt(id)),
    tenantId
  );

  if (error)
    return serverError(error.message);

  logAudit(req, "karte_template.delete", "karte_template", "unknown");
  return NextResponse.json({ ok: true });
}

// デフォルトテンプレート（テーブル未作成時のフォールバック）
function getDefaultTemplates() {
  return [
    {
      id: "default-1",
      name: "日時",
      category: "general",
      body: "{{date}}",
      sort_order: 1,
    },
    {
      id: "default-2",
      name: "副作用説明",
      category: "glp1",
      body: "嘔気・嘔吐や低血糖に関する副作用の説明を行った。",
      sort_order: 2,
    },
    {
      id: "default-3",
      name: "使用方法",
      category: "glp1",
      body: "使用方法に関して説明を実施し、パンフレットの案内を行った。",
      sort_order: 3,
    },
    {
      id: "default-4",
      name: "処方方針",
      category: "glp1",
      body: "以上より上記の用量の処方を行う方針とした。",
      sort_order: 4,
    },
    {
      id: "default-5",
      name: "不通",
      category: "general",
      body: "診療予定時間に架電するも繋がらず",
      sort_order: 5,
    },
    {
      id: "default-6",
      name: "初診カルテ（全文）",
      category: "glp1",
      body: "{{date}}\n問診内容を確認し、GLP-1受容体作動薬（マンジャロ）の処方について診察を行った。\n嘔気・嘔吐や低血糖に関する副作用の説明を行った。\n使用方法に関して説明を実施し、パンフレットの案内を行った。\n以上より上記の用量の処方を行う方針とした。",
      sort_order: 6,
    },
    {
      id: "default-7",
      name: "再診カルテ（経過良好）",
      category: "glp1",
      body: "{{date}}\n前回処方からの経過を確認。副作用の訴えなし。\n体重の推移を確認し、治療効果を評価した。\n継続処方の方針とした。",
      sort_order: 7,
    },
    {
      id: "default-8",
      name: "体重・BMI記録",
      category: "measurement",
      body: "【体重・BMI記録】\n体重: ___kg\nBMI: ___\n前回比: ___kg（±）\n腹囲: ___cm",
      sort_order: 8,
    },
  ];
}

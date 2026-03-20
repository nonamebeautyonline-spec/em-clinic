// app/api/admin/line/coupons/distribution-rules/route.ts — クーポン自動配布ルール CRUD（一覧/作成）
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

// 有効なトリガータイプ
const VALID_TRIGGER_TYPES = ["birthday", "first_purchase_days", "nth_visit", "tag_added"] as const;
type TriggerType = (typeof VALID_TRIGGER_TYPES)[number];

function isValidTriggerType(t: string): t is TriggerType {
  return (VALID_TRIGGER_TYPES as readonly string[]).includes(t);
}

// ルール一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data: rules, error } = await strictWithTenant(
    supabaseAdmin
      .from("coupon_distribution_rules")
      .select("*, coupons(id, name, code, discount_type, discount_value)")
      .order("created_at", { ascending: false }),
    tenantId
  );

  if (error) return serverError(error.message);

  return NextResponse.json({ rules: rules || [] });
}

// ルール作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  const { name, coupon_id, trigger_type, trigger_config } = body as {
    name?: string;
    coupon_id?: number;
    trigger_type?: string;
    trigger_config?: Record<string, unknown>;
  };

  // バリデーション
  if (!name?.trim()) return badRequest("ルール名は必須です");
  if (!coupon_id) return badRequest("クーポンIDは必須です");
  if (!trigger_type || !isValidTriggerType(trigger_type)) {
    return badRequest("トリガータイプが不正です");
  }

  // トリガー設定のバリデーション
  const config = trigger_config || {};
  if (trigger_type === "first_purchase_days" && !config.days_after) {
    return badRequest("経過日数は必須です");
  }
  if (trigger_type === "nth_visit" && !config.visit_count) {
    return badRequest("来院回数は必須です");
  }
  if (trigger_type === "tag_added" && !config.tag_name) {
    return badRequest("タグ名は必須です");
  }

  // クーポン存在チェック
  const { data: coupon } = await strictWithTenant(
    supabaseAdmin.from("coupons").select("id").eq("id", coupon_id).single(),
    tenantId
  );
  if (!coupon) return badRequest("指定されたクーポンが見つかりません");

  const { data: rule, error } = await supabaseAdmin
    .from("coupon_distribution_rules")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      coupon_id,
      trigger_type,
      trigger_config: config,
    })
    .select()
    .single();

  if (error) return serverError(error.message);

  logAudit(req, "coupon_rule.create", "coupon_distribution_rule", rule?.id || "unknown");
  return NextResponse.json({ ok: true, rule });
}

// app/api/admin/points/auto-grant-rules/route.ts — ポイント自動付与ルール CRUD（一覧/作成）
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

// 有効なトリガータイプ
const VALID_TRIGGER_TYPES = ["per_purchase", "first_purchase", "amount_threshold"] as const;
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
      .from("point_auto_grant_rules")
      .select("*")
      .order("created_at", { ascending: false }),
    tenantId,
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

  const { name, trigger_type, points_amount, trigger_config } = body as {
    name?: string;
    trigger_type?: string;
    points_amount?: number;
    trigger_config?: Record<string, unknown>;
  };

  // バリデーション
  if (!name?.trim()) return badRequest("ルール名は必須です");
  if (!trigger_type || !isValidTriggerType(trigger_type)) {
    return badRequest("トリガータイプが不正です");
  }

  // トリガー設定のバリデーション
  const config = trigger_config || {};
  if (trigger_type === "per_purchase") {
    const rate = Number(config.rate);
    if (!rate || rate <= 0 || rate > 1) {
      return badRequest("付与率は0〜1の範囲で指定してください（例: 0.01 = 1%）");
    }
  }
  if (trigger_type === "amount_threshold" && !config.min_amount) {
    return badRequest("最低購入金額は必須です");
  }

  // per_purchase以外はpoints_amount必須
  if (trigger_type !== "per_purchase") {
    if (!points_amount || points_amount <= 0) {
      return badRequest("付与ポイント数は正の整数で指定してください");
    }
  }

  const { data: rule, error } = await supabaseAdmin
    .from("point_auto_grant_rules")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      trigger_type,
      points_amount: points_amount || 0,
      trigger_config: config,
    })
    .select()
    .single();

  if (error) return serverError(error.message);

  logAudit(req, "point_rule.create", "point_auto_grant_rule", rule?.id || "unknown");
  return NextResponse.json({ ok: true, rule });
}

// app/api/admin/stamp-cards/settings/route.ts — スタンプカード設定API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { z } from "zod/v4";
import { parseBody } from "@/lib/validations/helpers";

// 設定更新スキーマ
const settingsSchema = z.object({
  stamps_required: z.number().int().min(1, "スタンプ数は1以上").max(100, "スタンプ数は100以下"),
  reward_type: z.enum(["coupon", "discount", "free_menu"]),
  reward_config: z.record(z.string(), z.unknown()).optional().default({}),
});

// GET: スタンプカード設定取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await supabaseAdmin
    .from("stamp_card_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) return serverError(error.message);

  // 未設定の場合はデフォルト値
  const settings = data || {
    tenant_id: tenantId,
    stamps_required: 10,
    reward_type: "coupon",
    reward_config: {},
  };

  return NextResponse.json({ settings });
}

// PUT: スタンプカード設定更新（upsert）
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, settingsSchema);
  if ("error" in parsed) return parsed.error;

  const { stamps_required, reward_type, reward_config } = parsed.data;

  // upsert: tenant_idがPKなので安全にupsert可能
  const { data, error } = await supabaseAdmin
    .from("stamp_card_settings")
    .upsert(
      {
        tenant_id: tenantId,
        stamps_required,
        reward_type,
        reward_config: reward_config || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    )
    .select("*")
    .single();

  if (error) return serverError(error.message);

  return NextResponse.json({ settings: data });
}

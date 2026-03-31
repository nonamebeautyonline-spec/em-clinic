// app/api/admin/stamp-cards/route.ts — スタンプカード一覧・スタンプ付与API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { z } from "zod/v4";
import { parseBody } from "@/lib/validations/helpers";

// スタンプ付与リクエストスキーマ
const stampSchema = z.object({
  patient_id: z.number().int().positive("患者IDは正の整数です"),
});

// GET: スタンプカード設定 + 顧客別スタンプ一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  // 設定取得
  if (type === "settings") {
    const { data, error } = await supabaseAdmin
      .from("stamp_card_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) return serverError(error.message);

    // 未設定の場合はデフォルト値を返す
    const settings = data || {
      tenant_id: tenantId,
      stamps_required: 10,
      reward_type: "coupon",
      reward_config: {},
    };

    return NextResponse.json({ settings });
  }

  // カード一覧（ページネーション対応）
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("per_page") || "50", 10);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // スタンプカード取得
  const { data: cards, error: cardsErr, count } = await strictWithTenant(
    supabaseAdmin
      .from("stamp_cards")
      .select("*, patients(id, name, name_kana)", { count: "exact" })
      .order("last_stamp_at", { ascending: false, nullsFirst: false })
      .range(from, to),
    tenantId,
  );

  if (cardsErr) return serverError(cardsErr.message);

  // 設定も一緒に返す
  const { data: settings } = await supabaseAdmin
    .from("stamp_card_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  // 統計情報
  const { count: totalCards } = await strictWithTenant(
    supabaseAdmin.from("stamp_cards").select("*", { count: "exact", head: true }),
    tenantId,
  );

  const { count: activeCards } = await strictWithTenant(
    supabaseAdmin.from("stamp_cards").select("*", { count: "exact", head: true }).gt("current_stamps", 0),
    tenantId,
  );

  // completed_countの合計を取得
  const { data: completedData } = await strictWithTenant(
    supabaseAdmin.from("stamp_cards").select("completed_count"),
    tenantId,
  );
  const totalCompleted = (completedData || []).reduce(
    (sum: number, c: { completed_count: number }) => sum + (c.completed_count || 0),
    0,
  );

  return NextResponse.json({
    cards: cards || [],
    settings: settings || { stamps_required: 10, reward_type: "coupon", reward_config: {} },
    stats: {
      total_cards: totalCards || 0,
      active_cards: activeCards || 0,
      total_completed: totalCompleted,
    },
    pagination: {
      page,
      per_page: perPage,
      total: count || 0,
    },
  });
}

// POST: スタンプ付与
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, stampSchema);
  if ("error" in parsed) return parsed.error;

  const { patient_id } = parsed.data;

  // 設定取得（stamps_required）
  const { data: settings } = await supabaseAdmin
    .from("stamp_card_settings")
    .select("stamps_required")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const stampsRequired = settings?.stamps_required || 10;

  // 既存カード取得 or 新規作成
  const { data: existing } = await strictWithTenant(
    supabaseAdmin.from("stamp_cards").select("*").eq("patient_id", patient_id),
    tenantId,
  );

  const card = existing?.[0];
  const now = new Date().toISOString();

  if (!card) {
    // 新規カード作成（スタンプ1つ付与）
    const newStamps = 1 >= stampsRequired ? 0 : 1;
    const completed = 1 >= stampsRequired ? 1 : 0;

    const { data: created, error } = await supabaseAdmin
      .from("stamp_cards")
      .insert({
        ...tenantPayload(tenantId),
        patient_id,
        current_stamps: newStamps,
        completed_count: completed,
        last_stamp_at: now,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);

    if (completed > 0) {
      // TODO: 将来対応 — couponsテーブルにクーポン自動発行INSERT
    }

    return NextResponse.json({ card: created, completed: completed > 0 });
  }

  // 既存カードにスタンプ追加
  const nextStamps = (card.current_stamps || 0) + 1;
  const isCompleted = nextStamps >= stampsRequired;

  const updateData: Record<string, unknown> = {
    current_stamps: isCompleted ? 0 : nextStamps,
    completed_count: isCompleted ? (card.completed_count || 0) + 1 : card.completed_count,
    last_stamp_at: now,
  };

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("stamp_cards")
    .update(updateData)
    .eq("id", card.id)
    .select("*")
    .single();

  if (updateErr) return serverError(updateErr.message);

  if (isCompleted) {
    // TODO: 将来対応 — couponsテーブルにクーポン自動発行INSERT
  }

  return NextResponse.json({ card: updated, completed: isCompleted });
}

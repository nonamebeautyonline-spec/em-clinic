// app/api/admin/points/route.ts — 管理者向けポイントAPI
// GET: 患者ポイント一覧, POST: 手動ポイント付与

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { grantPoints } from "@/lib/points";

/**
 * GET: 患者ポイント残高一覧
 * クエリパラメータ: limit, offset
 */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const offset = Number(url.searchParams.get("offset")) || 0;

    // 各患者の最新残高を取得（DISTINCT ON で最新レコードのみ）
    // Supabase JSクライアントではDISTINCT ONが使えないので、全患者のledgerを取得して集約
    const { data, error } = await withTenant(
      supabaseAdmin
        .from("point_ledger")
        .select("patient_id, balance_after, created_at"),
      tenantId,
    )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/points] GET error:", error);
      return serverError("ポイント一覧の取得に失敗しました");
    }

    // 各患者の最新残高を集約
    const balanceMap = new Map<string, { balance: number; updated_at: string }>();
    for (const row of data ?? []) {
      if (!balanceMap.has(row.patient_id)) {
        balanceMap.set(row.patient_id, {
          balance: row.balance_after,
          updated_at: row.created_at,
        });
      }
    }

    const allEntries = Array.from(balanceMap.entries()).map(([patient_id, info]) => ({
      patient_id,
      balance: info.balance,
      updated_at: info.updated_at,
    }));

    // ページネーション
    const total = allEntries.length;
    const paged = allEntries.slice(offset, offset + limit);

    return NextResponse.json({ ok: true, data: paged, total });
  } catch (err) {
    console.error("[admin/points] GET error:", err);
    return serverError("ポイント一覧の取得に失敗しました");
  }
}

/**
 * POST: 手動ポイント付与
 * body: { patient_id, amount, reason }
 */
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  try {
    const body = await req.json();
    const { patient_id, amount, reason } = body;

    if (!patient_id) return badRequest("patient_id は必須です");
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return badRequest("amount は正の整数で指定してください");
    }
    if (!reason || typeof reason !== "string") {
      return badRequest("reason は必須です");
    }

    const entry = await grantPoints(
      tenantId,
      patient_id,
      amount,
      reason,
      "manual",
    );

    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    console.error("[admin/points] POST error:", err);
    return serverError("ポイント付与に失敗しました");
  }
}

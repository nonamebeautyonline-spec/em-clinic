import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSetting, setSetting } from "@/lib/settings";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

const CATEGORY = "talk";
const KEY = "attach_panel_order";

// デフォルトの並び順
const DEFAULT_ORDER = ["template", "image", "media", "pdf", "call", "action"];

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const raw = await getSetting(CATEGORY, KEY, tenantId ?? undefined);

  let order = DEFAULT_ORDER;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) order = parsed;
    } catch { /* デフォルト使用 */ }
  }

  return NextResponse.json({ order });
}

export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { order } = body;

  if (!Array.isArray(order)) {
    return badRequest("order は配列で指定してください");
  }

  // 有効なIDのみ許可
  const validIds = new Set(DEFAULT_ORDER);
  const filtered = order.filter((id: string) => validIds.has(id));
  // 未含のIDを末尾に追加
  for (const id of DEFAULT_ORDER) {
    if (!filtered.includes(id)) filtered.push(id);
  }

  await setSetting(CATEGORY, KEY, JSON.stringify(filtered), tenantId ?? undefined);
  return NextResponse.json({ ok: true, order: filtered });
}

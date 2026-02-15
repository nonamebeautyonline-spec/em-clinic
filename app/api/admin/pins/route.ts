import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const MAX_PINS = 15;

// ★ 全アカウント共有: 全ユーザーの pinned_patients を統合して返す
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("admin_users")
      .select("pinned_patients"),
    tenantId
  );

  if (error) {
    return NextResponse.json({ pins: [] });
  }

  // 全ユーザーのピンを統合（重複排除・順序保持）
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const row of data || []) {
    for (const pid of row.pinned_patients || []) {
      if (!seen.has(pid)) {
        seen.add(pid);
        merged.push(pid);
      }
    }
  }

  return NextResponse.json({ pins: merged.slice(0, MAX_PINS) });
}

// ★ 全アカウント共有: 全ユーザーの pinned_patients を同じ値に更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  const body = await req.json().catch(() => ({}));
  const pins = Array.isArray(body.pins) ? body.pins.slice(0, MAX_PINS) : [];

  // 全ユーザーに同じピンを書き込む（フィルタなしで全行更新）
  const { data: users } = await withTenant(
    supabaseAdmin
      .from("admin_users")
      .select("id"),
    tenantId
  );

  for (const u of users || []) {
    const { error } = await withTenant(
      supabaseAdmin
        .from("admin_users")
        .update({ pinned_patients: pins })
        .eq("id", u.id),
      tenantId
    );
    if (error) {
      console.error("[admin/pins] update error for", u.id, error);
    }
  }

  return NextResponse.json({ ok: true });
}

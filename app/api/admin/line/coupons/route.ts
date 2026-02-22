// app/api/admin/line/coupons/route.ts — クーポン管理 CRUD
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { createCouponSchema } from "@/lib/validations/line-common";

// クーポン一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data: coupons, error } = await withTenant(
    supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false }),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 各クーポンの配布数・利用数を取得
  const enriched = await Promise.all(
    (coupons || []).map(async (c: any) => {
      const { count: issuedCount } = await withTenant(
        supabaseAdmin.from("coupon_issues").select("*", { count: "exact", head: true }).eq("coupon_id", c.id),
        tenantId
      );
      const { count: usedCount } = await withTenant(
        supabaseAdmin.from("coupon_issues").select("*", { count: "exact", head: true }).eq("coupon_id", c.id).eq("status", "used"),
        tenantId
      );
      return { ...c, issued_count: issuedCount || 0, used_count: usedCount || 0 };
    })
  );

  return NextResponse.json({ coupons: enriched });
}

// クーポン作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, createCouponSchema);
  if ("error" in parsed) return parsed.error;
  const { name, code, discount_type, discount_value, min_purchase, max_uses, max_uses_per_patient, valid_from, valid_until, description } = parsed.data;

  // コード重複チェック
  const { data: existing } = await withTenant(
    supabaseAdmin.from("coupons").select("id").eq("code", code.trim().toUpperCase()).limit(1),
    tenantId
  );
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "同じクーポンコードが既に存在します" }, { status: 400 });
  }

  const { data: coupon, error } = await supabaseAdmin
    .from("coupons")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      discount_type: discount_type || "fixed",
      discount_value: Number(discount_value),
      min_purchase: Number(min_purchase) || 0,
      max_uses: max_uses ? Number(max_uses) : null,
      max_uses_per_patient: Number(max_uses_per_patient) || 1,
      valid_from: valid_from || new Date().toISOString(),
      valid_until: valid_until || null,
      description: description || "",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, coupon });
}

// クーポン更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, createCouponSchema);
  if ("error" in parsed) return parsed.error;
  const { id, name, code, discount_type, discount_value, min_purchase, max_uses, max_uses_per_patient, valid_from, valid_until, is_active, description } = parsed.data as any;

  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  const { error } = await withTenant(
    supabaseAdmin.from("coupons").update({
      name: name?.trim() || "",
      code: code?.trim().toUpperCase() || "",
      discount_type: discount_type || "fixed",
      discount_value: Number(discount_value) || 0,
      min_purchase: Number(min_purchase) || 0,
      max_uses: max_uses ? Number(max_uses) : null,
      max_uses_per_patient: Number(max_uses_per_patient) || 1,
      valid_from: valid_from || new Date().toISOString(),
      valid_until: valid_until || null,
      is_active: is_active !== false,
      description: description || "",
      updated_at: new Date().toISOString(),
    }).eq("id", id),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// クーポン削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  const { error } = await withTenant(
    supabaseAdmin.from("coupons").delete().eq("id", parseInt(id)),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

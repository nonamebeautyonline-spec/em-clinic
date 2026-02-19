// app/api/platform/members/route.ts
// プラットフォーム管理: 全テナント横断メンバー一覧API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const tenantId = searchParams.get("tenant_id") || "";
    const role = searchParams.get("role") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const offset = (page - 1) * limit;

    // admin_users を取得（基本クエリ）
    let query = supabaseAdmin
      .from("admin_users")
      .select("id, email, name, is_active, platform_role, tenant_id, created_at, updated_at", {
        count: "exact",
      });

    // テナントIDフィルター
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    // プラットフォームロールフィルター
    if (role) {
      query = query.eq("platform_role", role);
    }

    // 名前・メール検索
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    // ページネーション＆ソート
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: adminUsers, count, error: queryError } = await query;

    if (queryError) {
      console.error("メンバー一覧取得エラー:", queryError);
      return NextResponse.json(
        { ok: false, error: "メンバーデータの取得に失敗しました" },
        { status: 500 }
      );
    }

    // テナント情報を取得して紐付け
    const tenantIds = [
      ...new Set(
        (adminUsers || [])
          .map((u) => u.tenant_id)
          .filter((id): id is string => !!id)
      ),
    ];

    let tenantsMap: Record<string, { name: string; slug: string }> = {};
    if (tenantIds.length > 0) {
      const { data: tenants } = await supabaseAdmin
        .from("tenants")
        .select("id, name, slug")
        .in("id", tenantIds);

      if (tenants) {
        tenantsMap = Object.fromEntries(
          tenants.map((t) => [t.id, { name: t.name, slug: t.slug }])
        );
      }
    }

    // tenant_members からロール情報を取得
    const userIds = (adminUsers || []).map((u) => u.id);
    let memberRoles: Record<string, { role: string; tenant_id: string }[]> = {};
    if (userIds.length > 0) {
      const { data: members } = await supabaseAdmin
        .from("tenant_members")
        .select("admin_user_id, tenant_id, role")
        .in("admin_user_id", userIds);

      if (members) {
        for (const m of members) {
          if (!memberRoles[m.admin_user_id]) {
            memberRoles[m.admin_user_id] = [];
          }
          memberRoles[m.admin_user_id].push({
            role: m.role,
            tenant_id: m.tenant_id,
          });
        }
      }
    }

    // レスポンス組み立て
    const membersWithTenants = (adminUsers || []).map((u) => {
      const tenantInfo = u.tenant_id ? tenantsMap[u.tenant_id] : null;
      const roles = memberRoles[u.id] || [];
      // tenant_membersのロール（owner/admin）を優先的に表示
      const tenantRole = roles.find(
        (r) => r.tenant_id === u.tenant_id
      )?.role;

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        isActive: u.is_active,
        platformRole: u.platform_role,
        tenantId: u.tenant_id,
        tenantName: tenantInfo?.name || null,
        tenantSlug: tenantInfo?.slug || null,
        tenantRole: tenantRole || null,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
        // 複数テナントに所属している場合の情報
        allTenants: roles.map((r) => ({
          tenantId: r.tenant_id,
          tenantName: tenantsMap[r.tenant_id]?.name || null,
          tenantSlug: tenantsMap[r.tenant_id]?.slug || null,
          role: r.role,
        })),
      };
    });

    // テナント一覧（フィルター用）
    const { data: allTenants } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name");

    return NextResponse.json({
      ok: true,
      members: membersWithTenants,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      tenants: allTenants || [],
    });
  } catch (error) {
    console.error("メンバー一覧エラー:", error);
    return NextResponse.json(
      { ok: false, error: "メンバーデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// ロール別メニュー権限API — テナントのロール権限を取得・更新
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth, getAdminTenantRole } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, tenantPayload } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { unauthorized, forbidden, badRequest, serverError } from "@/lib/api-error";
import { isFullAccessRole, ALL_MENU_KEYS } from "@/lib/menu-permissions";
import { logAudit } from "@/lib/audit";

// 更新可能なロール
const EDITABLE_ROLES = ["editor", "viewer"] as const;
type EditableRole = (typeof EDITABLE_ROLES)[number];

function isEditableRole(role: string): role is EditableRole {
  return EDITABLE_ROLES.includes(role as EditableRole);
}

// --- GET: テナントのロール別メニュー権限を取得 ---
export async function GET(request: NextRequest) {
  try {
    const isAuth = await verifyAdminAuth(request);
    if (!isAuth) return unauthorized();

    const role = await getAdminTenantRole(request);
    if (!isFullAccessRole(role)) return forbidden("owner/admin のみアクセス可能です");

    const tenantId = resolveTenantIdOrThrow(request);

    const { data, error } = await supabaseAdmin
      .from("role_menu_permissions")
      .select("role, menu_key, can_edit")
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("[role-permissions GET] DB error:", error);
      return serverError("権限情報の取得に失敗しました");
    }

    // ロール別に整形: { editor: { dashboard: true, line: false }, viewer: { ... } }
    const permissions: Record<string, Record<string, boolean>> = {};
    for (const row of data ?? []) {
      if (!permissions[row.role]) permissions[row.role] = {};
      permissions[row.role][row.menu_key] = row.can_edit;
    }

    return NextResponse.json({ ok: true, permissions });
  } catch (err) {
    console.error("[role-permissions GET] unexpected:", err);
    return serverError("権限情報の取得に失敗しました");
  }
}

// --- PUT: ロールの権限を一括更新 ---
export async function PUT(request: NextRequest) {
  try {
    const isAuth = await verifyAdminAuth(request);
    if (!isAuth) return unauthorized();

    const currentRole = await getAdminTenantRole(request);
    if (!isFullAccessRole(currentRole)) return forbidden("owner/admin のみ更新可能です");

    const tenantId = resolveTenantIdOrThrow(request);

    const body = await request.json();
    const { role, menuKeys } = body as {
      role?: string;
      menuKeys?: Record<string, boolean>;
    };

    // バリデーション: role
    if (!role || !isEditableRole(role)) {
      return badRequest(`role は ${EDITABLE_ROLES.join(" / ")} のいずれかを指定してください`);
    }

    // バリデーション: menuKeys
    if (!menuKeys || typeof menuKeys !== "object" || Array.isArray(menuKeys)) {
      return badRequest("menuKeys はオブジェクト形式で指定してください");
    }

    const invalidKeys = Object.keys(menuKeys).filter(
      (k) => !ALL_MENU_KEYS.includes(k),
    );
    if (invalidKeys.length > 0) {
      return badRequest(`不正なメニューキー: ${invalidKeys.join(", ")}`);
    }

    // 既存レコード削除 → 新規INSERT（DELETE + INSERT でトランザクション的に一括更新）
    const { error: deleteError } = await supabaseAdmin
      .from("role_menu_permissions")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("role", role);

    if (deleteError) {
      console.error("[role-permissions PUT] delete error:", deleteError);
      return serverError("権限の更新に失敗しました");
    }

    const rows = Object.entries(menuKeys).map(([menuKey, canEdit]) => ({
      ...tenantPayload(tenantId),
      role,
      menu_key: menuKey,
      can_edit: Boolean(canEdit),
    }));

    if (rows.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("role_menu_permissions")
        .insert(rows);

      if (insertError) {
        console.error("[role-permissions PUT] insert error:", insertError);
        return serverError("権限の更新に失敗しました");
      }
    }

    logAudit(request, "role_permission.update", "role_permission", "unknown");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[role-permissions PUT] unexpected:", err);
    return serverError("権限の更新に失敗しました");
  }
}

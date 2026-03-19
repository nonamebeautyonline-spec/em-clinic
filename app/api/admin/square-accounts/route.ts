// app/api/admin/square-accounts/route.ts — Squareアカウント管理API（管理画面専用）
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSetting, setSetting, getSettingOrEnv } from "@/lib/settings";
import { resolveTenantId } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { squareAccountsUpdateSchema } from "@/lib/validations/admin-operations";
import { type SquareAccount } from "@/lib/square-account";

/**
 * GET: Squareアカウント一覧 + アクティブIDを返す
 * 旧形式（個別キー）からの自動マイグレーション対応
 */
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantId(req) ?? undefined;
    const accountsJson = await getSetting("square", "accounts", tenantId);

    if (accountsJson) {
      try {
        const accounts: SquareAccount[] = JSON.parse(accountsJson);
        const activeId = await getSetting("square", "active_account_id", tenantId) || accounts[0]?.id || "";
        return NextResponse.json({ accounts, activeId });
      } catch {
        // JSONパース失敗 → 旧形式マイグレーションへ
      }
    }

    // 旧形式からの移行を試みる
    const legacyToken = await getSettingOrEnv("square", "access_token", "SQUARE_ACCESS_TOKEN", tenantId);
    if (legacyToken) {
      const migrated: SquareAccount = {
        id: `sq_migrated_${Date.now()}`,
        name: "メインアカウント",
        access_token: legacyToken,
        application_id: (await getSettingOrEnv("square", "application_id", "SQUARE_APPLICATION_ID", tenantId)) || "",
        location_id: (await getSettingOrEnv("square", "location_id", "SQUARE_LOCATION_ID", tenantId)) || "",
        webhook_signature_key: (await getSettingOrEnv("square", "webhook_signature_key", "SQUARE_WEBHOOK_SIGNATURE_KEY", tenantId)) || "",
        env: (await getSettingOrEnv("square", "env", "SQUARE_ENV", tenantId)) || "production",
        three_ds_enabled: (await getSetting("square", "3ds_enabled", tenantId)) === "true",
      };
      const accounts = [migrated];
      await setSetting("square", "accounts", JSON.stringify(accounts), tenantId);
      await setSetting("square", "active_account_id", migrated.id, tenantId);
      return NextResponse.json({ accounts, activeId: migrated.id });
    }

    // 旧形式もなければ空
    return NextResponse.json({ accounts: [], activeId: "" });
  } catch (e) {
    console.error("[SquareAccounts GET] Error:", e);
    return serverError(e instanceof Error ? e.message : "サーバーエラー");
  }
}

/**
 * PUT: Squareアカウント一覧を一括保存
 */
export async function PUT(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const parsed = await parseBody(req, squareAccountsUpdateSchema);
    if ("error" in parsed) return parsed.error;

    const { accounts, activeId } = parsed.data;

    if (!accounts.some((a: SquareAccount) => a.id === activeId)) {
      return badRequest("アクティブアカウントIDがアカウントリストに存在しません");
    }

    const tenantId = resolveTenantId(req) ?? undefined;

    await setSetting("square", "accounts", JSON.stringify(accounts), tenantId);
    await setSetting("square", "active_account_id", activeId, tenantId);

    return NextResponse.json({ success: true, accounts, activeId });
  } catch (e) {
    console.error("[SquareAccounts PUT] Error:", e);
    return serverError(e instanceof Error ? e.message : "サーバーエラー");
  }
}

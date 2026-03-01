// app/api/admin/bank-accounts/route.ts — 口座情報管理API（管理画面専用）
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSetting, setSetting } from "@/lib/settings";
import { resolveTenantId } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { bankAccountsUpdateSchema } from "@/lib/validations/admin-operations";
import { DEFAULT_BANK_ACCOUNT, type BankAccount } from "@/lib/bank-account";

/**
 * GET: 口座一覧 + アクティブIDを返す
 * 初回アクセス時にデフォルト口座を自動登録
 */
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req) ?? undefined;

    const accountsJson = await getSetting("payment", "bank_accounts", tenantId);

    if (accountsJson) {
      try {
        const accounts: BankAccount[] = JSON.parse(accountsJson);
        const activeId = await getSetting("payment", "active_bank_account_id", tenantId) || accounts[0]?.id || "";
        return NextResponse.json({ accounts, activeId });
      } catch {
        // JSONパース失敗 → デフォルトで初期化
      }
    }

    // 旧形式からの移行を試みる
    const legacyBankName = await getSetting("payment", "bank_name", tenantId);
    if (legacyBankName) {
      const migrated: BankAccount = {
        id: `acc_migrated_${Date.now()}`,
        bank_name: legacyBankName,
        bank_branch: await getSetting("payment", "bank_branch", tenantId) || "",
        bank_account_type: await getSetting("payment", "bank_account_type", tenantId) || "",
        bank_account_number: await getSetting("payment", "bank_account_number", tenantId) || "",
        bank_account_holder: await getSetting("payment", "bank_account_holder", tenantId) || "",
      };
      const accounts = [migrated];
      await setSetting("payment", "bank_accounts", JSON.stringify(accounts), tenantId);
      await setSetting("payment", "active_bank_account_id", migrated.id, tenantId);
      return NextResponse.json({ accounts, activeId: migrated.id });
    }

    // 旧形式もなければデフォルト口座を登録
    const defaults = [DEFAULT_BANK_ACCOUNT];
    await setSetting("payment", "bank_accounts", JSON.stringify(defaults), tenantId);
    await setSetting("payment", "active_bank_account_id", DEFAULT_BANK_ACCOUNT.id, tenantId);
    return NextResponse.json({ accounts: defaults, activeId: DEFAULT_BANK_ACCOUNT.id });
  } catch (e: any) {
    console.error("[BankAccounts GET] Error:", e);
    return NextResponse.json({ error: e?.message || "サーバーエラー" }, { status: 500 });
  }
}

/**
 * PUT: 口座一覧を一括保存
 */
export async function PUT(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(req, bankAccountsUpdateSchema);
    if ("error" in parsed) return parsed.error;

    const { accounts, activeId } = parsed.data;

    // activeIdが口座リストに存在するか確認
    if (!accounts.some((a: BankAccount) => a.id === activeId)) {
      return NextResponse.json(
        { error: "アクティブ口座IDが口座リストに存在しません" },
        { status: 400 }
      );
    }

    const tenantId = resolveTenantId(req) ?? undefined;

    await setSetting("payment", "bank_accounts", JSON.stringify(accounts), tenantId);
    await setSetting("payment", "active_bank_account_id", activeId, tenantId);

    return NextResponse.json({ success: true, accounts, activeId });
  } catch (e: any) {
    console.error("[BankAccounts PUT] Error:", e);
    return NextResponse.json({ error: e?.message || "サーバーエラー" }, { status: 500 });
  }
}

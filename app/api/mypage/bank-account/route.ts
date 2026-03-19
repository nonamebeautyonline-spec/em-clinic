// 患者マイページ用 振込先口座情報API（公開、認証不要）
import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import type { BankAccount } from "@/lib/bank-account";

export const dynamic = "force-dynamic";

const LEGACY_BANK_KEYS = [
  "bank_name",
  "bank_branch",
  "bank_account_type",
  "bank_account_number",
  "bank_account_holder",
] as const;

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantIdOrThrow(req) ?? undefined;

  // 新形式: JSON配列 + アクティブID
  const accountsJson = await getSetting("payment", "bank_accounts", tenantId);
  if (accountsJson) {
    try {
      const accounts: BankAccount[] = JSON.parse(accountsJson);
      const activeId = await getSetting("payment", "active_bank_account_id", tenantId);
      const active = accounts.find((a) => a.id === activeId) || accounts[0];
      if (active) {
        return NextResponse.json(
          {
            bankAccount: {
              bank_name: active.bank_name,
              bank_branch: active.bank_branch,
              bank_account_type: active.bank_account_type,
              bank_account_number: active.bank_account_number,
              bank_account_holder: active.bank_account_holder,
            },
          },
          {
            headers: {
              "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
          }
        );
      }
    } catch {
      // JSONパース失敗 → 旧形式フォールバック
    }
  }

  // 旧形式フォールバック（移行期間中の互換性）
  const result: Record<string, string> = {};
  for (const key of LEGACY_BANK_KEYS) {
    const val = await getSetting("payment", key, tenantId);
    result[key] = val || "";
  }

  return NextResponse.json(
    { bankAccount: result },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

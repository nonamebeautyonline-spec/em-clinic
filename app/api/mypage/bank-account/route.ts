// 患者マイページ用 振込先口座情報API（公開、認証不要）
import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { resolveTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const BANK_KEYS = [
  "bank_name",
  "bank_branch",
  "bank_account_type",
  "bank_account_number",
  "bank_account_holder",
] as const;

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req) ?? undefined;

  const result: Record<string, string> = {};
  for (const key of BANK_KEYS) {
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

// __tests__/api/mypage-bank-account.test.ts
// 患者マイページ用 振込先口座情報API のテスト
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// getSetting モック
let mockSettings: Record<string, string> = {};

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn((_cat: string, key: string) => {
    return Promise.resolve(mockSettings[key] || "");
  }),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  resolveTenantIdOrThrow: vi.fn(() => null),
}));

import { GET } from "@/app/api/mypage/bank-account/route";

function buildRequest(): NextRequest {
  return new NextRequest("http://localhost/api/mypage/bank-account", {
    method: "GET",
  });
}

describe("GET /api/mypage/bank-account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = {};
  });

  it("新形式: JSON配列からアクティブ口座を返す", async () => {
    const accounts = [
      {
        id: "acc_1",
        bank_name: "住信SBIネット銀行",
        bank_branch: "法人第一支店（106）",
        bank_account_type: "普通",
        bank_account_number: "2931048",
        bank_account_holder: "カ）コブシ",
      },
      {
        id: "acc_2",
        bank_name: "PayPay銀行",
        bank_branch: "本店営業部",
        bank_account_type: "普通",
        bank_account_number: "9876543",
        bank_account_holder: "カ）テスト",
      },
    ];
    mockSettings = {
      bank_accounts: JSON.stringify(accounts),
      active_bank_account_id: "acc_2",
    };

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.bankAccount).toEqual({
      bank_name: "PayPay銀行",
      bank_branch: "本店営業部",
      bank_account_type: "普通",
      bank_account_number: "9876543",
      bank_account_holder: "カ）テスト",
    });
  });

  it("新形式: アクティブIDが不正な場合、先頭口座を返す", async () => {
    const accounts = [
      {
        id: "acc_1",
        bank_name: "住信SBIネット銀行",
        bank_branch: "法人第一支店（106）",
        bank_account_type: "普通",
        bank_account_number: "2931048",
        bank_account_holder: "カ）コブシ",
      },
    ];
    mockSettings = {
      bank_accounts: JSON.stringify(accounts),
      active_bank_account_id: "invalid_id",
    };

    const res = await GET(buildRequest());
    const json = await res.json();
    expect(json.bankAccount.bank_name).toBe("住信SBIネット銀行");
  });

  it("旧形式フォールバック: 個別キーから口座情報を返す", async () => {
    mockSettings = {
      bank_name: "三菱UFJ銀行",
      bank_branch: "東京支店",
      bank_account_type: "普通",
      bank_account_number: "1234567",
      bank_account_holder: "テスト太郎",
    };

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.bankAccount).toEqual({
      bank_name: "三菱UFJ銀行",
      bank_branch: "東京支店",
      bank_account_type: "普通",
      bank_account_number: "1234567",
      bank_account_holder: "テスト太郎",
    });
  });

  it("未設定の場合、空文字を返す", async () => {
    const res = await GET(buildRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.bankAccount).toEqual({
      bank_name: "",
      bank_branch: "",
      bank_account_type: "",
      bank_account_number: "",
      bank_account_holder: "",
    });
  });

  it("Cache-Controlヘッダーが設定されている", async () => {
    const res = await GET(buildRequest());
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  });
});

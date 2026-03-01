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

  it("口座情報が設定されている場合、全項目を返す", async () => {
    mockSettings = {
      bank_name: "住信SBIネット銀行",
      bank_branch: "法人第一支店（106）",
      bank_account_type: "普通",
      bank_account_number: "2931048",
      bank_account_holder: "カ）コブシ",
    };

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.bankAccount).toEqual({
      bank_name: "住信SBIネット銀行",
      bank_branch: "法人第一支店（106）",
      bank_account_type: "普通",
      bank_account_number: "2931048",
      bank_account_holder: "カ）コブシ",
    });
  });

  it("口座情報が未設定の場合、空文字を返す", async () => {
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

  it("一部のみ設定されている場合、設定済みの値と空文字を混在で返す", async () => {
    mockSettings = {
      bank_name: "三菱UFJ銀行",
      bank_account_number: "1234567",
    };

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.bankAccount.bank_name).toBe("三菱UFJ銀行");
    expect(json.bankAccount.bank_account_number).toBe("1234567");
    expect(json.bankAccount.bank_branch).toBe("");
    expect(json.bankAccount.bank_account_type).toBe("");
    expect(json.bankAccount.bank_account_holder).toBe("");
  });

  it("Cache-Controlヘッダーが設定されている", async () => {
    const res = await GET(buildRequest());
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  });
});

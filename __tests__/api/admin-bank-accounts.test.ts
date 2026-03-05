// __tests__/api/admin-bank-accounts.test.ts
// 管理画面用 口座情報管理API のテスト
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let mockSettings: Record<string, string> = {};

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn((_cat: string, key: string) => {
    return Promise.resolve(mockSettings[key] || "");
  }),
  setSetting: vi.fn((_cat: string, key: string, value: string) => {
    mockSettings[key] = value;
    return Promise.resolve(true);
  }),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
}));

import { GET, PUT } from "@/app/api/admin/bank-accounts/route";

function buildGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/bank-accounts", {
    method: "GET",
  });
}

function buildPutRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/bank-accounts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/bank-accounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = {};
  });

  it("新形式データが存在する場合、口座一覧を返す", async () => {
    const accounts = [
      { id: "acc_1", bank_name: "住信SBI", bank_branch: "支店A", bank_account_type: "普通", bank_account_number: "123", bank_account_holder: "テスト" },
    ];
    mockSettings = {
      bank_accounts: JSON.stringify(accounts),
      active_bank_account_id: "acc_1",
    };

    const res = await GET(buildGetRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.accounts).toHaveLength(1);
    expect(json.accounts[0].bank_name).toBe("住信SBI");
    expect(json.activeId).toBe("acc_1");
  });

  it("旧形式データが存在する場合、移行して返す", async () => {
    mockSettings = {
      bank_name: "三井住友銀行",
      bank_branch: "新宿支店",
      bank_account_type: "普通",
      bank_account_number: "7654321",
      bank_account_holder: "テスト太郎",
    };

    const res = await GET(buildGetRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.accounts).toHaveLength(1);
    expect(json.accounts[0].bank_name).toBe("三井住友銀行");
    expect(json.accounts[0].bank_branch).toBe("新宿支店");
    expect(json.activeId).toBe(json.accounts[0].id);
    // 新形式で保存されたことを確認
    expect(mockSettings.bank_accounts).toBeTruthy();
  });

  it("データが何もない場合、デフォルト口座（住信SBI）を自動登録して返す", async () => {
    const res = await GET(buildGetRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.accounts).toHaveLength(1);
    expect(json.accounts[0].bank_name).toBe("住信SBIネット銀行");
    expect(json.accounts[0].bank_account_number).toBe("2931048");
    expect(json.activeId).toBe("acc_default_sbi");
    // 保存されたことを確認
    expect(mockSettings.bank_accounts).toBeTruthy();
    expect(mockSettings.active_bank_account_id).toBe("acc_default_sbi");
  });
});

describe("PUT /api/admin/bank-accounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = {};
  });

  it("口座一覧を一括保存できる", async () => {
    const accounts = [
      { id: "acc_1", bank_name: "PayPay銀行", bank_branch: "本店", bank_account_type: "普通", bank_account_number: "999", bank_account_holder: "テスト" },
      { id: "acc_2", bank_name: "楽天銀行", bank_branch: "第一支店", bank_account_type: "普通", bank_account_number: "888", bank_account_holder: "テスト2" },
    ];

    const res = await PUT(buildPutRequest({ accounts, activeId: "acc_1" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.accounts).toHaveLength(2);
    expect(json.activeId).toBe("acc_1");
  });

  it("アクティブIDが口座リストに存在しない場合、400エラー", async () => {
    const accounts = [
      { id: "acc_1", bank_name: "PayPay銀行", bank_branch: "本店", bank_account_type: "普通", bank_account_number: "999", bank_account_holder: "テスト" },
    ];

    const res = await PUT(buildPutRequest({ accounts, activeId: "invalid" }));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.message).toContain("アクティブ口座ID");
  });

  it("空の口座リストは400エラー", async () => {
    const res = await PUT(buildPutRequest({ accounts: [], activeId: "acc_1" }));
    expect(res.status).toBe(400);
  });

  it("必須フィールドが欠けている口座は400エラー", async () => {
    const accounts = [
      { id: "acc_1", bank_name: "", bank_branch: "本店", bank_account_type: "普通", bank_account_number: "999", bank_account_holder: "テスト" },
    ];

    const res = await PUT(buildPutRequest({ accounts, activeId: "acc_1" }));
    expect(res.status).toBe(400);
  });
});

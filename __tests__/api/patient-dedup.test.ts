// __tests__/api/patient-dedup.test.ts
// 同一患者レコード重複防止テスト
// - MERGE_TABLES の完全性
// - webhook findOrCreatePatient の RPC → フォールバック
// - register/personal-info の SEQUENCE → MAX+1 フォールバック
// - register/personal-info の UNIQUE違反ハンドリング
// - register/complete の LINE UID 重複検出

import { describe, it, expect, vi, beforeEach } from "vitest";

// ================================================================
// 1. MERGE_TABLES の完全性テスト（外部依存なし）
// ================================================================
describe("MERGE_TABLES 完全性", () => {
  it("全7テーブルが含まれること", async () => {
    const { MERGE_TABLES } = await import("@/lib/merge-tables");
    const expected = [
      "reservations",
      "orders",
      "reorders",
      "message_log",
      "patient_tags",
      "patient_marks",
      "friend_field_values",
    ];
    expect(MERGE_TABLES).toEqual(expected);
    expect(MERGE_TABLES.length).toBe(7);
  });

  it("intake は含まれないこと（各箇所で個別処理のため）", async () => {
    const { MERGE_TABLES } = await import("@/lib/merge-tables");
    expect(MERGE_TABLES).not.toContain("intake");
    expect(MERGE_TABLES).not.toContain("patients");
  });
});

// ================================================================
// 2. アーキテクチャテスト: MERGE_TABLES が各ファイルで使われていること
// ================================================================
describe("MERGE_TABLES 使用箇所", () => {
  it("webhook/route.ts が MERGE_TABLES を import していること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/line/webhook/route.ts", "utf-8");
    expect(content).toContain('import { MERGE_TABLES } from "@/lib/merge-tables"');
    // ハードコードされた旧テーブルリストが残っていないこと
    expect(content).not.toContain('"message_log", "patient_tags", "patient_marks", "friend_field_values"');
  });

  it("intake/route.ts が MERGE_TABLES を import していること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/intake/route.ts", "utf-8");
    expect(content).toContain('import { MERGE_TABLES } from "@/lib/merge-tables"');
  });

  it("register/complete が MERGE_TABLES を import していること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/register/complete/route.ts", "utf-8");
    expect(content).toContain('import { MERGE_TABLES } from "@/lib/merge-tables"');
  });

  it("register/personal-info が MERGE_TABLES を import していること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/register/personal-info/route.ts", "utf-8");
    expect(content).toContain('import { MERGE_TABLES } from "@/lib/merge-tables"');
  });
});

// ================================================================
// 3. webhook findOrCreatePatient テスト（RPC + フォールバック）
// ================================================================
describe("webhook findOrCreatePatient RPC化", () => {
  it("webhook/route.ts が find_or_create_patient RPC を呼び出すコードを含むこと", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/line/webhook/route.ts", "utf-8");
    expect(content).toContain("find_or_create_patient");
    expect(content).toContain("p_line_uid");
    expect(content).toContain("p_display_name");
    expect(content).toContain("p_tenant_id");
  });

  it("RPC失敗時のフォールバックロジックが存在すること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/line/webhook/route.ts", "utf-8");
    // RPC失敗時に従来ロジックにフォールバック
    expect(content).toContain("RPC failed, fallback");
    // UNIQUE違反時の再検索
    expect(content).toContain('patientsErr?.code === "23505"');
  });
});

// ================================================================
// 4. register/personal-info SEQUENCE化テスト
// ================================================================
describe("register/personal-info SEQUENCE化", () => {
  it("next_patient_id RPC を呼び出すコードが含まれること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/register/personal-info/route.ts", "utf-8");
    expect(content).toContain("next_patient_id");
    expect(content).toContain("SEQUENCE");
  });

  it("SEQUENCE失敗時の MAX+1 フォールバックが存在すること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/register/personal-info/route.ts", "utf-8");
    expect(content).toContain("SEQUENCE fallback");
    expect(content).toContain("MAX+1 fallback");
  });

  it("UNIQUE違反時の UPDATE フォールバックが存在すること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/register/personal-info/route.ts", "utf-8");
    expect(content).toContain('error.code === "23505"');
    expect(content).toContain("UNIQUE violation on insert");
  });
});

// ================================================================
// 5. register/complete LINE UID 重複検出テスト
// ================================================================
describe("register/complete LINE UID 重複検出", () => {
  it("LINE UID重複検出コードが含まれること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/register/complete/route.ts", "utf-8");
    expect(content).toContain("LINE UID重複検出");
    expect(content).toContain('.eq("line_id", lineUserId)');
    expect(content).toContain('.neq("patient_id", pid)');
  });

  it("LINE_仮レコードの自動マージが含まれること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/register/complete/route.ts", "utf-8");
    expect(content).toContain("LINE_ 自動マージ開始");
    expect(content).toContain('startsWith("LINE_")');
  });

  it("正規レコード同士の重複はマージしないこと", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/register/complete/route.ts", "utf-8");
    expect(content).toContain("正規レコード重複");
    expect(content).toContain("手動対応が必要");
  });
});

// ================================================================
// 6. DB制約マイグレーション テスト
// ================================================================
describe("DB制約 SQLマイグレーション", () => {
  it("line_id ユニークインデックスのSQL が正しいこと", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("supabase/migrations/20260302_add_unique_line_id.sql", "utf-8");
    expect(content).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_tenant_line_id_unique");
    expect(content).toContain("WHERE line_id IS NOT NULL");
    // NULL tenant_id 対策
    expect(content).toContain("COALESCE(tenant_id");
  });

  it.todo("patient_id SEQUENCE の SQL が正しいこと — マイグレーション作成後に有効化");

  it.todo("find_or_create_patient RPC の SQL が正しいこと — マイグレーション作成後に有効化");
});

// ================================================================
// 7. register/personal-info 統合テスト（モック使用）
// ================================================================

const mockRpc = vi.fn();
const mockChain: Record<string, any> = {};
const chainMethods = [
  "insert", "update", "delete", "select", "upsert",
  "eq", "neq", "not", "is", "in", "like", "ilike",
  "order", "limit", "single", "maybeSingle",
];
for (const m of chainMethods) {
  mockChain[m] = vi.fn().mockReturnValue(mockChain);
}
mockChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
mockChain.single = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockChain),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: any) => (tid ? { tenant_id: tid } : {})),
}));

vi.mock("@/lib/line-richmenu", () => ({
  linkRichMenuToUser: vi.fn().mockResolvedValue(true),
}));

import { POST as personalInfoPOST } from "@/app/api/register/personal-info/route";

function createPersonalInfoRequest(body: any, cookies: Record<string, string> = {}) {
  const req = new Request("http://localhost/api/register/personal-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  (req as any).cookies = {
    get: (name: string) => cookies[name] ? { value: cookies[name] } : undefined,
  };
  return req as any;
}

describe("register/personal-info SEQUENCE 統合テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const m of chainMethods) {
      if (m === "maybeSingle") {
        mockChain[m].mockResolvedValue({ data: null, error: null });
      } else if (m === "single") {
        mockChain[m].mockResolvedValue({ data: null, error: null });
      } else {
        mockChain[m].mockReturnValue(mockChain);
      }
    }
  });

  it("SEQUENCE で patient_id が採番されること", async () => {
    mockRpc.mockResolvedValue({ data: "10042", error: null });
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const req = createPersonalInfoRequest({
      name: "テスト太郎",
      name_kana: "テストタロウ",
      sex: "male",
      birthday: "1990-01-01",
    });

    const res = await personalInfoPOST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.patient_id).toBe("10042");
  });

  it("SEQUENCE 失敗時に MAX+1 で採番されること", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "function not found" } });

    mockChain.limit.mockReturnValue({
      ...mockChain,
      then: (resolve: any) => resolve({ data: [{ patient_id: "10041" }], error: null }),
    });

    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const req = createPersonalInfoRequest({
      name: "テスト太郎",
      name_kana: "テストタロウ",
      sex: "male",
      birthday: "1990-01-01",
    });

    const res = await personalInfoPOST(req);
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("next_patient_id");
  });
});

// ================================================================
// 8. 23505 UNIQUE 違反のグレースフルリカバリ テスト
// ================================================================
describe("UNIQUE 違反のグレースフルリカバリ", () => {
  it("webhook の patients INSERT で 23505 時に再検索されること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/line/webhook/route.ts", "utf-8");
    // 23505 ハンドリングが存在
    expect(content).toContain('patientsErr?.code === "23505"');
    expect(content).toContain("UNIQUE violation on patients insert, re-querying");
  });

  it("register/personal-info で 23505 時に UPDATE フォールバックすること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/register/personal-info/route.ts", "utf-8");
    expect(content).toContain('error.code === "23505"');
    expect(content).toContain("falling back to update");
  });

  it("register/complete のマージで 23505 が無視されること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/register/complete/route.ts", "utf-8");
    expect(content).toContain('error.code !== "23505"');
  });

  it("webhook の mergeFakePatients で 23505 が無視されること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/line/webhook/route.ts", "utf-8");
    expect(content).toContain('error.code !== "23505"');
  });
});

// ================================================================
// 9. クリーンアップスクリプトのテスト
// ================================================================
describe("cleanup-dup-line-id スクリプト", () => {
  it("スクリプトファイルが存在し正しい構成であること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("scripts/cleanup-dup-line-id.cjs", "utf-8");
    // MERGE_TABLES に相当するテーブルが含まれていること
    expect(content).toContain('"reservations"');
    expect(content).toContain('"orders"');
    expect(content).toContain('"reorders"');
    expect(content).toContain('"message_log"');
    expect(content).toContain('"patient_tags"');
    expect(content).toContain('"patient_marks"');
    expect(content).toContain('"friend_field_values"');
    // dry-run / execute フラグ
    expect(content).toContain("--dry-run");
    expect(content).toContain("--execute");
  });
});

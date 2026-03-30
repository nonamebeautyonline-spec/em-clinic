// lib/__tests__/ai-karte-summary.test.ts — AIカルテ要約テスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Anthropic モック ---
const mockAnthropicCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockAnthropicCreate };
  },
}));

// --- Supabase モック ---
type SupabaseChain = Record<string, ReturnType<typeof vi.fn>>;
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: SupabaseChain = {};
  const methods = [
    "from", "select", "insert", "update", "delete",
    "eq", "neq", "in", "is", "not", "order", "limit",
    "single", "maybeSingle",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

// テーブルごとの応答を管理
let tableResponses: Record<string, { data: unknown; error: unknown }> = {};

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      const resp = tableResponses[table] || { data: null, error: null };
      return createChain(resp);
    }),
  },
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-anthropic-key"),
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((q: unknown) => q),
}));

vi.mock("@/lib/patient-utils", () => ({
  formatProductCode: vi.fn((code: string) => `薬剤:${code}`),
}));

vi.mock("@/lib/soap-parser", () => ({
  parseJsonToSoap: vi.fn((json: string) => JSON.parse(json)),
  soapToText: vi.fn((soap: { s?: string; o?: string }) =>
    `【S】${soap.s || ""}【O】${soap.o || ""}`
  ),
}));

import { generateAiKarteSummary } from "@/lib/ai-karte-summary";

beforeEach(() => {
  vi.clearAllMocks();
  tableResponses = {
    intake: {
      data: [{
        id: 1,
        reserve_id: "r1",
        status: null,
        note: null,
        answers: {
          name: "テスト太郎",
          sex: "男",
          height: 170,
          weight: 65,
          current_disease_yesno: "no",
          med_yesno: "no",
          allergy_yesno: "no",
          prescription_menu: "GLP-1",
        },
        created_at: "2026-01-01T00:00:00Z",
      }],
      error: null,
    },
    orders: {
      data: [{
        product_code: "MED001",
        product_name: "テスト薬",
        amount: 15000,
        paid_at: "2026-01-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
      }],
      error: null,
    },
    reorders: {
      data: [],
      error: null,
    },
  };
});

// =============================================================
// 正常系
// =============================================================
describe("generateAiKarteSummary", () => {
  it("正常なJSON応答からSOAP形式の結果を返す", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({
          soap: { s: "主訴テスト", o: "BMI 22.5", a: "評価テスト", p: "計画テスト" },
          summary: "テスト要約",
          medications: ["薬A"],
        }),
      }],
    });

    const result = await generateAiKarteSummary("p1", "t1");
    expect(result.soap.s).toBe("主訴テスト");
    expect(result.soap.o).toBe("BMI 22.5");
    expect(result.soap.a).toBe("評価テスト");
    expect(result.soap.p).toBe("計画テスト");
    expect(result.summary).toBe("テスト要約");
    expect(result.medications).toEqual(["薬A"]);
  });

  it("コードブロック付きJSON応答を正しくパースする", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: '```json\n{"soap":{"s":"S","o":"O","a":"A","p":"P"},"summary":"要約","medications":[]}\n```',
      }],
    });

    const result = await generateAiKarteSummary("p1", "t1");
    expect(result.soap.s).toBe("S");
    expect(result.summary).toBe("要約");
  });

  it("大文字キー（S/O/A/P）のSOAPにも対応する", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({
          soap: { S: "大文字S", O: "大文字O", A: "大文字A", P: "大文字P" },
          summary: "テスト",
          medications: [],
        }),
      }],
    });

    const result = await generateAiKarteSummary("p1", "t1");
    expect(result.soap.s).toBe("大文字S");
    expect(result.soap.o).toBe("大文字O");
  });

  it("medications/summaryが省略されてもデフォルト値で返す", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({
          soap: { s: "S" },
        }),
      }],
    });

    const result = await generateAiKarteSummary("p1", "t1");
    expect(result.summary).toBe("");
    expect(result.medications).toEqual([]);
  });

  it("Claude APIにクリニックプロンプトを含むsystemメッセージを送信する", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({ soap: { s: "S", o: "O", a: "A", p: "P" }, summary: "", medications: [] }),
      }],
    });

    await generateAiKarteSummary("p1", "t1");

    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: expect.stringContaining("SOAP形式"),
      })
    );
  });
});

// =============================================================
// エラー系
// =============================================================
describe("generateAiKarteSummary エラーハンドリング", () => {
  it("APIキーが未設定の場合はエラーをスローする", async () => {
    const { getSettingOrEnv } = await import("@/lib/settings");
    vi.mocked(getSettingOrEnv).mockResolvedValueOnce(null);

    await expect(generateAiKarteSummary("p1", "t1")).rejects.toThrow(
      "ANTHROPIC_API_KEY が未設定です"
    );
  });

  it("患者データが空の場合はエラーをスローする", async () => {
    tableResponses = {
      intake: { data: [{ id: 1, answers: {}, note: null, created_at: null }], error: null },
      orders: { data: [], error: null },
      reorders: { data: [], error: null },
    };

    await expect(generateAiKarteSummary("p1", "t1")).rejects.toThrow(
      "要約に必要な患者データがありません"
    );
  });

  it("AI応答にJSONが含まれない場合はエラーをスローする", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "JSON出力なしのプレーンテキスト応答" }],
    });

    // answersに何か入れてcontextTextが空にならないようにする
    tableResponses.intake = {
      data: [{ id: 1, answers: { name: "テスト" }, note: null, created_at: null }],
      error: null,
    };

    await expect(generateAiKarteSummary("p1", "t1")).rejects.toThrow(
      "AI応答のJSON解析に失敗しました"
    );
  });

  it("AI応答にSOAPデータがない場合はエラーをスローする", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({ summary: "要約のみ", medications: [] }),
      }],
    });

    // answersに何か入れる
    tableResponses.intake = {
      data: [{ id: 1, answers: { name: "テスト" }, note: null, created_at: null }],
      error: null,
    };

    await expect(generateAiKarteSummary("p1", "t1")).rejects.toThrow(
      "AI応答にSOAPデータが含まれていません"
    );
  });
});

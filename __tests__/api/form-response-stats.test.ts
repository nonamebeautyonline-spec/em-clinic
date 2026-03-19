// __tests__/api/form-response-stats.test.ts
// フォーム回答集計ロジック + API のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { aggregateFormStats, type FormFieldDef } from "@/lib/form-stats";

// ======================================
// 集計ロジック（lib/form-stats.ts）のテスト
// ======================================
describe("aggregateFormStats", () => {
  it("空の回答 → totalResponses: 0, 各フィールド total: 0", () => {
    const fields: FormFieldDef[] = [
      { id: "q1", type: "radio", label: "性別", options: ["男性", "女性"] },
      { id: "q2", type: "text", label: "名前" },
    ];
    const result = aggregateFormStats(fields, []);
    expect(result.totalResponses).toBe(0);
    expect(result.fields).toHaveLength(2);
    expect(result.fields[0].total).toBe(0);
    expect(result.fields[0].options).toEqual([
      { label: "男性", count: 0 },
      { label: "女性", count: 0 },
    ]);
    expect(result.fields[1].total).toBe(0);
  });

  it("radio: 選択肢別カウント", () => {
    const fields: FormFieldDef[] = [
      { id: "q1", type: "radio", label: "性別", options: ["男性", "女性", "その他"] },
    ];
    const responses = [
      { q1: "男性" },
      { q1: "女性" },
      { q1: "男性" },
      { q1: "男性" },
      { q1: "女性" },
    ];
    const result = aggregateFormStats(fields, responses);
    expect(result.totalResponses).toBe(5);
    expect(result.fields[0].total).toBe(5);
    expect(result.fields[0].options).toEqual([
      { label: "男性", count: 3 },
      { label: "女性", count: 2 },
      { label: "その他", count: 0 },
    ]);
  });

  it("dropdown: 選択肢別カウント", () => {
    const fields: FormFieldDef[] = [
      { id: "q1", type: "dropdown", label: "年代", options: ["10代", "20代", "30代"] },
    ];
    const responses = [
      { q1: "20代" },
      { q1: "30代" },
      { q1: "20代" },
    ];
    const result = aggregateFormStats(fields, responses);
    expect(result.fields[0].total).toBe(3);
    expect(result.fields[0].options).toEqual([
      { label: "10代", count: 0 },
      { label: "20代", count: 2 },
      { label: "30代", count: 1 },
    ]);
  });

  it("checkbox: 複数選択対応（回答数と選択数が異なる）", () => {
    const fields: FormFieldDef[] = [
      { id: "q1", type: "checkbox", label: "希望メニュー", options: ["ボトックス", "ヒアルロン酸", "脱毛"] },
    ];
    const responses = [
      { q1: ["ボトックス", "ヒアルロン酸"] },
      { q1: ["脱毛"] },
      { q1: ["ボトックス", "脱毛"] },
    ];
    const result = aggregateFormStats(fields, responses);
    // total は回答者数（3人が回答）
    expect(result.fields[0].total).toBe(3);
    // 選択肢別カウントはチェック数
    expect(result.fields[0].options).toEqual([
      { label: "ボトックス", count: 2 },
      { label: "ヒアルロン酸", count: 1 },
      { label: "脱毛", count: 2 },
    ]);
  });

  it("checkbox: 空配列は回答なしとして扱う", () => {
    const fields: FormFieldDef[] = [
      { id: "q1", type: "checkbox", label: "希望", options: ["A", "B"] },
    ];
    const responses = [
      { q1: ["A"] },
      { q1: [] },
      { q1: ["B"] },
    ];
    const result = aggregateFormStats(fields, responses);
    expect(result.fields[0].total).toBe(2);
  });

  it("prefecture: 都道府県選択もカウント", () => {
    const fields: FormFieldDef[] = [
      { id: "q1", type: "prefecture", label: "都道府県" },
    ];
    const responses = [
      { q1: "東京都" },
      { q1: "大阪府" },
      { q1: "東京都" },
      { q1: "北海道" },
    ];
    const result = aggregateFormStats(fields, responses);
    expect(result.fields[0].total).toBe(4);
    // options は回答値から自動生成される（フォーム定義にoptionsがない場合）
    const labels = result.fields[0].options!.map(o => o.label);
    expect(labels).toContain("東京都");
    expect(labels).toContain("大阪府");
    expect(labels).toContain("北海道");
    expect(result.fields[0].options!.find(o => o.label === "東京都")!.count).toBe(2);
  });

  it("text/textarea: 回答件数のみ", () => {
    const fields: FormFieldDef[] = [
      { id: "q1", type: "text", label: "お名前" },
      { id: "q2", type: "textarea", label: "ご要望" },
    ];
    const responses = [
      { q1: "山田太郎", q2: "特になし" },
      { q1: "田中花子", q2: "" },
      { q1: "", q2: "美白をお願いします" },
    ];
    const result = aggregateFormStats(fields, responses);
    // text: "山田太郎", "田中花子" → 2件（空文字はカウントしない）
    expect(result.fields[0].total).toBe(2);
    expect(result.fields[0].options).toBeUndefined();
    // textarea: "特になし", "美白をお願いします" → 2件
    expect(result.fields[1].total).toBe(2);
  });

  it("date: 回答件数のみ", () => {
    const fields: FormFieldDef[] = [
      { id: "q1", type: "date", label: "希望日" },
    ];
    const responses = [
      { q1: "2026-03-01" },
      { q1: null },
      { q1: "2026-03-15" },
    ];
    const result = aggregateFormStats(fields, responses);
    expect(result.fields[0].total).toBe(2);
  });

  it("heading_sm/heading_md/file はスキップ", () => {
    const fields: FormFieldDef[] = [
      { id: "h1", type: "heading_sm", label: "小見出し" },
      { id: "h2", type: "heading_md", label: "中見出し" },
      { id: "f1", type: "file", label: "ファイル添付" },
      { id: "q1", type: "text", label: "名前" },
    ];
    const responses = [{ q1: "テスト" }];
    const result = aggregateFormStats(fields, responses);
    // heading_sm, heading_md, file はスキップ → 残り1件
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].id).toBe("q1");
  });

  it("null/undefined の回答はカウントしない", () => {
    const fields: FormFieldDef[] = [
      { id: "q1", type: "radio", label: "質問", options: ["A", "B"] },
    ];
    const responses = [
      { q1: "A" },
      { q1: null },
      { q1: undefined },
      {},
      { q1: "" },
      { q1: "B" },
    ];
    const result = aggregateFormStats(fields, responses);
    expect(result.totalResponses).toBe(6);
    // 実際に回答があるのは2件
    expect(result.fields[0].total).toBe(2);
    expect(result.fields[0].options).toEqual([
      { label: "A", count: 1 },
      { label: "B", count: 1 },
    ]);
  });

  it("options未定義のradioフィールドでも動作する", () => {
    const fields: FormFieldDef[] = [
      { id: "q1", type: "radio", label: "質問" },
    ];
    const responses = [
      { q1: "回答A" },
      { q1: "回答A" },
      { q1: "回答B" },
    ];
    const result = aggregateFormStats(fields, responses);
    expect(result.fields[0].total).toBe(3);
    expect(result.fields[0].options).toEqual([
      { label: "回答A", count: 2 },
      { label: "回答B", count: 1 },
    ]);
  });

  it("複数フィールドの混合", () => {
    const fields: FormFieldDef[] = [
      { id: "q1", type: "radio", label: "性別", options: ["男性", "女性"] },
      { id: "q2", type: "text", label: "名前" },
      { id: "q3", type: "checkbox", label: "希望", options: ["A", "B", "C"] },
    ];
    const responses = [
      { q1: "男性", q2: "田中", q3: ["A", "B"] },
      { q1: "女性", q2: "山田", q3: ["C"] },
      { q1: "男性", q2: "", q3: [] },
    ];
    const result = aggregateFormStats(fields, responses);
    expect(result.totalResponses).toBe(3);
    // radio
    expect(result.fields[0].total).toBe(3);
    expect(result.fields[0].options![0]).toEqual({ label: "男性", count: 2 });
    // text
    expect(result.fields[1].total).toBe(2); // 空文字は除外
    // checkbox（空配列はtotalに入らない）
    expect(result.fields[2].total).toBe(2);
    expect(result.fields[2].options![0]).toEqual({ label: "A", count: 1 });
    expect(result.fields[2].options![1]).toEqual({ label: "B", count: 1 });
    expect(result.fields[2].options![2]).toEqual({ label: "C", count: 1 });
  });
});

// ======================================
// API ルートテスト
// ======================================

// モック変数（vi.mock のホイスティング対策でトップレベルに定義）
let mockFormData: unknown = null;
let mockResponsesData: unknown[] = [];

const mockApiChain: Record<string, unknown> = {};
mockApiChain.select = vi.fn(() => mockApiChain);
mockApiChain.eq = vi.fn(() => mockApiChain);
mockApiChain.gte = vi.fn(() => mockApiChain);
mockApiChain.lte = vi.fn(() => mockApiChain);
mockApiChain.order = vi.fn(() => mockApiChain);
mockApiChain.range = vi.fn(() => ({ data: mockResponsesData, error: null }));
mockApiChain.single = vi.fn(() => ({ data: mockFormData, error: null }));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(() => true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  resolveTenantIdOrThrow: vi.fn(() => null),
  withTenant: vi.fn((query: unknown) => query),
  strictWithTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn(() => ({})),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockApiChain) },
}));

describe("GET /api/admin/line/forms/[id]/responses/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormData = null;
    mockResponsesData = [];
    // デフォルトの挙動をリセット
    (mockApiChain.single as ReturnType<typeof vi.fn>).mockImplementation(
      () => ({ data: mockFormData, error: null })
    );
    (mockApiChain.range as ReturnType<typeof vi.fn>).mockImplementation(
      () => ({ data: mockResponsesData, error: null })
    );
  });

  it("フォーム不存在 → 404", async () => {
    mockFormData = null;

    const { GET } = await import("@/app/api/admin/line/forms/[id]/responses/stats/route");
    const req = new Request("http://localhost/api/admin/line/forms/999/responses/stats") as never;
    const res = await GET(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("回答なし → totalResponses: 0", async () => {
    mockFormData = {
      id: 1,
      name: "テストフォーム",
      fields: [
        { id: "q1", type: "radio", label: "性別", options: ["男性", "女性"] },
      ],
    };
    mockResponsesData = [];

    const { GET } = await import("@/app/api/admin/line/forms/[id]/responses/stats/route");
    const req = new Request("http://localhost/api/admin/line/forms/1/responses/stats") as never;
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.totalResponses).toBe(0);
    expect(json.formName).toBe("テストフォーム");
  });

  it("正常な集計結果を返す", async () => {
    mockFormData = {
      id: 1,
      name: "問診フォーム",
      fields: [
        { id: "q1", type: "radio", label: "性別", options: ["男性", "女性"] },
        { id: "q2", type: "text", label: "名前" },
      ],
    };
    mockResponsesData = [
      { answers: { q1: "男性", q2: "田中" }, submitted_at: "2026-03-01T10:00:00Z" },
      { answers: { q1: "女性", q2: "山田" }, submitted_at: "2026-03-02T10:00:00Z" },
      { answers: { q1: "男性", q2: "" }, submitted_at: "2026-03-03T10:00:00Z" },
    ];

    const { GET } = await import("@/app/api/admin/line/forms/[id]/responses/stats/route");
    const req = new Request("http://localhost/api/admin/line/forms/1/responses/stats") as never;
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.totalResponses).toBe(3);
    expect(json.formName).toBe("問診フォーム");
    expect(json.fields).toHaveLength(2);
    // radioフィールド
    expect(json.fields[0].type).toBe("radio");
    expect(json.fields[0].total).toBe(3);
    expect(json.fields[0].options).toEqual([
      { label: "男性", count: 2 },
      { label: "女性", count: 1 },
    ]);
    // textフィールド
    expect(json.fields[1].type).toBe("text");
    expect(json.fields[1].total).toBe(2); // 空文字は除外
  });

  it("heading フィールドは集計から除外", async () => {
    mockFormData = {
      id: 1,
      name: "テスト",
      fields: [
        { id: "h1", type: "heading_md", label: "セクション" },
        { id: "q1", type: "text", label: "名前" },
      ],
    };
    mockResponsesData = [{ answers: { q1: "テスト" }, submitted_at: "2026-03-01T10:00:00Z" }];

    const { GET } = await import("@/app/api/admin/line/forms/[id]/responses/stats/route");
    const req = new Request("http://localhost/api/admin/line/forms/1/responses/stats") as never;
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();
    // heading は API 側で除外
    expect(json.fields).toHaveLength(1);
    expect(json.fields[0].id).toBe("q1");
  });

  it("期間フィルタパラメータが渡される", async () => {
    mockFormData = {
      id: 1,
      name: "テスト",
      fields: [{ id: "q1", type: "text", label: "名前" }],
    };
    mockResponsesData = [];

    const { GET } = await import("@/app/api/admin/line/forms/[id]/responses/stats/route");
    const req = new Request("http://localhost/api/admin/line/forms/1/responses/stats?from=2026-03-01&to=2026-03-07") as never;
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);

    // gte/lte が呼ばれていることを確認
    expect(mockApiChain.gte).toHaveBeenCalledWith("submitted_at", "2026-03-01");
    expect(mockApiChain.lte).toHaveBeenCalledWith("submitted_at", "2026-03-07T23:59:59.999Z");
  });

  it("未認証 → 401", async () => {
    const { verifyAdminAuth } = await import("@/lib/admin-auth");
    (verifyAdminAuth as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const { GET } = await import("@/app/api/admin/line/forms/[id]/responses/stats/route");
    const req = new Request("http://localhost/api/admin/line/forms/1/responses/stats") as never;
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("answers が null の回答はスキップ", async () => {
    mockFormData = {
      id: 1,
      name: "テスト",
      fields: [{ id: "q1", type: "radio", label: "質問", options: ["A", "B"] }],
    };
    mockResponsesData = [
      { answers: { q1: "A" }, submitted_at: "2026-03-01T10:00:00Z" },
      { answers: null, submitted_at: "2026-03-02T10:00:00Z" },
      { answers: { q1: "B" }, submitted_at: "2026-03-03T10:00:00Z" },
    ];

    const { GET } = await import("@/app/api/admin/line/forms/[id]/responses/stats/route");
    const req = new Request("http://localhost/api/admin/line/forms/1/responses/stats") as never;
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();
    // answers が null の行はスキップされる
    expect(json.totalResponses).toBe(2);
    expect(json.fields[0].total).toBe(2);
  });
});

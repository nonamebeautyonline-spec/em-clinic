// __tests__/api/form-submit.test.ts
// フォーム送信API（forms/[slug]/submit/route.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// === モック設定 ===
const mockPushMessage = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/line-push", () => ({ pushMessage: mockPushMessage }));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn(() => ({})),
}));

// Supabase モックチェーン
let mockSingleData: unknown = null;
let mockSingleError: unknown = null;
let mockCountValue: number | null = 0;
let mockInsertSingleData: unknown = null;
let mockInsertSingleError: unknown = null;

const mockChain: Record<string, unknown> = {};
mockChain.select = vi.fn((_cols?: string, _opts?: unknown) => {
  // count クエリの場合
  if (_opts && typeof _opts === "object" && "count" in (_opts as Record<string, unknown>)) {
    return { ...mockChain, count: mockCountValue, data: null, error: null };
  }
  return mockChain;
});
mockChain.insert = vi.fn(() => mockChain);
mockChain.update = vi.fn(() => mockChain);
mockChain.upsert = vi.fn(() => mockChain);
mockChain.delete = vi.fn(() => mockChain);
mockChain.eq = vi.fn(() => mockChain);
mockChain.neq = vi.fn(() => mockChain);
mockChain.in = vi.fn(() => mockChain);
mockChain.not = vi.fn(() => mockChain);
mockChain.limit = vi.fn(() => mockChain);
mockChain.order = vi.fn(() => mockChain);
mockChain.range = vi.fn(() => ({ data: [], error: null }));
mockChain.head = vi.fn(() => ({ count: mockCountValue, data: null, error: null }));
mockChain.single = vi.fn(() => {
  // insert → select → single の場合は insert 用データを返す
  if (mockInsertSingleData !== undefined) {
    return { data: mockInsertSingleData, error: mockInsertSingleError };
  }
  return { data: mockSingleData, error: mockSingleError };
});
mockChain.maybeSingle = vi.fn(() => ({ data: mockSingleData, error: null }));

// count を直接取得できるようにする
Object.defineProperty(mockChain, "count", {
  get: () => mockCountValue,
  set: (v) => { mockCountValue = v; },
  configurable: true,
});

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockChain) },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSingleData = null;
  mockSingleError = null;
  mockCountValue = 0;
  mockInsertSingleData = undefined;
  mockInsertSingleError = null;
  mockPushMessage.mockResolvedValue({ ok: true });
});

// ======================================
// フィールドバリデーション（ロジック再実装テスト）
// ======================================
describe("フォーム フィールドバリデーション", () => {
  // forms/[slug]/submit/route.ts のバリデーションロジックを再実装
  type Field = {
    id: string;
    label: string;
    type?: string;
    required?: boolean;
    hidden?: boolean;
    min_length?: number;
    max_length?: number;
  };

  function validateFields(fields: Field[], answers: Record<string, unknown>): string[] {
    const errors: string[] = [];

    for (const field of fields) {
      if (field.hidden) continue;
      if (field.type === "heading_sm" || field.type === "heading_md") continue;

      const val = answers?.[field.id];

      // 必須チェック
      if (field.required) {
        if (val === undefined || val === null || val === "") {
          errors.push(`「${field.label}」は必須です`);
          continue;
        }
        if (Array.isArray(val) && val.length === 0) {
          errors.push(`「${field.label}」は必須です`);
          continue;
        }
      }

      // 文字数チェック
      if (typeof val === "string" && val.length > 0) {
        if (field.min_length && val.length < field.min_length) {
          errors.push(`「${field.label}」は${field.min_length}文字以上で入力してください`);
        }
        if (field.max_length && val.length > field.max_length) {
          errors.push(`「${field.label}」は${field.max_length}文字以下で入力してください`);
        }
      }
    }

    return errors;
  }

  it("必須フィールド: 値なし（undefined）→ エラー", () => {
    const fields: Field[] = [{ id: "q1", label: "お名前", required: true }];
    const errors = validateFields(fields, {});
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("お名前");
    expect(errors[0]).toContain("必須");
  });

  it("必須フィールド: 空文字 → エラー", () => {
    const fields: Field[] = [{ id: "q1", label: "お名前", required: true }];
    const errors = validateFields(fields, { q1: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("必須");
  });

  it("必須フィールド: 空配列 → エラー", () => {
    const fields: Field[] = [{ id: "q1", label: "希望メニュー", required: true }];
    const errors = validateFields(fields, { q1: [] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("必須");
  });

  it("必須フィールド: 値あり → OK", () => {
    const fields: Field[] = [{ id: "q1", label: "お名前", required: true }];
    const errors = validateFields(fields, { q1: "山田太郎" });
    expect(errors).toHaveLength(0);
  });

  it("文字数: min_length 未満 → エラー", () => {
    const fields: Field[] = [{ id: "q1", label: "備考", min_length: 10 }];
    const errors = validateFields(fields, { q1: "短い" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("10文字以上");
  });

  it("文字数: max_length 超過 → エラー", () => {
    const fields: Field[] = [{ id: "q1", label: "備考", max_length: 5 }];
    const errors = validateFields(fields, { q1: "これは長すぎるテキストです" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("5文字以下");
  });

  it("hidden/heading フィールド → スキップ", () => {
    const fields: Field[] = [
      { id: "h1", label: "セクション見出し", type: "heading_md", required: true },
      { id: "h2", label: "小見出し", type: "heading_sm", required: true },
      { id: "q1", label: "非表示項目", hidden: true, required: true },
    ];
    // 必須だが全てスキップされるため、エラー 0
    const errors = validateFields(fields, {});
    expect(errors).toHaveLength(0);
  });
});

// ======================================
// API ロジックテスト
// ======================================
describe("フォーム送信 API ロジック", () => {
  // ヘルパー: フォーム送信用リクエスト生成
  function makeSubmitRequest(body: Record<string, unknown>) {
    return new Request("http://localhost/api/forms/test-form/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("フォーム不存在 → 404", async () => {
    mockSingleData = null;
    mockSingleError = { message: "not found" };

    const { POST } = await import("@/app/api/forms/[slug]/submit/route");
    const req = makeSubmitRequest({ answers: {} });

    const res = await POST(req as never, { params: Promise.resolve({ slug: "nonexistent" }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("見つかりません");
  });

  it("未公開フォーム → 403", async () => {
    mockSingleData = { id: 1, fields: [], settings: {}, is_published: false };
    mockSingleError = null;

    const { POST } = await import("@/app/api/forms/[slug]/submit/route");
    const req = makeSubmitRequest({ answers: {} });

    const res = await POST(req as never, { params: Promise.resolve({ slug: "draft-form" }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("公開されていません");
  });

  it("期限切れフォーム → 403", async () => {
    mockSingleData = {
      id: 1,
      fields: [],
      settings: { deadline: "2020-01-01T00:00:00.000Z" },
      is_published: true,
    };
    mockSingleError = null;

    const { POST } = await import("@/app/api/forms/[slug]/submit/route");
    const req = makeSubmitRequest({ answers: {} });

    const res = await POST(req as never, { params: Promise.resolve({ slug: "expired-form" }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("期限");
  });

  it("先着上限到達 → 403", async () => {
    mockSingleData = {
      id: 1,
      fields: [],
      settings: { max_responses: 10 },
      is_published: true,
    };
    mockSingleError = null;

    // countクエリが上限と同数を返す
    mockCountValue = 10;

    // select の挙動を上書き: count クエリ判定
    (mockChain.select as ReturnType<typeof vi.fn>).mockImplementation((_cols?: string, opts?: unknown) => {
      if (opts && typeof opts === "object" && "count" in (opts as Record<string, unknown>)) {
        // head: true のカウントクエリ → count プロパティ付きオブジェクトを返す
        const countResult = { ...mockChain, count: 10, data: null, error: null };
        return countResult;
      }
      return mockChain;
    });

    const { POST } = await import("@/app/api/forms/[slug]/submit/route");
    const req = makeSubmitRequest({ answers: {} });

    const res = await POST(req as never, { params: Promise.resolve({ slug: "full-form" }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("上限");
  });

  it("正常送信 → {ok:true, response_id}", async () => {
    // forms.single() でフォーム取得
    const formData = {
      id: 1,
      fields: [
        { id: "q1", label: "お名前", required: true },
      ],
      settings: { thanks_message: "ありがとうございます" },
      is_published: true,
    };

    // single() の呼び出しを追跡
    let singleCallCount = 0;
    (mockChain.single as ReturnType<typeof vi.fn>).mockImplementation(() => {
      singleCallCount++;
      if (singleCallCount === 1) {
        // 1回目: フォーム取得
        return { data: formData, error: null };
      }
      // 2回目: form_responses insert
      return { data: { id: "resp_001" }, error: null };
    });

    // maybeSingle: intake の patient_id 取得（line_user_id なしの場合は呼ばれない）
    mockSingleData = null;
    mockCountValue = 0;

    const { POST } = await import("@/app/api/forms/[slug]/submit/route");
    const req = makeSubmitRequest({
      answers: { q1: "山田太郎" },
    });

    const res = await POST(req as never, { params: Promise.resolve({ slug: "active-form" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.response_id).toBe("resp_001");
    expect(json.thanks_message).toBe("ありがとうございます");
  });
});

// __tests__/api/inquiries.test.ts
// お問い合わせフォーム送信APIのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 共通モック
// ============================================================
type SupabaseChain = Record<string, ReturnType<typeof vi.fn>>;
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: SupabaseChain = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "or", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "count", "csv", "rpc",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  tenantPayload: vi.fn((tid: unknown) => (tid ? { tenant_id: tid } : {})),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: Request, _schema: unknown) => {
    const body = await req.clone().json();
    return { data: body };
  }),
}));

vi.mock("@/lib/validations/inquiry", () => ({
  inquirySchema: {},
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((phone: string) => phone ? `0${phone.replace(/^0/, "")}` : ""),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ limited: false })),
}));

// NextRequest互換
function createReq(method: string, url: string, body?: unknown) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json", "x-forwarded-for": "192.168.1.1" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as Request & { nextUrl: URL };
  req.nextUrl = new URL(url);
  return req;
}

// ============================================================
// テスト対象インポート
// ============================================================
import { POST as inquiriesPOST } from "@/app/api/inquiries/route";

beforeEach(async () => {
  vi.clearAllMocks();
  tableChains = {};
  // checkRateLimitのデフォルト値を毎回リセット
  const { checkRateLimit } = await import("@/lib/rate-limit");
  (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ limited: false });
  // sendEmailのデフォルト値をリセット
  const { sendEmail } = await import("@/lib/email");
  (sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe("inquiries API", () => {
  it("POST レート制限 → 429", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ limited: true });

    const res = await inquiriesPOST(createReq("POST", "http://localhost/api/inquiries", {
      contact_name: "テスト",
      email: "test@example.com",
      has_existing_line: false,
    }) as any);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBe("RATE_LIMITED");
  });

  it("POST 正常送信 → 200", async () => {
    const inquiriesChain = createChain({ data: null, error: null });
    tableChains["inquiries"] = inquiriesChain;

    const res = await inquiriesPOST(createReq("POST", "http://localhost/api/inquiries", {
      contact_name: "田中太郎",
      email: "tanaka@example.com",
      has_existing_line: true,
      existing_line_detail: "Lステップ利用中",
      company_name: "テスト株式会社",
      service_name: "テストサービス",
      phone: "09012345678",
      message: "導入を検討中です",
      implementation_timing: "1ヶ月以内",
      referrer_page: "https://l-ope.jp/clinic/",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "spring2026",
      product: "clinic",
      industry: "clinic",
    }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST 最小パラメータで正常送信", async () => {
    const inquiriesChain = createChain({ data: null, error: null });
    tableChains["inquiries"] = inquiriesChain;

    const res = await inquiriesPOST(createReq("POST", "http://localhost/api/inquiries", {
      contact_name: "テスト",
      email: "test@example.com",
      has_existing_line: false,
    }) as any);
    expect(res.status).toBe(200);
  });

  it("POST DB保存エラー → 500", async () => {
    const inquiriesChain = createChain({ data: null, error: { message: "DB error" } });
    tableChains["inquiries"] = inquiriesChain;

    const res = await inquiriesPOST(createReq("POST", "http://localhost/api/inquiries", {
      contact_name: "テスト",
      email: "test@example.com",
      has_existing_line: false,
    }) as any);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("DB_ERROR");
  });

  it("POST メール送信失敗 → 200（失敗しても成功レスポンス）", async () => {
    const inquiriesChain = createChain({ data: null, error: null });
    tableChains["inquiries"] = inquiriesChain;

    const { sendEmail } = await import("@/lib/email");
    (sendEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("SMTP error"));

    const res = await inquiriesPOST(createReq("POST", "http://localhost/api/inquiries", {
      contact_name: "テスト",
      email: "test@example.com",
      has_existing_line: false,
    }) as any);
    expect(res.status).toBe(200);
  });

  it("POST 電話番号なし → phoneは空文字", async () => {
    const inquiriesChain = createChain({ data: null, error: null });
    tableChains["inquiries"] = inquiriesChain;

    const res = await inquiriesPOST(createReq("POST", "http://localhost/api/inquiries", {
      contact_name: "テスト",
      email: "test@example.com",
      has_existing_line: false,
    }) as any);
    expect(res.status).toBe(200);
  });

  it("POST 会社名・サービス名付き → メール件名に含まれる", async () => {
    const inquiriesChain = createChain({ data: null, error: null });
    tableChains["inquiries"] = inquiriesChain;

    const { sendEmail } = await import("@/lib/email");
    (sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await inquiriesPOST(createReq("POST", "http://localhost/api/inquiries", {
      contact_name: "山田花子",
      email: "yamada@example.com",
      has_existing_line: true,
      company_name: "サンプル株式会社",
    }) as any);
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining("山田花子"),
    }));
  });
});

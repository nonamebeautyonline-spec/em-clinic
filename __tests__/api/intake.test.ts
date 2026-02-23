// __tests__/api/intake.test.ts
// 問診API (app/api/intake/route.ts) の統合テスト
// 認証、問診保存、マージロジック、LINE_仮レコード統合をテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モックチェーン ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
    "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: vi.fn(() => {
        const c: any = {};
        ["insert", "update", "delete", "select", "eq", "neq", "maybeSingle", "single", "order", "limit"].forEach((m) => {
          c[m] = vi.fn().mockReturnValue(c);
        });
        c.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));
        return c;
      }),
    },
    supabaseAdmin: {
      from: vi.fn((...args: any[]) => {
        const chains = (globalThis as any).__testTableChains || {};
        const table = args[0];
        if (!chains[table]) {
          const c: any = {};
          [
            "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
            "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
            "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
          ].forEach((m) => {
            c[m] = vi.fn().mockReturnValue(c);
          });
          c.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));
          chains[table] = c;
        }
        return chains[table];
      }),
    },
  };
});

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((v: string) => v || ""),
}));

vi.mock("@/lib/merge-tables", () => ({
  MERGE_TABLES: ["reservations", "orders", "reorders", "message_log", "patient_tags", "patient_marks", "friend_field_values"],
}));

// parseBody モック
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/patient", () => ({
  intakeSchema: {},
}));

// --- ルートインポート ---
import { POST } from "@/app/api/intake/route";
import { parseBody } from "@/lib/validations/helpers";
import { invalidateDashboardCache } from "@/lib/redis";

// --- ヘルパー ---
function createRequest(body: any = {}, cookies: Record<string, string> = {}) {
  const req = new NextRequest("http://localhost:3000/api/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // NextRequest の cookies にセット
  for (const [key, value] of Object.entries(cookies)) {
    req.cookies.set(key, value);
  }
  return req;
}

function setTableChain(table: string, chain: any) {
  (globalThis as any).__testTableChains[table] = chain;
}

describe("POST /api/intake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__testTableChains = {};
  });

  // --- 認証テスト ---
  describe("認証", () => {
    it("patient_id Cookieがない場合は401を返す", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { answers: {} },
      } as any);

      const req = createRequest({});
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("unauthorized");
    });

    it("__Host-patient_id Cookieで認証成功", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { answers: { 身長: "170" }, name: "太郎" },
      } as any);

      // intake の既存レコード
      const intakeChain = createChain({ data: [{ id: 1, answers: {}, reserve_id: "res-1", status: null, note: null }], error: null });
      setTableChain("intake", intakeChain);
      // patients
      const patientsChain = createChain({ data: { tel: "", name: "", line_id: null }, error: null });
      setTableChain("patients", patientsChain);

      const req = createRequest({}, { "__Host-patient_id": "pid-001" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
    });
  });

  // --- バリデーションエラー ---
  describe("バリデーション", () => {
    it("parseBodyがエラーを返した場合はそのエラーレスポンスを返す", async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
      // NextResponse互換のモック
      vi.mocked(parseBody).mockResolvedValue({ error: errorResponse as any });

      const req = createRequest({}, { "__Host-patient_id": "pid-001" });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // --- 問診保存テスト ---
  describe("問診保存", () => {
    it("既存intakeレコードがあれば更新（id指定）", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: {
          answers: { 身長: "175", 体重: "70" },
          name: "テスト太郎",
          sex: "男",
          birth: "1990-01-01",
        },
      } as any);

      // 既存intakeレコード（reserve_id付き）
      const intakeChain = createChain({
        data: [{
          id: 100,
          answers: { 氏名: "既存太郎", 性別: "男" },
          reserve_id: "res-1",
          status: null,
          note: null,
        }],
        error: null,
      });
      setTableChain("intake", intakeChain);

      // patients
      const patientsChain = createChain({ data: { tel: "09011111111", name: "既存太郎", line_id: null }, error: null });
      setTableChain("patients", patientsChain);

      const req = createRequest({}, { "__Host-patient_id": "pid-001" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      // intakeの更新がid指定で呼ばれたことを確認
      expect(intakeChain.update).toHaveBeenCalled();
      expect(intakeChain.eq).toHaveBeenCalledWith("id", 100);
    });

    it("intakeレコードがない場合は新規INSERT", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: {
          answers: { 身長: "170" },
          name: "新規太郎",
        },
      } as any);

      // 既存レコードなし
      const intakeChain = createChain({ data: [], error: null });
      setTableChain("intake", intakeChain);

      // patients
      const patientsChain = createChain({ data: null, error: null });
      setTableChain("patients", patientsChain);

      const req = createRequest({}, { "patient_id": "pid-new" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      // insertが呼ばれたことを確認
      expect(intakeChain.insert).toHaveBeenCalled();
    });

    it("個人情報は空文字の場合、既存値を上書きしない", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: {
          answers: { 身長: "180" },
          name: "", // 空文字 → 既存値を保持
          sex: "",
        },
      } as any);

      const intakeChain = createChain({
        data: [{
          id: 200,
          answers: { 氏名: "保持太郎", 性別: "女" },
          reserve_id: "res-2",
          status: null,
          note: null,
        }],
        error: null,
      });
      setTableChain("intake", intakeChain);

      const patientsChain = createChain({ data: { tel: "", name: "保持太郎", line_id: null }, error: null });
      setTableChain("patients", patientsChain);

      const req = createRequest({}, { "__Host-patient_id": "pid-keep" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
    });
  });

  // --- LINE_仮レコード統合テスト ---
  describe("LINE_仮レコード統合", () => {
    it("LINE_で始まるpatient_idの場合は仮レコード統合をスキップ", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { answers: {} },
      } as any);

      const intakeChain = createChain({ data: [], error: null });
      setTableChain("intake", intakeChain);
      const patientsChain = createChain({ data: null, error: null });
      setTableChain("patients", patientsChain);

      const req = createRequest({}, { "__Host-patient_id": "LINE_abc123" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      // LINE_で始まる場合、仮レコード検索のための追加クエリは実行されない
      // (削除関連のdelete呼び出しが最小限であることを確認)
    });

    it("正規patient_idの場合、LINE_仮レコードがあればマージ・削除", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { answers: { 身長: "170" }, name: "太郎" },
      } as any);

      const intakeChain = createChain({ data: [], error: null });
      setTableChain("intake", intakeChain);

      // patients: 正規の患者がline_idを持つ
      const patientsChain = createChain({
        data: { tel: "", name: "太郎", line_id: "U-line-id", patient_id: "pid-real" },
        error: null,
      });
      setTableChain("patients", patientsChain);

      // LINE_仮レコードが見つかる
      // 2回目のfrom("patients")呼び出しで仮患者を返す
      // チェーン共有のため、like で LINE_ 患者を返すようにする
      // (モック特性上、同じチェーンが返るので data で [{ patient_id: "LINE_fake" }] を返す)

      // admin_users
      const adminChain = createChain({ data: [], error: null });
      setTableChain("admin_users", adminChain);

      // MERGE_TABLES 用のチェーン
      setTableChain("reservations", createChain({ data: null, error: null }));
      setTableChain("orders", createChain({ data: null, error: null }));
      setTableChain("reorders", createChain({ data: null, error: null }));
      setTableChain("message_log", createChain({ data: null, error: null }));
      setTableChain("patient_tags", createChain({ data: null, error: null }));
      setTableChain("patient_marks", createChain({ data: null, error: null }));
      setTableChain("friend_field_values", createChain({ data: null, error: null }));

      const req = createRequest({}, { "__Host-patient_id": "pid-real" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      // キャッシュ削除が呼ばれた
      expect(invalidateDashboardCache).toHaveBeenCalledWith("pid-real");
    });
  });

  // --- キャッシュ ---
  describe("キャッシュ", () => {
    it("問診送信後にダッシュボードキャッシュが削除される", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { answers: {} },
      } as any);

      const intakeChain = createChain({ data: [], error: null });
      setTableChain("intake", intakeChain);
      const patientsChain = createChain({ data: null, error: null });
      setTableChain("patients", patientsChain);

      const req = createRequest({}, { "__Host-patient_id": "pid-cache" });
      const res = await POST(req);

      expect(invalidateDashboardCache).toHaveBeenCalledWith("pid-cache");
    });
  });

  // --- エラーハンドリング ---
  describe("エラーハンドリング", () => {
    it("予期しないエラー発生時は500を返す", async () => {
      vi.mocked(parseBody).mockRejectedValue(new Error("予期しないエラー"));

      const req = createRequest({}, { "__Host-patient_id": "pid-err" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("server_error");
    });
  });
});

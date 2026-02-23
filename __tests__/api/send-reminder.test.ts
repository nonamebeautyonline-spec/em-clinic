// __tests__/api/send-reminder.test.ts
// 診療リマインドLINE一括送信API (app/api/admin/reservations/send-reminder/route.ts) の統合テスト
// 管理者認証、プレビュー（GET）、一斉送信（POST）、テストモードをテスト
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

// 管理者認証モック
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue({ userId: "admin-1", role: "admin", tenantId: "test-tenant" }),
}));

// LINE push モック
vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

// auto-reminder モック
vi.mock("@/lib/auto-reminder", () => ({
  formatReservationTime: vi.fn((date: string, time: string) => `${date} ${time}`),
  buildReminderMessage: vi.fn((time: string) => `リマインド: ${time}`),
}));

// parseBody モック
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/admin-operations", () => ({
  sendReminderSchema: {},
}));

// --- ルートインポート ---
import { GET, POST } from "@/app/api/admin/reservations/send-reminder/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { parseBody } from "@/lib/validations/helpers";

// --- ヘルパー ---
function createGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/admin/reservations/send-reminder");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

function createPostRequest(body: any = {}) {
  return new NextRequest("http://localhost:3000/api/admin/reservations/send-reminder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setTableChain(table: string, chain: any) {
  (globalThis as any).__testTableChains[table] = chain;
}

describe("send-reminder API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__testTableChains = {};
    vi.mocked(verifyAdminAuth).mockResolvedValue({ userId: "admin-1", role: "admin", tenantId: "test-tenant" } as any);
  });

  // --- GET: プレビュー ---
  describe("GET /api/admin/reservations/send-reminder", () => {
    it("認証失敗で401を返す", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValue(null as any);

      const req = createGetRequest({ date: "2026-02-23" });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("dateパラメータなしで400を返す", async () => {
      const req = createGetRequest();
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("date required");
    });

    it("正常にプレビューデータを返す", async () => {
      // reservations
      const resvChain = createChain({
        data: [
          { reserve_id: "res-1", patient_id: "pid-001", reserved_time: "13:00:00" },
          { reserve_id: "res-2", patient_id: "pid-002", reserved_time: "14:00:00" },
        ],
        error: null,
      });
      setTableChain("reservations", resvChain);

      // patients
      const patientsChain = createChain({
        data: [
          { patient_id: "pid-001", name: "太郎", line_id: "U-line-001" },
          { patient_id: "pid-002", name: "花子", line_id: "" },
        ],
        error: null,
      });
      setTableChain("patients", patientsChain);

      const req = createGetRequest({ date: "2026-02-23" });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.patients).toHaveLength(2);
      expect(body.summary.total).toBe(2);
      expect(body.summary.sendable).toBe(1); // line_idあり1名
      expect(body.summary.no_uid).toBe(1);   // line_idなし1名
      expect(body).toHaveProperty("sampleMessage");
    });

    it("予約なしの場合でも正常に返す", async () => {
      const resvChain = createChain({ data: [], error: null });
      setTableChain("reservations", resvChain);

      const req = createGetRequest({ date: "2026-02-23" });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.patients).toHaveLength(0);
      expect(body.summary.total).toBe(0);
    });
  });

  // --- POST: 一斉送信 ---
  describe("POST /api/admin/reservations/send-reminder", () => {
    it("認証失敗で401を返す", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValue(null as any);
      vi.mocked(parseBody).mockResolvedValue({ data: { date: "2026-02-23" } } as any);

      const req = createPostRequest({ date: "2026-02-23" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(401);
    });

    it("バリデーションエラーの場合はエラーレスポンスを返す", async () => {
      const errorRes = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), { status: 400 });
      vi.mocked(parseBody).mockResolvedValue({ error: errorRes } as any);

      const req = createPostRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("全対象者に一斉送信して結果を返す", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { date: "2026-02-23" },
      } as any);

      // reservations
      const resvChain = createChain({
        data: [
          { reserve_id: "res-1", patient_id: "pid-001", reserved_time: "13:00:00" },
          { reserve_id: "res-2", patient_id: "pid-002", reserved_time: "14:00:00" },
        ],
        error: null,
      });
      setTableChain("reservations", resvChain);

      // patients
      const patientsChain = createChain({
        data: [
          { patient_id: "pid-001", name: "太郎", line_id: "U-line-001" },
          { patient_id: "pid-002", name: "花子", line_id: "U-line-002" },
        ],
        error: null,
      });
      setTableChain("patients", patientsChain);

      // message_log
      const msgChain = createChain({ data: null, error: null });
      setTableChain("message_log", msgChain);

      vi.mocked(pushMessage).mockResolvedValue({ ok: true } as any);

      const req = createPostRequest({ date: "2026-02-23" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.sent).toBe(2);
      expect(body.failed).toBe(0);
      expect(body.results).toHaveLength(2);
      // pushMessage が2回呼ばれた
      expect(pushMessage).toHaveBeenCalledTimes(2);
    });

    it("LINE IDなしの患者は no_uid としてスキップ", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { date: "2026-02-23" },
      } as any);

      const resvChain = createChain({
        data: [
          { reserve_id: "res-1", patient_id: "pid-001", reserved_time: "13:00:00" },
        ],
        error: null,
      });
      setTableChain("reservations", resvChain);

      // line_id が空
      const patientsChain = createChain({
        data: [{ patient_id: "pid-001", name: "太郎", line_id: "" }],
        error: null,
      });
      setTableChain("patients", patientsChain);
      setTableChain("message_log", createChain({ data: null, error: null }));

      const req = createPostRequest({ date: "2026-02-23" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.sent).toBe(0);
      expect(body.noUid).toBe(1);
    });

    it("pushMessage失敗時はfailedにカウントされる", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { date: "2026-02-23" },
      } as any);

      const resvChain = createChain({
        data: [
          { reserve_id: "res-1", patient_id: "pid-001", reserved_time: "13:00:00" },
        ],
        error: null,
      });
      setTableChain("reservations", resvChain);

      const patientsChain = createChain({
        data: [{ patient_id: "pid-001", name: "太郎", line_id: "U-line-001" }],
        error: null,
      });
      setTableChain("patients", patientsChain);
      setTableChain("message_log", createChain({ data: null, error: null }));

      // pushMessage が失敗
      vi.mocked(pushMessage).mockResolvedValue({ ok: false } as any);

      const req = createPostRequest({ date: "2026-02-23" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.sent).toBe(0);
      expect(body.failed).toBe(1);
    });

    it("patient_ids で指定した患者のみに送信", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { date: "2026-02-23", patient_ids: ["pid-002"] },
      } as any);

      const resvChain = createChain({
        data: [
          { reserve_id: "res-1", patient_id: "pid-001", reserved_time: "13:00:00" },
          { reserve_id: "res-2", patient_id: "pid-002", reserved_time: "14:00:00" },
        ],
        error: null,
      });
      setTableChain("reservations", resvChain);

      const patientsChain = createChain({
        data: [
          { patient_id: "pid-001", name: "太郎", line_id: "U-line-001" },
          { patient_id: "pid-002", name: "花子", line_id: "U-line-002" },
        ],
        error: null,
      });
      setTableChain("patients", patientsChain);
      setTableChain("message_log", createChain({ data: null, error: null }));

      vi.mocked(pushMessage).mockResolvedValue({ ok: true } as any);

      const req = createPostRequest({ date: "2026-02-23", patient_ids: ["pid-002"] });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.sent).toBe(1);
      expect(body.total).toBe(1);
      // pid-002 のみに送信
      expect(pushMessage).toHaveBeenCalledTimes(1);
      expect(pushMessage).toHaveBeenCalledWith("U-line-002", expect.any(Array), "test-tenant");
    });

    it("testOnly=true でテスト対象にのみ送信", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { date: "2026-02-23", testOnly: true },
      } as any);

      // テスト対象 PID: 20251200128 が予約に含まれるケース
      const resvChain = createChain({
        data: [
          { reserve_id: "res-1", patient_id: "20251200128", reserved_time: "13:00:00" },
          { reserve_id: "res-2", patient_id: "pid-002", reserved_time: "14:00:00" },
        ],
        error: null,
      });
      setTableChain("reservations", resvChain);

      const patientsChain = createChain({
        data: [
          { patient_id: "20251200128", name: "管理者", line_id: "U-admin" },
          { patient_id: "pid-002", name: "花子", line_id: "U-line-002" },
        ],
        error: null,
      });
      setTableChain("patients", patientsChain);
      setTableChain("message_log", createChain({ data: null, error: null }));

      vi.mocked(pushMessage).mockResolvedValue({ ok: true } as any);

      const req = createPostRequest({ date: "2026-02-23", testOnly: true });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.testOnly).toBe(true);
      expect(body.total).toBe(1); // テスト対象のみ
    });
  });

  // --- エラーハンドリング ---
  describe("エラーハンドリング", () => {
    it("DBエラー時にGET 500を返す", async () => {
      // reservations が DBエラー
      const resvChain = createChain({ data: null, error: { message: "DB error" } });
      setTableChain("reservations", resvChain);

      const req = createGetRequest({ date: "2026-02-23" });
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("取得エラー");
    });

    it("POST で予期しないエラーが発生した場合は500を返す", async () => {
      vi.mocked(parseBody).mockRejectedValue(new Error("予期しないエラー"));

      const req = createPostRequest({ date: "2026-02-23" });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
    });
  });
});

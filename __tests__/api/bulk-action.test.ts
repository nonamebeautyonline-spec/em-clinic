// __tests__/api/bulk-action.test.ts
// 患者一括アクション API（patients/bulk/action/route.ts）のテスト
// アクション取得、ステップ展開（send_text/send_template/tag_add/tag_remove/mark_change）
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---

let mockAuthorized = true;
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(async () => mockAuthorized),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// pushMessage モック
let mockPushResult = { ok: true };
vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn(async () => mockPushResult),
}));

// テーブル別結果制御
type MockResult = { data: any; error?: any; count?: number | null };
let mockResultsByTable: Record<string, MockResult> = {};
let insertCalls: { table: string; data: any }[] = [];
let upsertCalls: { table: string; data: any }[] = [];
let deleteCalls: { table: string }[] = [];

function createChain(table: string) {
  const chain: any = {};
  const methods = [
    "select", "eq", "neq", "in", "is", "not", "or",
    "ilike", "order", "limit", "single", "maybeSingle",
    "gte", "lte", "like", "range",
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });

  chain.insert = vi.fn().mockImplementation((data: any) => {
    insertCalls.push({ table, data });
    return chain;
  });

  chain.upsert = vi.fn().mockImplementation((data: any) => {
    upsertCalls.push({ table, data });
    return chain;
  });

  chain.delete = vi.fn().mockImplementation(() => {
    deleteCalls.push({ table });
    return chain;
  });

  chain.then = (resolve: any, reject: any) => {
    const result = mockResultsByTable[table] || { data: null, error: null };
    return Promise.resolve(result).then(resolve, reject);
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => createChain(table)),
  },
}));

// --- テスト ---

import { POST } from "@/app/api/admin/patients/bulk/action/route";
import { NextRequest } from "next/server";

function createReq(body: any) {
  return new NextRequest("http://localhost/api/admin/patients/bulk/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("患者一括アクション API", () => {
  beforeEach(() => {
    mockAuthorized = true;
    mockPushResult = { ok: true };
    mockResultsByTable = {};
    insertCalls = [];
    upsertCalls = [];
    deleteCalls = [];
    vi.clearAllMocks();
  });

  // =============================================
  // 認証テスト
  // =============================================
  describe("認証", () => {
    it("認証失敗時に 401 を返す", async () => {
      mockAuthorized = false;
      const res = await POST(createReq({ patient_ids: ["P001"], action_id: 1 }));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  // =============================================
  // バリデーション
  // =============================================
  describe("バリデーション", () => {
    it("patient_ids が空配列の場合 400 を返す", async () => {
      const res = await POST(createReq({ patient_ids: [], action_id: 1 }));
      expect(res.status).toBe(400);
    });

    it("action_id がない場合 400 を返す", async () => {
      const res = await POST(createReq({ patient_ids: ["P001"] }));
      expect(res.status).toBe(400);
    });
  });

  // =============================================
  // アクション未存在
  // =============================================
  describe("アクション未存在", () => {
    it("アクションが見つからない場合 404 を返す", async () => {
      mockResultsByTable["actions"] = { data: null, error: null };
      const res = await POST(createReq({ patient_ids: ["P001"], action_id: 999 }));
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("アクションが見つかりません");
    });
  });

  // =============================================
  // send_text ステップ
  // =============================================
  describe("send_text ステップ", () => {
    it("LINE UID がある患者にテキストを送信", async () => {
      mockResultsByTable["actions"] = {
        data: {
          id: 1,
          name: "テストアクション",
          steps: [{ type: "send_text", content: "{name}様、お知らせです" }],
        },
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P001", line_id: "U001", name: "山田太郎" }],
        error: null,
      };
      mockResultsByTable["message_log"] = { data: null, error: null };
      mockResultsByTable["tag_definitions"] = { data: null, error: null };

      const res = await POST(createReq({ patient_ids: ["P001"], action_id: 1 }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.success).toBe(1);
      expect(body.failed).toBe(0);
    });

    it("LINE UID がない患者は no_uid でログ記録", async () => {
      mockResultsByTable["actions"] = {
        data: {
          id: 1,
          name: "テストアクション",
          steps: [{ type: "send_text", content: "テスト" }],
        },
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P001", line_id: null, name: "佐藤" }],
        error: null,
      };
      mockResultsByTable["message_log"] = { data: null, error: null };
      mockResultsByTable["tag_definitions"] = { data: null, error: null };

      const res = await POST(createReq({ patient_ids: ["P001"], action_id: 1 }));
      const body = await res.json();
      // LINE UID無しの場合は failed にカウント
      expect(body.failed).toBe(1);
      // message_log に no_uid で記録
      const noUidInserts = insertCalls.filter(
        (c) => c.table === "message_log" && c.data.status === "no_uid"
      );
      expect(noUidInserts.length).toBeGreaterThanOrEqual(1);
    });

    it("content に {name} と {patient_id} プレースホルダーが展開される", async () => {
      const { pushMessage } = await import("@/lib/line-push");
      mockResultsByTable["actions"] = {
        data: {
          id: 1,
          name: "通知",
          steps: [{ type: "send_text", content: "{name}様 (ID:{patient_id})" }],
        },
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P001", line_id: "U001", name: "田中" }],
        error: null,
      };
      mockResultsByTable["message_log"] = { data: null, error: null };
      mockResultsByTable["tag_definitions"] = { data: null, error: null };

      await POST(createReq({ patient_ids: ["P001"], action_id: 1 }));

      // pushMessage の引数を確認
      expect(pushMessage).toHaveBeenCalledWith(
        "U001",
        [{ type: "text", text: "田中様 (ID:P001)" }],
        "test-tenant"
      );
    });
  });

  // =============================================
  // send_template ステップ
  // =============================================
  describe("send_template ステップ", () => {
    it("テンプレートの内容でメッセージ送信", async () => {
      mockResultsByTable["actions"] = {
        data: {
          id: 2,
          name: "テンプレート送信",
          steps: [{ type: "send_template", template_id: 10 }],
        },
        error: null,
      };
      mockResultsByTable["message_templates"] = {
        data: [{ id: 10, content: "こんにちは{name}さん" }],
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P001", line_id: "U001", name: "高橋" }],
        error: null,
      };
      mockResultsByTable["message_log"] = { data: null, error: null };
      mockResultsByTable["tag_definitions"] = { data: null, error: null };

      const res = await POST(createReq({ patient_ids: ["P001"], action_id: 2 }));
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.success).toBe(1);
    });

    it("テンプレートが見つからない場合はステップ失敗", async () => {
      mockResultsByTable["actions"] = {
        data: {
          id: 3,
          name: "不明テンプレート",
          steps: [{ type: "send_template", template_id: 999 }],
        },
        error: null,
      };
      mockResultsByTable["message_templates"] = { data: [], error: null };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P001", line_id: "U001", name: "テスト" }],
        error: null,
      };
      mockResultsByTable["message_log"] = { data: null, error: null };
      mockResultsByTable["tag_definitions"] = { data: null, error: null };

      const res = await POST(createReq({ patient_ids: ["P001"], action_id: 3 }));
      const body = await res.json();
      // テンプレート未発見 → allStepsOk = false → failed
      expect(body.failed).toBe(1);
    });
  });

  // =============================================
  // tag_add / tag_remove ステップ
  // =============================================
  describe("tag_add ステップ", () => {
    it("タグを患者に追加", async () => {
      mockResultsByTable["actions"] = {
        data: {
          id: 4,
          name: "タグ追加",
          steps: [{ type: "tag_add", tag_id: 5 }],
        },
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P001", line_id: "U001", name: "テスト" }],
        error: null,
      };
      mockResultsByTable["patient_tags"] = { data: null, error: null };
      mockResultsByTable["message_log"] = { data: null, error: null };
      mockResultsByTable["tag_definitions"] = { data: [{ id: 5, name: "VIP" }], error: null };

      const res = await POST(createReq({ patient_ids: ["P001"], action_id: 4 }));
      const body = await res.json();
      expect(body.ok).toBe(true);

      // patient_tags に upsert されたことを確認
      const tagUpserts = upsertCalls.filter((c) => c.table === "patient_tags");
      expect(tagUpserts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("tag_remove ステップ", () => {
    it("タグを患者から削除", async () => {
      mockResultsByTable["actions"] = {
        data: {
          id: 5,
          name: "タグ削除",
          steps: [{ type: "tag_remove", tag_id: 5 }],
        },
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P001", line_id: "U001", name: "テスト" }],
        error: null,
      };
      mockResultsByTable["patient_tags"] = { data: null, error: null };
      mockResultsByTable["message_log"] = { data: null, error: null };
      mockResultsByTable["tag_definitions"] = { data: [{ id: 5, name: "VIP" }], error: null };

      const res = await POST(createReq({ patient_ids: ["P001"], action_id: 5 }));
      const body = await res.json();
      expect(body.ok).toBe(true);

      // patient_tags に delete が呼ばれたことを確認
      const tagDeletes = deleteCalls.filter((c) => c.table === "patient_tags");
      expect(tagDeletes.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =============================================
  // mark_change ステップ
  // =============================================
  describe("mark_change ステップ", () => {
    it("対応マークを更新", async () => {
      mockResultsByTable["actions"] = {
        data: {
          id: 6,
          name: "マーク変更",
          steps: [{ type: "mark_change", mark: "urgent", note: "緊急対応" }],
        },
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P001", line_id: "U001", name: "テスト" }],
        error: null,
      };
      mockResultsByTable["patient_marks"] = { data: null, error: null };
      mockResultsByTable["message_log"] = { data: null, error: null };
      mockResultsByTable["tag_definitions"] = { data: null, error: null };

      const res = await POST(createReq({ patient_ids: ["P001"], action_id: 6 }));
      const body = await res.json();
      expect(body.ok).toBe(true);

      // patient_marks に upsert されたことを確認
      const markUpserts = upsertCalls.filter((c) => c.table === "patient_marks");
      expect(markUpserts.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =============================================
  // 複数患者の処理
  // =============================================
  describe("複数患者", () => {
    it("複数患者に順番に実行し成功/失敗をカウント", async () => {
      mockResultsByTable["actions"] = {
        data: {
          id: 7,
          name: "一括通知",
          steps: [{ type: "send_text", content: "お知らせ" }],
        },
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [
          { patient_id: "P001", line_id: "U001", name: "患者1" },
          { patient_id: "P002", line_id: null, name: "患者2" },
          { patient_id: "P003", line_id: "U003", name: "患者3" },
        ],
        error: null,
      };
      mockResultsByTable["message_log"] = { data: null, error: null };
      mockResultsByTable["tag_definitions"] = { data: null, error: null };

      const res = await POST(createReq({ patient_ids: ["P001", "P002", "P003"], action_id: 7 }));
      const body = await res.json();
      expect(body.total).toBe(3);
      // P001: 成功, P002: LINE UID無し→失敗, P003: 成功
      expect(body.success).toBe(2);
      expect(body.failed).toBe(1);
    });
  });

  // =============================================
  // 複数ステップの複合処理
  // =============================================
  describe("複数ステップ", () => {
    it("send_text + tag_add を順番に実行", async () => {
      mockResultsByTable["actions"] = {
        data: {
          id: 8,
          name: "複合アクション",
          steps: [
            { type: "send_text", content: "テスト通知" },
            { type: "tag_add", tag_id: 3 },
          ],
        },
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P001", line_id: "U001", name: "テスト" }],
        error: null,
      };
      mockResultsByTable["message_log"] = { data: null, error: null };
      mockResultsByTable["patient_tags"] = { data: null, error: null };
      mockResultsByTable["tag_definitions"] = { data: [{ id: 10, name: "通知済み" }], error: null };

      const res = await POST(createReq({ patient_ids: ["P001"], action_id: 8 }));
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.success).toBe(1);
    });
  });
});

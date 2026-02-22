// __tests__/api/undo.test.ts
// Undo API + コアロジックのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockVerifyAdminAuth = vi.fn();

// Supabase チェーン用モック — 各メソッドはデフォルトで自身を返す
function createMockChain() {
  const chain: any = {};
  const methods = [
    "insert", "update", "delete", "select",
    "eq", "gt", "order", "limit", "single", "maybeSingle",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // limit と single はデフォルトでresolvedValue
  chain.limit.mockResolvedValue({ data: [], error: null });
  chain.single.mockResolvedValue({ data: null, error: null });
  return chain;
}

const mockChain = createMockChain();

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockChain) },
}));
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: any) => (tid ? { tenant_id: tid } : {})),
}));

// NextRequest互換のモック生成
function createMockRequest(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
  // NextRequestのnextUrlプロパティを模擬
  req.nextUrl = new URL(url);
  return req;
}

import { GET, POST } from "@/app/api/admin/undo/route";
import {
  recordUndoableAction,
  executeUndo,
  getRecentUndoActions,
} from "@/lib/undo";
import { supabaseAdmin } from "@/lib/supabase";

/** チェーンをデフォルト状態にリセット */
function resetChain() {
  for (const key of Object.keys(mockChain)) {
    mockChain[key].mockReset();
    mockChain[key].mockReturnValue(mockChain);
  }
  mockChain.limit.mockResolvedValue({ data: [], error: null });
  mockChain.single.mockResolvedValue({ data: null, error: null });
}

describe("Undo API (app/api/admin/undo/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    resetChain();
  });

  describe("GET /api/admin/undo", () => {
    it("認証失敗 → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/undo");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("認証成功 → 一覧返却", async () => {
      const mockActions = [
        {
          id: 1,
          action_type: "update",
          resource_type: "intake",
          description: "カルテ編集",
          undone: false,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          created_at: new Date().toISOString(),
        },
      ];
      mockChain.limit.mockResolvedValue({ data: mockActions, error: null });

      const req = createMockRequest("GET", "http://localhost/api/admin/undo");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.actions).toHaveLength(1);
    });
  });

  describe("POST /api/admin/undo", () => {
    it("認証失敗 → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createMockRequest("POST", "http://localhost/api/admin/undo", {
        undo_id: 1,
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("undo_id未指定 → 400", async () => {
      const req = createMockRequest("POST", "http://localhost/api/admin/undo", {});
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("undo_idが負数 → 400", async () => {
      const req = createMockRequest("POST", "http://localhost/api/admin/undo", {
        undo_id: -1,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("undo_idが文字列 → 400", async () => {
      const req = createMockRequest("POST", "http://localhost/api/admin/undo", {
        undo_id: "abc",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("履歴が見つからない → 400", async () => {
      mockChain.single.mockResolvedValue({ data: null, error: { message: "Not found" } });

      const req = createMockRequest("POST", "http://localhost/api/admin/undo", {
        undo_id: 999,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
    });

    it("取り消し済み → 400", async () => {
      mockChain.single.mockResolvedValue({
        data: {
          id: 1,
          undone: true,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          action_type: "update",
          resource_type: "intake",
          resource_id: "123",
          previous_data: { note: "元のメモ" },
        },
        error: null,
      });

      const req = createMockRequest("POST", "http://localhost/api/admin/undo", {
        undo_id: 1,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("既に取り消し済み");
    });

    it("期限切れ → 400", async () => {
      mockChain.single.mockResolvedValue({
        data: {
          id: 1,
          undone: false,
          expires_at: new Date(Date.now() - 1000).toISOString(), // 過去
          action_type: "update",
          resource_type: "intake",
          resource_id: "123",
          previous_data: { note: "元のメモ" },
        },
        error: null,
      });

      const req = createMockRequest("POST", "http://localhost/api/admin/undo", {
        undo_id: 1,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("有効期限");
    });

    it("update操作の取り消し成功 → 200", async () => {
      // single は全呼び出しで同じ chainを返す → single の結果を順番に設定
      mockChain.single
        .mockResolvedValueOnce({
          data: {
            id: 1,
            undone: false,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            action_type: "update",
            resource_type: "intake",
            resource_id: "123",
            previous_data: { note: "元のメモ", status: "active" },
          },
          error: null,
        });
      // update → eq の最終チェーンは error: null で解決する必要がある
      // withTenant(supabaseAdmin.from(tableName).update(restoreData).eq("id", ...), tenantId)
      // これは mockChain.eq → mockChain を返す（チェーン）ので、最終的にeqの返り値がPromiseになる必要なし
      // executeUndoのupdate分岐では直接 { error } を destructure する
      // → 実際には `const { error: updateErr } = await withTenant(...)` でawaitしている
      // withTenant は mockChain を返す（eq の返り値）ので、await mockChain → mockChain 自体
      // mockChain.error は undefined → updateErr は undefined → 成功パス

      const req = createMockRequest("POST", "http://localhost/api/admin/undo", {
        undo_id: 1,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });
});

describe("lib/undo.ts — コアロジック", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
  });

  describe("recordUndoableAction", () => {
    it("正常に記録できた場合はIDを返す", async () => {
      mockChain.single.mockResolvedValue({ data: { id: 42 }, error: null });

      const result = await recordUndoableAction({
        tenantId: null,
        actionType: "update",
        resourceType: "intake",
        resourceId: "123",
        previousData: { note: "元のメモ" },
        description: "カルテ編集",
      });

      expect(result).toBe(42);
      expect(supabaseAdmin.from).toHaveBeenCalledWith("undo_history");
    });

    it("INSERTエラー時はnullを返す（業務処理は止めない）", async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      const result = await recordUndoableAction({
        tenantId: "tenant-1",
        actionType: "update",
        resourceType: "patient",
        resourceId: "456",
        previousData: { name: "山田" },
        description: "患者名変更",
      });

      expect(result).toBeNull();
    });
  });

  describe("executeUndo", () => {
    it("存在しないID → エラー", async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const result = await executeUndo(9999, null);
      expect(result.success).toBe(false);
      expect(result.error).toContain("見つかりません");
    });

    it("既にundone=true → エラー", async () => {
      mockChain.single.mockResolvedValue({
        data: {
          id: 1,
          undone: true,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          action_type: "update",
          resource_type: "intake",
          resource_id: "123",
          previous_data: {},
        },
        error: null,
      });

      const result = await executeUndo(1, null);
      expect(result.success).toBe(false);
      expect(result.error).toContain("既に取り消し済み");
    });

    it("有効期限切れ → エラー", async () => {
      mockChain.single.mockResolvedValue({
        data: {
          id: 1,
          undone: false,
          expires_at: new Date(Date.now() - 1000).toISOString(),
          action_type: "update",
          resource_type: "intake",
          resource_id: "123",
          previous_data: {},
        },
        error: null,
      });

      const result = await executeUndo(1, null);
      expect(result.success).toBe(false);
      expect(result.error).toContain("有効期限");
    });

    it("未対応のリソースタイプ → エラー", async () => {
      mockChain.single.mockResolvedValue({
        data: {
          id: 1,
          undone: false,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          action_type: "update",
          resource_type: "unknown_type",
          resource_id: "123",
          previous_data: {},
        },
        error: null,
      });

      const result = await executeUndo(1, null);
      expect(result.success).toBe(false);
      expect(result.error).toContain("未対応のリソースタイプ");
    });

    it("update取り消し成功", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 1,
          undone: false,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          action_type: "update",
          resource_type: "intake",
          resource_id: "123",
          previous_data: { note: "元のメモ" },
        },
        error: null,
      });

      const result = await executeUndo(1, null);
      expect(result.success).toBe(true);
      // intakeテーブルへのupdate呼び出しを確認
      expect(supabaseAdmin.from).toHaveBeenCalledWith("intake");
    });

    it("delete取り消し → 再INSERT", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 2,
          undone: false,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          action_type: "delete",
          resource_type: "reservation",
          resource_id: "456",
          previous_data: { id: 456, patient_id: "P001", status: "confirmed" },
        },
        error: null,
      });

      const result = await executeUndo(2, null);
      expect(result.success).toBe(true);
      expect(supabaseAdmin.from).toHaveBeenCalledWith("reservations");
      // insert が呼ばれたことを確認
      expect(mockChain.insert).toHaveBeenCalled();
    });

    it("insert取り消し → DELETE", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 3,
          undone: false,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          action_type: "insert",
          resource_type: "patient",
          resource_id: "789",
          previous_data: { id: 789, name: "テスト太郎" },
        },
        error: null,
      });

      const result = await executeUndo(3, null);
      expect(result.success).toBe(true);
      expect(supabaseAdmin.from).toHaveBeenCalledWith("patients");
      // delete が呼ばれたことを確認
      expect(mockChain.delete).toHaveBeenCalled();
    });
  });

  describe("getRecentUndoActions", () => {
    it("空の場合は空配列を返す", async () => {
      mockChain.limit.mockResolvedValue({ data: [], error: null });

      const result = await getRecentUndoActions(null);
      expect(result).toEqual([]);
    });

    it("データがある場合は配列で返す", async () => {
      const mockData = [
        {
          id: 1,
          action_type: "update",
          resource_type: "intake",
          resource_id: "123",
          description: "カルテ編集",
          undone: false,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          created_at: new Date().toISOString(),
          previous_data: { note: "元のメモ" },
          current_data: null,
          admin_user_id: null,
          tenant_id: null,
        },
      ];
      mockChain.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await getRecentUndoActions(null, 10);
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("カルテ編集");
    });

    it("DBエラー時は空配列を返す", async () => {
      mockChain.limit.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      const result = await getRecentUndoActions(null);
      expect(result).toEqual([]);
    });
  });
});

describe("lib/validations/undo.ts — Zodスキーマ", () => {
  it("正常な入力", async () => {
    const { executeUndoSchema } = await import("@/lib/validations/undo");
    const result = executeUndoSchema.safeParse({ undo_id: 1 });
    expect(result.success).toBe(true);
  });

  it("undo_idが0 → エラー", async () => {
    const { executeUndoSchema } = await import("@/lib/validations/undo");
    const result = executeUndoSchema.safeParse({ undo_id: 0 });
    expect(result.success).toBe(false);
  });

  it("undo_idが負数 → エラー", async () => {
    const { executeUndoSchema } = await import("@/lib/validations/undo");
    const result = executeUndoSchema.safeParse({ undo_id: -5 });
    expect(result.success).toBe(false);
  });

  it("undo_idがfloat → エラー", async () => {
    const { executeUndoSchema } = await import("@/lib/validations/undo");
    const result = executeUndoSchema.safeParse({ undo_id: 1.5 });
    expect(result.success).toBe(false);
  });

  it("undo_id未指定 → エラー", async () => {
    const { executeUndoSchema } = await import("@/lib/validations/undo");
    const result = executeUndoSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("追加フィールドがあっても通過（passthrough）", async () => {
    const { executeUndoSchema } = await import("@/lib/validations/undo");
    const result = executeUndoSchema.safeParse({ undo_id: 1, extra: "ok" });
    expect(result.success).toBe(true);
  });
});

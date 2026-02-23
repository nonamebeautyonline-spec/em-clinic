// __tests__/api/line-actions-execute.test.ts
// LINE アクション実行 API のテスト
// 対象: app/api/admin/line/actions/execute/route.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モックヘルパー ===
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// === モック定義 ===
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-line-token"),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/line-management", () => ({
  executeActionSchema: {},
}));

// fetchモック
vi.stubGlobal("fetch", vi.fn());

import { POST } from "@/app/api/admin/line/actions/execute/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";

// === テスト本体 ===
describe("POST /api/admin/line/actions/execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};

    // デフォルト: parseBody成功
    (parseBody as any).mockResolvedValue({
      data: { action_id: 1, patient_id: "patient-001" },
    });

    // デフォルト: fetch成功
    (fetch as any).mockResolvedValue({ ok: true, status: 200 });
  });

  // ------------------------------------------------------------------
  // 認証テスト
  // ------------------------------------------------------------------
  describe("認証チェック", () => {
    it("認証失敗時は401を返す", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("認証成功時は処理が継続される", async () => {
      (verifyAdminAuth as any).mockResolvedValue(true);

      // アクション取得: 空のstepsで正常終了
      const actionsChain = createChain({ data: { id: 1, name: "テストアクション", steps: [] }, error: null });
      tableChains["actions"] = actionsChain;

      // 患者データ
      const patientsChain = createChain({ data: { name: "田中太郎", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "patient-001" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------
  // バリデーションテスト
  // ------------------------------------------------------------------
  describe("入力バリデーション", () => {
    it("parseBodyエラー時はエラーレスポンスを返す", async () => {
      const errorResponse = Response.json(
        { ok: false, error: "入力値が不正です" },
        { status: 400 },
      );
      (parseBody as any).mockResolvedValue({ error: errorResponse });

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // ------------------------------------------------------------------
  // アクション取得テスト
  // ------------------------------------------------------------------
  describe("アクション取得", () => {
    it("アクションが見つからない場合は404を返す", async () => {
      const actionsChain = createChain({ data: null, error: { message: "not found" } });
      tableChains["actions"] = actionsChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 999, patient_id: "p1" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("アクションが見つかりません");
    });
  });

  // ------------------------------------------------------------------
  // send_text ステップテスト
  // ------------------------------------------------------------------
  describe("send_text ステップ", () => {
    function setupAction(steps: any[]) {
      const actionsChain = createChain({ data: { id: 1, name: "テストアクション", steps }, error: null });
      tableChains["actions"] = actionsChain;
    }

    it("テキストが空の場合は失敗を返す", async () => {
      setupAction([{ type: "send_text", content: "" }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("テキストが空です");
    });

    it("LINE UID未登録でもログを記録する", async () => {
      setupAction([{ type: "send_text", content: "こんにちは" }]);
      // 患者のline_idがnull
      const patientsChain = createChain({ data: { name: "田中", line_id: null }, error: null });
      tableChains["patients"] = patientsChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("LINE UID未登録");
    });

    it("LINE送信成功時はsent状態で記録する", async () => {
      setupAction([{ type: "send_text", content: "こんにちは{name}さん" }]);
      const patientsChain = createChain({ data: { name: "田中太郎", line_id: "U123abc" }, error: null });
      tableChains["patients"] = patientsChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      (fetch as any).mockResolvedValue({ ok: true, status: 200 });

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(true);
      expect(body.results[0].detail).toBe("sent");
    });

    it("LINE送信失敗時はfailed状態で記録する", async () => {
      setupAction([{ type: "send_text", content: "テスト" }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      (fetch as any).mockResolvedValue({ ok: false, status: 400 });

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("failed");
    });

    it("変数置換で{name}と{patient_id}が正しく置換される", async () => {
      setupAction([{ type: "send_text", content: "{name}様(ID:{patient_id})" }]);
      const patientsChain = createChain({ data: { name: "田中太郎", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      (parseBody as any).mockResolvedValue({
        data: { action_id: 1, patient_id: "PT-001" },
      });

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "PT-001" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(true);

      // fetchに渡されたbodyを確認
      const fetchCall = (fetch as any).mock.calls[0];
      const fetchBody = JSON.parse(fetchCall[1].body);
      expect(fetchBody.messages[0].text).toBe("田中太郎様(ID:PT-001)");
    });
  });

  // ------------------------------------------------------------------
  // send_template ステップテスト
  // ------------------------------------------------------------------
  describe("send_template ステップ", () => {
    function setupAction(steps: any[]) {
      const actionsChain = createChain({ data: { id: 1, name: "テンプレートアクション", steps }, error: null });
      tableChains["actions"] = actionsChain;
    }

    it("テンプレートIDが未指定の場合は失敗", async () => {
      setupAction([{ type: "send_template" }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("テンプレート未指定");
    });

    it("テンプレートが見つからない場合は失敗", async () => {
      setupAction([{ type: "send_template", template_id: 999 }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;
      // テンプレート取得: null
      const tmplChain = createChain({ data: null, error: null });
      tableChains["message_templates"] = tmplChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("テンプレートが見つかりません");
    });

    it("テキストテンプレートの送信成功", async () => {
      setupAction([{ type: "send_template", template_id: 1 }]);
      const patientsChain = createChain({ data: { name: "佐藤", line_id: "U456" }, error: null });
      tableChains["patients"] = patientsChain;
      const tmplChain = createChain({ data: { content: "テンプレ: {name}様", message_type: "text" }, error: null });
      tableChains["message_templates"] = tmplChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      (fetch as any).mockResolvedValue({ ok: true, status: 200 });

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(true);
      expect(body.results[0].detail).toBe("sent");
    });

    it("LINE UID未登録のテンプレート送信は失敗", async () => {
      setupAction([{ type: "send_template", template_id: 1 }]);
      const patientsChain = createChain({ data: { name: "佐藤", line_id: null }, error: null });
      tableChains["patients"] = patientsChain;
      const tmplChain = createChain({ data: { content: "テンプレ", message_type: "text" }, error: null });
      tableChains["message_templates"] = tmplChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("LINE UID未登録");
    });
  });

  // ------------------------------------------------------------------
  // tag_add / tag_remove ステップテスト
  // ------------------------------------------------------------------
  describe("tag_add / tag_remove ステップ", () => {
    function setupAction(steps: any[]) {
      const actionsChain = createChain({ data: { id: 1, name: "タグアクション", steps }, error: null });
      tableChains["actions"] = actionsChain;
    }

    it("tag_add: タグID未指定の場合は失敗", async () => {
      setupAction([{ type: "tag_add" }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("タグ未指定");
    });

    it("tag_add: 正常にタグを追加する", async () => {
      setupAction([{ type: "tag_add", tag_id: 5 }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;
      const tagChain = createChain({ data: null, error: null });
      tableChains["patient_tags"] = tagChain;
      // tag_definitions（ログ用）
      const tagDefChain = createChain({ data: { name: "VIP" }, error: null });
      tableChains["tag_definitions"] = tagDefChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(true);
      expect(body.results[0].type).toBe("tag_add");
    });

    it("tag_remove: タグID未指定の場合は失敗", async () => {
      setupAction([{ type: "tag_remove" }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("タグ未指定");
    });

    it("tag_remove: 正常にタグを削除する", async () => {
      setupAction([{ type: "tag_remove", tag_id: 5 }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;
      const tagChain = createChain({ data: null, error: null });
      tableChains["patient_tags"] = tagChain;
      const tagDefChain = createChain({ data: { name: "VIP" }, error: null });
      tableChains["tag_definitions"] = tagDefChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(true);
      expect(body.results[0].type).toBe("tag_remove");
    });
  });

  // ------------------------------------------------------------------
  // mark_change ステップテスト
  // ------------------------------------------------------------------
  describe("mark_change ステップ", () => {
    function setupAction(steps: any[]) {
      const actionsChain = createChain({ data: { id: 1, name: "マークアクション", steps }, error: null });
      tableChains["actions"] = actionsChain;
    }

    it("マーク未指定の場合は失敗", async () => {
      setupAction([{ type: "mark_change" }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("マーク未指定");
    });

    it("正常にマークを更新する", async () => {
      setupAction([{ type: "mark_change", mark: "対応済み", note: "自動対応" }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;
      const markChain = createChain({ data: null, error: null });
      tableChains["patient_marks"] = markChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(true);
      expect(body.results[0].type).toBe("mark_change");
    });
  });

  // ------------------------------------------------------------------
  // menu_change ステップテスト
  // ------------------------------------------------------------------
  describe("menu_change ステップ", () => {
    function setupAction(steps: any[]) {
      const actionsChain = createChain({ data: { id: 1, name: "メニューアクション", steps }, error: null });
      tableChains["actions"] = actionsChain;
    }

    it("メニューID未指定の場合は失敗", async () => {
      setupAction([{ type: "menu_change" }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("メニュー未指定");
    });

    it("LINE UID未登録の場合は失敗", async () => {
      setupAction([{ type: "menu_change", menu_id: "1" }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: null }, error: null });
      tableChains["patients"] = patientsChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("LINE UID未登録");
    });

    it("リッチメニューが見つからない場合は失敗", async () => {
      setupAction([{ type: "menu_change", menu_id: "1" }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;
      const menuChain = createChain({ data: null, error: null });
      tableChains["rich_menus"] = menuChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("メニューが見つからないかLINE未登録です");
    });

    it("メニュー切替成功時はsuccessを返す", async () => {
      setupAction([{ type: "menu_change", menu_id: "1" }]);
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;
      const menuChain = createChain({ data: { line_rich_menu_id: "rich-menu-id-1", name: "メインメニュー" }, error: null });
      tableChains["rich_menus"] = menuChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      (fetch as any).mockResolvedValue({ ok: true, status: 200 });

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 未対応ステップタイプ
  // ------------------------------------------------------------------
  describe("未対応のステップタイプ", () => {
    it("未知のstep_typeは失敗を返す", async () => {
      const actionsChain = createChain({ data: { id: 1, name: "テスト", steps: [{ type: "unknown_type" }] }, error: null });
      tableChains["actions"] = actionsChain;
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].detail).toBe("未対応の動作タイプ");
    });
  });

  // ------------------------------------------------------------------
  // 複数ステップの実行テスト
  // ------------------------------------------------------------------
  describe("複数ステップ実行", () => {
    it("全ステップ成功時はok=trueを返す", async () => {
      const actionsChain = createChain({
        data: {
          id: 1,
          name: "複合アクション",
          steps: [
            { type: "tag_add", tag_id: 1 },
            { type: "mark_change", mark: "対応中" },
          ],
        },
        error: null,
      });
      tableChains["actions"] = actionsChain;
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;
      const tagChain = createChain({ data: null, error: null });
      tableChains["patient_tags"] = tagChain;
      const markChain = createChain({ data: null, error: null });
      tableChains["patient_marks"] = markChain;
      const tagDefChain = createChain({ data: { name: "タグ1" }, error: null });
      tableChains["tag_definitions"] = tagDefChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.results).toHaveLength(2);
      expect(body.results.every((r: any) => r.success)).toBe(true);
    });

    it("一部ステップ失敗時はok=falseを返す", async () => {
      const actionsChain = createChain({
        data: {
          id: 1,
          name: "部分失敗アクション",
          steps: [
            { type: "tag_add" }, // tag_id未指定→失敗
            { type: "mark_change", mark: "対応中" }, // 成功
          ],
        },
        error: null,
      });
      tableChains["actions"] = actionsChain;
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;
      const markChain = createChain({ data: null, error: null });
      tableChains["patient_marks"] = markChain;
      const msgChain = createChain();
      tableChains["message_log"] = msgChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.results).toHaveLength(2);
      expect(body.results[0].success).toBe(false);
      expect(body.results[1].success).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 空のステップリスト
  // ------------------------------------------------------------------
  describe("空のステップリスト", () => {
    it("stepsが空の場合はok=true, results=[]を返す", async () => {
      const actionsChain = createChain({ data: { id: 1, name: "空アクション", steps: [] }, error: null });
      tableChains["actions"] = actionsChain;
      const patientsChain = createChain({ data: { name: "田中", line_id: "U123" }, error: null });
      tableChains["patients"] = patientsChain;

      const req = new NextRequest("http://localhost/api/admin/line/actions/execute", {
        method: "POST",
        body: JSON.stringify({ action_id: 1, patient_id: "p1" }),
      });

      const res = await POST(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.results).toHaveLength(0);
    });
  });
});

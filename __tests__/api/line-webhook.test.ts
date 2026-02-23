// __tests__/api/line-webhook.test.ts
// LINE Webhook エンドポイント（line/webhook/route.ts）の統合テスト
// 署名検証、follow/unfollow/message/postback イベントの処理をテスト
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// ===== vi.hoisted でモック用変数をホイスティング =====
const { mockRpc, mockStorage, TC, getOrCreateChain, createChain } = vi.hoisted(() => {
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

  // オブジェクトの参照を保持（プロパティ操作でクリア）
  const TC: Record<string, any> = {};
  function getOrCreateChain(table: string) {
    if (!TC[table]) TC[table] = createChain();
    return TC[table];
  }

  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: "rpc not found" } });
  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://storage.example.com/image.jpg" } })),
    })),
  };

  return { mockRpc, mockStorage, TC, getOrCreateChain, createChain };
});

// テストコード側の tableChains エイリアス（参照は同一オブジェクト）
const tableChains = TC;
function resetTableChains() {
  for (const key of Object.keys(tableChains)) delete tableChains[key];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: (...args: any[]) => mockRpc(...args),
    storage: mockStorage,
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: null })),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/step-enrollment", () => ({
  checkFollowTriggerScenarios: vi.fn().mockResolvedValue(undefined),
  checkKeywordTriggerScenarios: vi.fn().mockResolvedValue(undefined),
  exitAllStepEnrollments: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/merge-tables", () => ({
  MERGE_TABLES: ["reservations", "orders", "reorders", "message_log", "patient_tags", "patient_marks", "friend_field_values"],
}));

// getSettingOrEnv: DB設定がない場合は環境変数にフォールバック（実装と同じ動作）
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockImplementation(async (_cat: string, _key: string, envKey: string) => {
    return process.env[envKey] || null;
  }),
}));

vi.mock("@/lib/ai-reply", () => ({
  scheduleAiReply: vi.fn().mockResolvedValue(undefined),
  sendAiReply: vi.fn().mockResolvedValue(undefined),
}));

// fetch をグローバルモック
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ displayName: "テストユーザー", pictureUrl: "https://example.com/pic.jpg" }),
  text: () => Promise.resolve(""),
  headers: new Headers({ "content-type": "image/jpeg" }),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
});
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/line/webhook/route";
import { pushMessage } from "@/lib/line-push";
import { checkFollowTriggerScenarios, exitAllStepEnrollments, checkKeywordTriggerScenarios } from "@/lib/step-enrollment";
import { scheduleAiReply, sendAiReply } from "@/lib/ai-reply";
import { NextRequest } from "next/server";

// テスト用 LINE チャネルシークレット
const TEST_SECRET = "test-line-channel-secret-12345";

// 署名生成ヘルパー
function generateSignature(body: string, secret: string = TEST_SECRET): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

// リクエスト生成ヘルパー
function makeWebhookReq(body: object) {
  const rawBody = JSON.stringify(body);
  const signature = generateSignature(rawBody);
  return new NextRequest("http://localhost:3000/api/line/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-line-signature": signature,
    },
    body: rawBody,
  });
}

// イベントテンプレート
function followEvent(userId = "U1234567890") {
  return { type: "follow", source: { type: "user", userId } };
}

function unfollowEvent(userId = "U1234567890") {
  return { type: "unfollow", source: { type: "user", userId } };
}

function messageEvent(userId = "U1234567890", message: any = { type: "text", text: "こんにちは" }) {
  return { type: "message", source: { type: "user", userId }, message };
}

function postbackEvent(userId = "U1234567890", data = '{"type":"rich_menu_action","actions":[]}') {
  return { type: "postback", source: { type: "user", userId }, postback: { data } };
}

// ===== テスト =====
describe("LINE Webhook POST API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTableChains();
    // 環境変数を設定
    process.env.LINE_MESSAGING_API_CHANNEL_SECRET = TEST_SECRET;
    process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN = "test-access-token";
    delete process.env.LINE_NOTIFY_CHANNEL_SECRET;
    process.env.LINE_ADMIN_GROUP_ID = "group-admin-123";

    // RPC のデフォルトモック: 既存患者を返す
    mockRpc.mockResolvedValue({
      data: { ok: true, patient_id: "LINE_67890", patient_name: "テストユーザー", created: false },
      error: null,
    });
  });

  afterEach(() => {
    delete process.env.LINE_MESSAGING_API_CHANNEL_SECRET;
    delete process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;
    delete process.env.LINE_NOTIFY_CHANNEL_SECRET;
    delete process.env.LINE_ADMIN_GROUP_ID;
  });

  // ===== 署名検証 =====
  describe("署名検証", () => {
    it("LINE_CHANNEL_SECRET未設定で500を返す", async () => {
      delete process.env.LINE_MESSAGING_API_CHANNEL_SECRET;
      const body = JSON.stringify({ events: [] });
      const req = new NextRequest("http://localhost:3000/api/line/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "x-line-signature": "dummy" },
        body,
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("LINE_CHANNEL_SECRET missing");
    });

    it("不正な署名で401を返す", async () => {
      const body = JSON.stringify({ events: [] });
      const req = new NextRequest("http://localhost:3000/api/line/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "x-line-signature": "invalid-signature" },
        body,
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("invalid signature");
    });

    it("正しい署名で200を返す（空イベント）", async () => {
      const res = await POST(makeWebhookReq({ events: [] }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });

  // ===== follow イベント =====
  describe("follow イベント", () => {
    it("友だち追加でpatient検索とログ記録が実行される", async () => {
      // patients テーブル: 既存患者を返す
      tableChains["patients"] = createChain({
        data: [{ patient_id: "p001", name: "山田太郎" }],
        error: null,
      });
      // friend_add_settings: 設定なし
      tableChains["friend_add_settings"] = createChain({ data: null, error: null });
      // message_log: ログ記録成功
      tableChains["message_log"] = createChain({ data: null, error: null });
      // orders（autoAssignで使用）
      tableChains["orders"] = createChain({ data: null, error: null });
      // tag_definitions
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      // patient_tags
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      // patient_marks
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      // rich_menus
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      const res = await POST(makeWebhookReq({ events: [followEvent()] }));
      expect(res.status).toBe(200);
      // message_log にINSERTが呼ばれたことを確認
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("message_log");
    });

    it("友だち追加でステップ配信のトリガーが呼ばれる", async () => {
      tableChains["patients"] = createChain({
        data: [{ patient_id: "p001", name: "山田太郎" }],
        error: null,
      });
      // enabled: true にして early return を回避（checkFollowTriggerScenariosに到達させる）
      tableChains["friend_add_settings"] = createChain({
        data: { setting_key: "new_friend", enabled: true, setting_value: {} },
        error: null,
      });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      await POST(makeWebhookReq({ events: [followEvent()] }));
      expect(checkFollowTriggerScenarios).toHaveBeenCalledWith(
        "p001",
        "U1234567890",
        undefined,
      );
    });

    it("グリーティングメッセージが設定されている場合送信される", async () => {
      tableChains["patients"] = createChain({
        data: [{ patient_id: "p001", name: "山田太郎" }],
        error: null,
      });
      // 友だち追加時設定: グリーティングメッセージあり
      tableChains["friend_add_settings"] = createChain({
        data: {
          setting_key: "new_friend",
          enabled: true,
          setting_value: { greeting_message: "ようこそ！{name}さん" },
        },
        error: null,
      });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      await POST(makeWebhookReq({ events: [followEvent()] }));
      // pushMessage がグリーティングメッセージで呼ばれる
      expect(pushMessage).toHaveBeenCalledWith(
        "U1234567890",
        [{ type: "text", text: expect.stringContaining("ようこそ！") }],
        undefined,
      );
    });
  });

  // ===== unfollow イベント =====
  describe("unfollow イベント", () => {
    it("ブロック時にログ記録される", async () => {
      tableChains["patients"] = createChain({
        data: [{ patient_id: "p001", name: "山田太郎" }],
        error: null,
      });
      tableChains["message_log"] = createChain({ data: null, error: null });

      const res = await POST(makeWebhookReq({ events: [unfollowEvent()] }));
      expect(res.status).toBe(200);
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("message_log");
    });

    it("ブロック時にステップ配信の離脱が呼ばれる", async () => {
      tableChains["patients"] = createChain({
        data: [{ patient_id: "p001", name: "山田太郎" }],
        error: null,
      });
      tableChains["message_log"] = createChain({ data: null, error: null });

      await POST(makeWebhookReq({ events: [unfollowEvent()] }));
      expect(exitAllStepEnrollments).toHaveBeenCalledWith(
        "p001",
        "blocked",
        undefined,
      );
    });

    it("患者が見つからない場合もエラーにならない", async () => {
      tableChains["patients"] = createChain({ data: null, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });

      const res = await POST(makeWebhookReq({ events: [unfollowEvent()] }));
      expect(res.status).toBe(200);
    });
  });

  // ===== message イベント =====
  describe("message イベント", () => {
    it("テキストメッセージがログに記録される", async () => {
      // RPC: 患者作成/検索
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });

      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
      tableChains["keyword_auto_replies"] = createChain({ data: [], error: null });

      const res = await POST(makeWebhookReq({ events: [messageEvent()] }));
      expect(res.status).toBe(200);
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("message_log");
    });

    it("テキストメッセージでキーワード自動応答チェックが実行される", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });

      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
      // キーワード自動応答: マッチなし
      tableChains["keyword_auto_replies"] = createChain({ data: [], error: null });

      await POST(makeWebhookReq({ events: [messageEvent()] }));
      // キーワードトリガーの検索が呼ばれることを確認
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("keyword_auto_replies");
    });

    it("テキストメッセージでAI返信スケジューリングが呼ばれる", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });

      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
      tableChains["keyword_auto_replies"] = createChain({ data: [], error: null });

      await POST(makeWebhookReq({ events: [messageEvent()] }));
      expect(scheduleAiReply).toHaveBeenCalledWith(
        "U1234567890",
        "p001",
        "テスト",
        "こんにちは",
        null,
      );
    });

    it("スタンプメッセージのログ記録", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });

      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      const stickerMsg = { type: "sticker", packageId: "1", stickerId: "2" };
      const res = await POST(makeWebhookReq({ events: [messageEvent("U1234567890", stickerMsg)] }));
      expect(res.status).toBe(200);
    });

    it("位置情報メッセージのログ記録", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });

      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      const locationMsg = { type: "location", title: "東京駅", address: "東京都千代田区" };
      const res = await POST(makeWebhookReq({ events: [messageEvent("U1234567890", locationMsg)] }));
      expect(res.status).toBe(200);
    });

    it("キーワードマッチ時にAI返信は呼ばれない", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });

      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
      // キーワードルール: 完全一致「こんにちは」でテキスト返信
      tableChains["keyword_auto_replies"] = createChain({
        data: [{
          id: 1,
          name: "挨拶",
          keyword: "こんにちは",
          match_type: "exact",
          is_enabled: true,
          priority: 1,
          reply_type: "text",
          reply_text: "こんにちは！",
          reply_template_id: null,
          condition_rules: null,
        }],
        error: null,
      });

      await POST(makeWebhookReq({ events: [messageEvent("U1234567890", { type: "text", text: "こんにちは" })] }));
      // キーワードマッチしたのでpushMessageが呼ばれる
      expect(pushMessage).toHaveBeenCalledWith(
        "U1234567890",
        [{ type: "text", text: "こんにちは！" }],
        undefined,
      );
      // AI返信は呼ばれない
      expect(scheduleAiReply).not.toHaveBeenCalled();
    });

    it("ステップ配信: キーワードトリガーが呼ばれる", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });

      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
      tableChains["keyword_auto_replies"] = createChain({ data: [], error: null });

      await POST(makeWebhookReq({ events: [messageEvent("U1234567890", { type: "text", text: "テスト" })] }));
      expect(checkKeywordTriggerScenarios).toHaveBeenCalledWith(
        "テスト",
        "p001",
        "U1234567890",
        undefined,
      );
    });
  });

  // ===== postback イベント =====
  describe("postback イベント", () => {
    it("ユーザーpostbackのログ記録", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });

      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      const res = await POST(makeWebhookReq({ events: [postbackEvent()] }));
      expect(res.status).toBe(200);
    });

    it("JSON形式のpostbackデータがパースされる", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });

      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      const pbData = JSON.stringify({
        type: "rich_menu_action",
        actions: [{ type: "text_send", value: "テストメッセージ" }],
      });
      const res = await POST(makeWebhookReq({ events: [postbackEvent("U1234567890", pbData)] }));
      expect(res.status).toBe(200);
      // text_sendアクションでpushMessageが呼ばれる
      expect(pushMessage).toHaveBeenCalled();
    });

    it("リッチメニューアクション: テキスト送信", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });

      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      const pbData = JSON.stringify({
        type: "rich_menu_action",
        actions: [{ type: "text_send", value: "予約はこちら" }],
      });
      await POST(makeWebhookReq({ events: [postbackEvent("U1234567890", pbData)] }));
      expect(pushMessage).toHaveBeenCalledWith(
        "U1234567890",
        [{ type: "text", text: "予約はこちら" }],
        undefined,
      );
    });

    it("リッチメニューアクション: テンプレート送信", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });

      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
      // テンプレート
      tableChains["message_templates"] = createChain({
        data: { content: "テンプレメッセージ for {name}", name: "ご案内", message_type: "text" },
        error: null,
      });

      const pbData = JSON.stringify({
        type: "rich_menu_action",
        actions: [{ type: "template_send", value: "1" }],
      });
      await POST(makeWebhookReq({ events: [postbackEvent("U1234567890", pbData)] }));
      expect(pushMessage).toHaveBeenCalledWith(
        "U1234567890",
        [{ type: "text", text: "テンプレメッセージ for テスト" }],
        undefined,
      );
    });

    it("管理グループからのpostbackは再処方承認に使われる", async () => {
      // 管理グループからのpostback
      process.env.LINE_ADMIN_GROUP_ID = "group-admin-123";
      const { getSettingOrEnv } = await import("@/lib/settings");
      vi.mocked(getSettingOrEnv).mockImplementation(async (_cat, key) => {
        if (key === "admin_group_id") return "group-admin-123";
        if (key === "channel_secret") return TEST_SECRET;
        if (key === "notify_channel_secret") return null;
        if (key === "channel_access_token") return "test-token";
        if (key === "notify_channel_access_token") return "notify-token";
        return null;
      });

      // reorders テーブル
      let reorderCallCount = 0;
      const reorderChain = createChain();
      reorderChain.then = vi.fn((resolve: any) => {
        reorderCallCount++;
        if (reorderCallCount === 1) return resolve({ data: { id: 1, patient_id: "p001", status: "pending" }, error: null });
        return resolve({ data: null, error: null });
      });
      tableChains["reorders"] = reorderChain;
      tableChains["patients"] = createChain({ data: { line_id: "Uxxxxxx" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });

      const adminPbEvent = {
        type: "postback",
        source: { type: "group", groupId: "group-admin-123", userId: "admin-user" },
        postback: { data: "reorder_action=approve&reorder_id=42" },
      };

      const res = await POST(makeWebhookReq({ events: [adminPbEvent] }));
      expect(res.status).toBe(200);
    });
  });

  // ===== 複数イベント =====
  describe("複数イベント処理", () => {
    it("複数イベントが順番に処理される", async () => {
      mockRpc.mockResolvedValue({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });

      tableChains["patients"] = createChain({
        data: [{ patient_id: "p001", name: "テスト" }],
        error: null,
      });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["friend_add_settings"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
      tableChains["keyword_auto_replies"] = createChain({ data: [], error: null });

      const events = [
        followEvent("U111"),
        messageEvent("U222", { type: "text", text: "hello" }),
      ];
      const res = await POST(makeWebhookReq({ events }));
      expect(res.status).toBe(200);
    });
  });

  // ===== エラーハンドリング =====
  describe("エラーハンドリング", () => {
    it("不正なJSONでも500（致命エラーキャッチ）", async () => {
      // 署名付きで不正JSONを送る → パースでエラー
      const invalidBody = "not json";
      const signature = generateSignature(invalidBody);
      const req = new NextRequest("http://localhost:3000/api/line/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "x-line-signature": signature },
        body: invalidBody,
      });
      const res = await POST(req);
      // JSON.parse失敗するが致命エラーハンドラで500
      expect(res.status).toBe(500);
    });

    it("LINEには常に200を返す（イベントハンドラのエラーは握りつぶさない方針だが最終的に200）", async () => {
      // 正常なリクエストで未知のイベントタイプ
      const unknownEvent = { type: "unknown_event", source: { type: "user", userId: "U123" } };
      const res = await POST(makeWebhookReq({ events: [unknownEvent] }));
      expect(res.status).toBe(200);
    });

    it("events が配列でない場合も200を返す", async () => {
      const res = await POST(makeWebhookReq({ events: "not-array" }));
      expect(res.status).toBe(200);
    });

    it("events が undefined の場合も200を返す", async () => {
      const res = await POST(makeWebhookReq({}));
      expect(res.status).toBe(200);
    });
  });

  // ===== ユーティリティ関数の動作確認 =====
  describe("署名検証ロジック（再テスト）", () => {
    // route.ts内部のverifyLineSignatureと同じロジックを検証
    function verifyLineSignature(rawBody: string, signature: string, secrets: string[]) {
      if (secrets.length === 0 || !signature) return false;
      for (const secret of secrets) {
        const hash = crypto
          .createHmac("sha256", secret)
          .update(rawBody)
          .digest("base64");
        if (hash.length === signature.length &&
            crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
          return true;
        }
      }
      return false;
    }

    it("正しい署名で検証成功", () => {
      const body = '{"events":[]}';
      const sig = generateSignature(body);
      expect(verifyLineSignature(body, sig, [TEST_SECRET])).toBe(true);
    });

    it("不正な署名で検証失敗", () => {
      expect(verifyLineSignature('{"events":[]}', "bad-sig", [TEST_SECRET])).toBe(false);
    });

    it("空のsecrets配列で検証失敗", () => {
      const body = '{"events":[]}';
      const sig = generateSignature(body);
      expect(verifyLineSignature(body, sig, [])).toBe(false);
    });

    it("空の署名で検証失敗", () => {
      expect(verifyLineSignature('{"events":[]}', "", [TEST_SECRET])).toBe(false);
    });

    it("複数シークレットのいずれかで検証成功", () => {
      const body = '{"events":[]}';
      const sig = generateSignature(body);
      expect(verifyLineSignature(body, sig, ["wrong-secret", TEST_SECRET])).toBe(true);
    });
  });

  // ===== parseQueryString ロジック =====
  describe("parseQueryString ロジック（再テスト）", () => {
    function parseQueryString(data: string) {
      const out: Record<string, string> = {};
      for (const part of String(data || "").split("&")) {
        if (!part) continue;
        const [k, v] = part.split("=");
        if (!k) continue;
        out[decodeURIComponent(k)] = decodeURIComponent(v || "");
      }
      return out;
    }

    it("再処方承認postbackをパース", () => {
      const data = "reorder_action=approve&reorder_id=42";
      const parsed = parseQueryString(data);
      expect(parsed.reorder_action).toBe("approve");
      expect(parsed.reorder_id).toBe("42");
    });

    it("AI返信承認postbackをパース", () => {
      const data = "ai_reply_action=approve&draft_id=10";
      const parsed = parseQueryString(data);
      expect(parsed.ai_reply_action).toBe("approve");
      expect(parsed.draft_id).toBe("10");
    });

    it("空文字列は空オブジェクト", () => {
      expect(parseQueryString("")).toEqual({});
    });

    it("URLエンコードされた値のデコード", () => {
      expect(parseQueryString("name=%E5%A4%AA%E9%83%8E")).toEqual({ name: "太郎" });
    });
  });

  // ===== 画像メッセージ処理（downloadAndSaveImage）=====
  describe("画像メッセージ処理", () => {
    // 共通セットアップ: message イベントの基本テーブルチェーン
    function setupMessageChains() {
      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
    }

    it("画像メッセージ: 画像DL → Storage保存 → URLがログに記録される", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });
      setupMessageChains();

      // fetch モック: LINE Profile API + Content API の2回呼ばれる
      // Content APIでは画像バイナリを返す
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ displayName: "テストユーザー", pictureUrl: "https://example.com/pic.jpg" }),
        text: () => Promise.resolve(""),
        headers: new Headers({ "content-type": "image/jpeg" }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
      });

      const imageMsg = { type: "image", id: "msg-img-001" };
      const res = await POST(makeWebhookReq({ events: [messageEvent("U1234567890", imageMsg)] }));
      expect(res.status).toBe(200);

      // Storage upload が呼ばれたことを確認
      const storageFrom = mockStorage.from;
      expect(storageFrom).toHaveBeenCalledWith("line-images");
    });

    it("画像メッセージ: DL失敗時は [画像] がログに記録される", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });
      setupMessageChains();

      // Content API fetch を失敗させる（プロフィール取得は成功、画像DLは失敗）
      let fetchCallCount = 0;
      mockFetch.mockImplementation(async (url: string) => {
        fetchCallCount++;
        if (typeof url === "string" && url.includes("api-data.line.me")) {
          // Content API: 画像DL失敗
          return { ok: false, status: 500, text: () => Promise.resolve("error") };
        }
        // Profile API等: 正常応答
        return {
          ok: true,
          json: () => Promise.resolve({ displayName: "テストユーザー", pictureUrl: "https://example.com/pic.jpg" }),
          text: () => Promise.resolve(""),
          headers: new Headers({ "content-type": "application/json" }),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        };
      });

      const imageMsg = { type: "image", id: "msg-img-002" };
      const res = await POST(makeWebhookReq({ events: [messageEvent("U1234567890", imageMsg)] }));
      expect(res.status).toBe(200);

      // message_log の insert が呼ばれたことを確認（content は "[画像]"）
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("message_log");
    });
  });

  // ===== その他メッセージタイプ =====
  describe("その他メッセージタイプ", () => {
    function setupMessageChains() {
      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
    }

    it("動画メッセージのログ記録", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });
      setupMessageChains();

      const videoMsg = { type: "video", id: "msg-video-001" };
      const res = await POST(makeWebhookReq({ events: [messageEvent("U1234567890", videoMsg)] }));
      expect(res.status).toBe(200);
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("message_log");
    });

    it("音声メッセージのログ記録", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });
      setupMessageChains();

      const audioMsg = { type: "audio", id: "msg-audio-001" };
      const res = await POST(makeWebhookReq({ events: [messageEvent("U1234567890", audioMsg)] }));
      expect(res.status).toBe(200);
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("message_log");
    });

    it("ファイルメッセージのログ記録", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });
      setupMessageChains();

      const fileMsg = { type: "file", fileName: "test.pdf" };
      const res = await POST(makeWebhookReq({ events: [messageEvent("U1234567890", fileMsg)] }));
      expect(res.status).toBe(200);
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("message_log");
    });
  });

  // ===== キーワード自動応答の追加テスト =====
  describe("キーワード自動応答（追加テスト）", () => {
    function setupMessageChains() {
      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
    }

    it("部分一致キーワードにマッチ", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });
      setupMessageChains();

      // 部分一致ルール: "予約" を含む文字列にマッチ
      tableChains["keyword_auto_replies"] = createChain({
        data: [{
          id: 2,
          name: "予約案内",
          keyword: "予約",
          match_type: "partial",
          is_enabled: true,
          priority: 1,
          reply_type: "text",
          reply_text: "予約はこちらからどうぞ！",
          reply_template_id: null,
          condition_rules: null,
        }],
        error: null,
      });

      // 「予約したい」は「予約」を部分一致で含む
      await POST(makeWebhookReq({ events: [messageEvent("U1234567890", { type: "text", text: "予約したいです" })] }));
      expect(pushMessage).toHaveBeenCalledWith(
        "U1234567890",
        [{ type: "text", text: "予約はこちらからどうぞ！" }],
        undefined,
      );
      // キーワードマッチしたのでAI返信は呼ばれない
      expect(scheduleAiReply).not.toHaveBeenCalled();
    });

    it("正規表現キーワードにマッチ", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });
      setupMessageChains();

      // 正規表現ルール: 数字3桁以上を含むテキストにマッチ
      tableChains["keyword_auto_replies"] = createChain({
        data: [{
          id: 3,
          name: "番号検知",
          keyword: "\\d{3,}",
          match_type: "regex",
          is_enabled: true,
          priority: 1,
          reply_type: "text",
          reply_text: "番号を受け付けました。",
          reply_template_id: null,
          condition_rules: null,
        }],
        error: null,
      });

      await POST(makeWebhookReq({ events: [messageEvent("U1234567890", { type: "text", text: "受付番号は12345です" })] }));
      expect(pushMessage).toHaveBeenCalledWith(
        "U1234567890",
        [{ type: "text", text: "番号を受け付けました。" }],
        undefined,
      );
    });

    it("テンプレート返信タイプ", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });
      setupMessageChains();

      // テンプレート返信ルール
      tableChains["keyword_auto_replies"] = createChain({
        data: [{
          id: 4,
          name: "テンプレ返信",
          keyword: "営業時間",
          match_type: "exact",
          is_enabled: true,
          priority: 1,
          reply_type: "template",
          reply_text: null,
          reply_template_id: 100,
          condition_rules: null,
        }],
        error: null,
      });

      // テンプレートの内容
      tableChains["message_templates"] = createChain({
        data: { content: "営業時間は9:00〜18:00です。{name}様", message_type: "text" },
        error: null,
      });

      await POST(makeWebhookReq({ events: [messageEvent("U1234567890", { type: "text", text: "営業時間" })] }));
      expect(pushMessage).toHaveBeenCalledWith(
        "U1234567890",
        [{ type: "text", text: "営業時間は9:00〜18:00です。テスト様" }],
        undefined,
      );
    });

    it("条件ルール付きキーワード: タグ条件がマッチしない場合スキップ", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p001", patient_name: "テスト", created: false },
        error: null,
      });
      setupMessageChains();

      // 条件ルール付きキーワード: tag_id=999 を持っていないとスキップ
      tableChains["keyword_auto_replies"] = createChain({
        data: [{
          id: 5,
          name: "VIP限定",
          keyword: "特典",
          match_type: "exact",
          is_enabled: true,
          priority: 1,
          reply_type: "text",
          reply_text: "VIP限定の特典です！",
          reply_template_id: null,
          condition_rules: [{ type: "tag", tag_id: 999, operator: "has" }],
        }],
        error: null,
      });

      // 患者のタグ: tag_id=999 を持っていない → 条件不一致でスキップ
      // patient_tags は既に空のチェーンが設定済み（setupMessageChains）

      await POST(makeWebhookReq({ events: [messageEvent("U1234567890", { type: "text", text: "特典" })] }));
      // 条件不一致のためキーワード返信は実行されない
      // AI返信が代わりにスケジュールされる
      expect(scheduleAiReply).toHaveBeenCalled();
    });
  });

  // ===== AI返信 postback 処理 =====
  describe("AI返信 postback 処理", () => {
    // 管理グループpostbackの共通セットアップ
    async function setupAdminPostback() {
      process.env.LINE_ADMIN_GROUP_ID = "group-admin-123";
      const { getSettingOrEnv } = await import("@/lib/settings");
      vi.mocked(getSettingOrEnv).mockImplementation(async (_cat, key) => {
        if (key === "admin_group_id") return "group-admin-123";
        if (key === "channel_secret") return TEST_SECRET;
        if (key === "notify_channel_secret") return null;
        if (key === "channel_access_token") return "test-token";
        if (key === "notify_channel_access_token") return "notify-token";
        return null;
      });
      tableChains["message_log"] = createChain({ data: null, error: null });
    }

    it("AI返信承認: ドラフト送信", async () => {
      await setupAdminPostback();

      // ai_reply_drafts: pending 状態のドラフトを返す
      tableChains["ai_reply_drafts"] = createChain({
        data: {
          id: 10,
          line_uid: "Uxxxxxx",
          patient_id: "p001",
          draft_reply: "AIが生成した返信文です。",
          status: "pending",
          expires_at: null,
        },
        error: null,
      });

      const adminPbEvent = {
        type: "postback",
        source: { type: "group", groupId: "group-admin-123", userId: "admin-user" },
        postback: { data: "ai_reply_action=approve&draft_id=10" },
      };

      const res = await POST(makeWebhookReq({ events: [adminPbEvent] }));
      expect(res.status).toBe(200);
      // sendAiReply が承認内容で呼ばれることを確認
      expect(sendAiReply).toHaveBeenCalledWith(
        10,
        "Uxxxxxx",
        "AIが生成した返信文です。",
        "p001",
        null,
      );
    });

    it("AI返信却下: ドラフト却下", async () => {
      await setupAdminPostback();

      // ai_reply_drafts: pending 状態のドラフト
      tableChains["ai_reply_drafts"] = createChain({
        data: {
          id: 10,
          line_uid: "Uxxxxxx",
          patient_id: "p001",
          draft_reply: "AIが生成した返信文です。",
          status: "pending",
          expires_at: null,
        },
        error: null,
      });

      const adminPbEvent = {
        type: "postback",
        source: { type: "group", groupId: "group-admin-123", userId: "admin-user" },
        postback: { data: "ai_reply_action=reject&draft_id=10" },
      };

      const res = await POST(makeWebhookReq({ events: [adminPbEvent] }));
      expect(res.status).toBe(200);
      // sendAiReply は呼ばれない（却下なので）
      expect(sendAiReply).not.toHaveBeenCalled();
      // ai_reply_drafts の update が呼ばれる（status: "rejected"）
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("ai_reply_drafts");
    });

    it("AI返信: 既に処理済みのドラフト", async () => {
      await setupAdminPostback();

      // ai_reply_drafts: 既に approved 状態
      tableChains["ai_reply_drafts"] = createChain({
        data: {
          id: 10,
          line_uid: "Uxxxxxx",
          patient_id: "p001",
          draft_reply: "AIが生成した返信文です。",
          status: "approved",
          expires_at: null,
        },
        error: null,
      });

      const adminPbEvent = {
        type: "postback",
        source: { type: "group", groupId: "group-admin-123", userId: "admin-user" },
        postback: { data: "ai_reply_action=approve&draft_id=10" },
      };

      const res = await POST(makeWebhookReq({ events: [adminPbEvent] }));
      expect(res.status).toBe(200);
      // 処理済みなので sendAiReply は呼ばれない
      expect(sendAiReply).not.toHaveBeenCalled();
      // pushToGroup で「既に処理済み」メッセージが送られる（fetch経由）
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  // ===== findOrCreatePatient の追加テスト =====
  describe("findOrCreatePatient フォールバック", () => {
    it("RPC失敗時にフォールバック（従来ロジック）で患者作成", async () => {
      // RPC を失敗させる
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "rpc function not found" },
      });

      // patients テーブル: 既存患者なし（findPatientByLineUid で空を返す）
      tableChains["patients"] = createChain({ data: [], error: null });
      // intake: 新規作成成功
      tableChains["intake"] = createChain({ data: null, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
      tableChains["keyword_auto_replies"] = createChain({ data: [], error: null });

      const res = await POST(makeWebhookReq({ events: [messageEvent("U_NEWUSER_01", { type: "text", text: "はじめまして" })] }));
      expect(res.status).toBe(200);

      // patients テーブルに insert が呼ばれたことを確認（フォールバックパスで自動作成）
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("patients");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("intake");
    });
  });

  // ===== autoAssignStatusByPatient =====
  describe("autoAssignStatusByPatient", () => {
    it("処方済み患者にタグとマークが自動付与される", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ok: true, patient_id: "p-prescribed-001", patient_name: "処方済みさん", created: false },
        error: null,
      });

      // patients: プロフィール画像あり
      tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url", name: "処方済みさん", tel: "09012345678" }, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      // orders: 1件あり（処方済み）
      tableChains["orders"] = createChain({ data: { id: 1 }, error: null });
      // tag_definitions: 「処方ずみ」タグを返す
      tableChains["tag_definitions"] = createChain({ data: { id: 50 }, error: null });
      // patient_tags: 既存タグなし（自動付与対象）
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      // patient_marks: 既存マークなし（自動付与対象）
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      // rich_menus: 「処方後」メニュー
      tableChains["rich_menus"] = createChain({ data: { line_rich_menu_id: "richmenu-xxx" }, error: null });
      tableChains["keyword_auto_replies"] = createChain({ data: [], error: null });

      // fetch: リッチメニュー取得API + 割り当てAPI
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ richMenuId: "richmenu-old", displayName: "処方済みさん", pictureUrl: "https://example.com/pic.jpg" }),
        text: () => Promise.resolve(""),
        headers: new Headers({ "content-type": "application/json" }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      });

      const res = await POST(makeWebhookReq({ events: [messageEvent("U1234567890", { type: "text", text: "こんにちは" })] }));
      expect(res.status).toBe(200);

      // autoAssign 経由で tag_definitions, patient_tags, patient_marks が参照される
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("tag_definitions");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("patient_tags");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("patient_marks");
    });
  });
});

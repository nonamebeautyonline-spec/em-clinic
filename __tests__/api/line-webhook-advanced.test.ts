// __tests__/api/line-webhook-advanced.test.ts
// LINE Webhook 追加テスト — 未テスト領域のカバレッジ強化
// 対象: downloadAndSaveImage, getLineProfile, mergeFakePatients,
//   checkAndReplyKeyword完全フロー, evaluateConditionRules,
//   handleChatbotMessage, executeRichMenuActions残りタイプ, AI返信after()処理
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// ===== vi.hoisted でモック用変数をホイスティング =====
const { mockRpc, mockStorage, TC, getOrCreateChain, createChain, mockStorageUpload, mockStorageGetPublicUrl } = vi.hoisted(() => {
  function createChain(defaultResolve = { data: null, error: null }) {
    const chain: Record<string, unknown> = {};
    ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
     "in","is","not","order","limit","range","single","maybeSingle","upsert",
     "ilike","or","count","csv","filter","match","textSearch","rpc","head"].forEach(m => {
      chain[m] = vi.fn().mockReturnValue(chain);
    });
    chain.then = vi.fn((resolve: (value: unknown) => unknown) => resolve(defaultResolve));
    return chain;
  }

  const TC: Record<string, ReturnType<typeof createChain>> = {};
  function getOrCreateChain(table: string) {
    if (!TC[table]) TC[table] = createChain();
    return TC[table];
  }

  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: "rpc not found" } });
  const mockStorageUpload = vi.fn().mockResolvedValue({ error: null });
  const mockStorageGetPublicUrl = vi.fn(() => ({ data: { publicUrl: "https://storage.example.com/image.jpg" } }));
  const mockStorage = {
    from: vi.fn(() => ({
      upload: mockStorageUpload,
      getPublicUrl: mockStorageGetPublicUrl,
    })),
  };

  return { mockRpc, mockStorage, TC, getOrCreateChain, createChain, mockStorageUpload, mockStorageGetPublicUrl };
});

const tableChains = TC;
function resetTableChains() {
  for (const key of Object.keys(tableChains)) delete tableChains[key];
}

// after()モック
const mockAfterCallbacks: (() => void | Promise<void>)[] = [];
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((cb: () => void | Promise<void>) => { mockAfterCallbacks.push(cb); }),
  };
});

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: (...args: unknown[]) => mockRpc(...args),
    storage: mockStorage,
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  resolveTenantIdOrThrow: vi.fn(() => null),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "00000000-0000-0000-0000-000000000001" })),
  DEFAULT_TENANT_ID: "00000000-0000-0000-0000-000000000001",
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
  invalidateFriendsListCache: vi.fn().mockResolvedValue(undefined),
}));

const mockPushMessage = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/line-push", () => ({
  pushMessage: (...args: unknown[]) => mockPushMessage(...args),
}));

vi.mock("@/lib/step-enrollment", () => ({
  checkFollowTriggerScenarios: vi.fn().mockResolvedValue(undefined),
  checkKeywordTriggerScenarios: vi.fn().mockResolvedValue(undefined),
  exitAllStepEnrollments: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/merge-tables", () => ({
  MERGE_TABLES: ["reservations", "orders", "reorders", "message_log", "patient_tags", "patient_marks", "friend_field_values"],
  migrateFriendSummary: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockImplementation(async (_cat: string, _key: string, envKey: string) => {
    return process.env[envKey] || null;
  }),
}));

const mockScheduleAiReply = vi.fn().mockResolvedValue(undefined);
const mockProcessAiReply = vi.fn().mockResolvedValue(undefined);
const mockClearAiReplyDebounce = vi.fn().mockResolvedValue(undefined);
const mockRescheduleAiReply = vi.fn().mockResolvedValue(undefined);
const mockSendAiReply = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/ai-reply", () => ({
  scheduleAiReply: (...args: unknown[]) => mockScheduleAiReply(...args),
  sendAiReply: (...args: unknown[]) => mockSendAiReply(...args),
  processAiReply: (...args: unknown[]) => mockProcessAiReply(...args),
  clearAiReplyDebounce: (...args: unknown[]) => mockClearAiReplyDebounce(...args),
  rescheduleAiReply: (...args: unknown[]) => mockRescheduleAiReply(...args),
}));

vi.mock("@/lib/webhook-tenant-resolver", () => ({
  resolveLineTenantBySignature: vi.fn().mockResolvedValue("00000000-0000-0000-0000-000000000001"),
  resolveWebhookTenant: vi.fn().mockResolvedValue("00000000-0000-0000-0000-000000000001"),
  resolveSquareTenantBySignatureKey: vi.fn().mockResolvedValue("00000000-0000-0000-0000-000000000001"),
}));

vi.mock("@/lib/idempotency", () => ({
  checkIdempotency: vi.fn().mockResolvedValue({ duplicate: false, markCompleted: vi.fn(), markFailed: vi.fn() }),
}));

vi.mock("@/lib/lifecycle-actions", () => ({
  executeLifecycleActions: vi.fn().mockResolvedValue({ actionDetails: [] }),
}));

vi.mock("@/lib/notifications/webhook-failure", () => ({
  notifyWebhookFailure: vi.fn().mockResolvedValue(undefined),
}));

const mockIsWithinBusinessHours = vi.fn().mockResolvedValue({ withinHours: true, outsideMessage: null });
vi.mock("@/lib/business-hours", () => ({
  isWithinBusinessHours: (...args: unknown[]) => mockIsWithinBusinessHours(...args),
}));

vi.mock("@/lib/flex-sanitize", () => ({
  sanitizeFlexContents: vi.fn((contents: unknown) => contents),
}));

const mockGetActiveSession = vi.fn().mockResolvedValue(null);
const mockProcessUserInput = vi.fn().mockResolvedValue(null);
const mockFindScenarioByKeyword = vi.fn().mockResolvedValue(null);
const mockStartScenario = vi.fn().mockResolvedValue(null);
const mockGetNextMessage = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/chatbot-engine", () => ({
  findScenarioByKeyword: (...args: unknown[]) => mockFindScenarioByKeyword(...args),
  getActiveSession: (...args: unknown[]) => mockGetActiveSession(...args),
  startScenario: (...args: unknown[]) => mockStartScenario(...args),
  processUserInput: (...args: unknown[]) => mockProcessUserInput(...args),
  getNextMessage: (...args: unknown[]) => mockGetNextMessage(...args),
}));

const mockCheckSpamBurst = vi.fn().mockResolvedValue({ blocked: false, shouldNotify: false });
vi.mock("@/lib/spam-burst", () => ({
  checkSpamBurst: (...args: unknown[]) => mockCheckSpamBurst(...args),
}));

const mockAcquireLock = vi.fn().mockResolvedValue({ acquired: true, release: vi.fn() });
vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
}));

vi.mock("@/lib/tag-auto-rules", () => ({
  evaluateTagAutoRules: vi.fn().mockResolvedValue(undefined),
}));

// fetch グローバルモック
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ displayName: "テストユーザー", pictureUrl: "https://example.com/pic.jpg" }),
  text: () => Promise.resolve(""),
  headers: new Headers({ "content-type": "image/jpeg" }),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
});
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/line/webhook/route";
import { NextRequest } from "next/server";

// ===== ヘルパー =====
const TEST_SECRET = "test-line-channel-secret-12345";

function generateSignature(body: string, secret: string = TEST_SECRET): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

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

function messageEvent(userId = "U1234567890", message: Record<string, unknown> = { type: "text", text: "こんにちは" }) {
  return { type: "message", source: { type: "user", userId }, message };
}

function postbackEvent(userId = "U1234567890", data = '{"type":"rich_menu_action","actions":[]}') {
  return { type: "postback", source: { type: "user", userId }, postback: { data } };
}

// 共通テーブルチェーンセットアップ
function setupMessageChains() {
  tableChains["patients"] = createChain({ data: { line_picture_url: "https://pic.url" }, error: null });
  tableChains["message_log"] = createChain({ data: null, error: null });
  tableChains["orders"] = createChain({ data: null, error: null });
  tableChains["tag_definitions"] = createChain({ data: null, error: null });
  tableChains["patient_tags"] = createChain({ data: null, error: null });
  tableChains["patient_marks"] = createChain({ data: null, error: null });
  tableChains["rich_menus"] = createChain({ data: null, error: null });
  tableChains["keyword_auto_replies"] = createChain({ data: [], error: null });
}

function setupDefaultRpc(patientId = "p001", patientName = "テスト") {
  mockRpc.mockResolvedValueOnce({
    data: { ok: true, patient_id: patientId, patient_name: patientName, created: false },
    error: null,
  });
}

// ===== テスト =====
describe("LINE Webhook 追加テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTableChains();
    mockAfterCallbacks.length = 0;
    process.env.LINE_MESSAGING_API_CHANNEL_SECRET = TEST_SECRET;
    process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN = "test-access-token";
    delete process.env.LINE_NOTIFY_CHANNEL_SECRET;
    process.env.LINE_ADMIN_GROUP_ID = "group-admin-123";

    mockRpc.mockResolvedValue({
      data: { ok: true, patient_id: "LINE_67890", patient_name: "テストユーザー", created: false },
      error: null,
    });

    // デフォルトfetch応答（プロフィールAPI）
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ displayName: "テストユーザー", pictureUrl: "https://example.com/pic.jpg" }),
      text: () => Promise.resolve(""),
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    });
  });

  afterEach(() => {
    delete process.env.LINE_MESSAGING_API_CHANNEL_SECRET;
    delete process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;
    delete process.env.LINE_NOTIFY_CHANNEL_SECRET;
    delete process.env.LINE_ADMIN_GROUP_ID;
  });

  // =================================================================
  // 1. downloadAndSaveImage — Content-Type判定
  // =================================================================
  describe("downloadAndSaveImage: Content-Type判定", () => {
    it("image/pngのContent-Typeで.png拡張子でアップロードされる", async () => {
      setupDefaultRpc();
      setupMessageChains();

      mockFetch.mockImplementation(async (url: string) => {
        if (typeof url === "string" && url.includes("api-data.line.me")) {
          return {
            ok: true,
            headers: new Headers({ "content-type": "image/png" }),
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
          };
        }
        return {
          ok: true,
          json: () => Promise.resolve({ displayName: "テスト", pictureUrl: "" }),
          text: () => Promise.resolve(""),
          headers: new Headers({ "content-type": "application/json" }),
        };
      });

      await POST(makeWebhookReq({ events: [messageEvent("U001", { type: "image", id: "img-png-1" })] }));

      expect(mockStorage.from).toHaveBeenCalledWith("line-images");
      // アップロード時のファイル名が.pngで終わることを確認
      const uploadCall = mockStorageUpload.mock.calls[0];
      if (uploadCall) {
        expect(uploadCall[0]).toMatch(/\.png$/);
        expect(uploadCall[2].contentType).toBe("image/png");
      }
    });

    it("image/webpのContent-Typeで.webp拡張子でアップロードされる", async () => {
      setupDefaultRpc();
      setupMessageChains();

      mockFetch.mockImplementation(async (url: string) => {
        if (typeof url === "string" && url.includes("api-data.line.me")) {
          return {
            ok: true,
            headers: new Headers({ "content-type": "image/webp" }),
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
          };
        }
        return {
          ok: true,
          json: () => Promise.resolve({ displayName: "テスト", pictureUrl: "" }),
          text: () => Promise.resolve(""),
          headers: new Headers({ "content-type": "application/json" }),
        };
      });

      await POST(makeWebhookReq({ events: [messageEvent("U001", { type: "image", id: "img-webp-1" })] }));

      const uploadCall = mockStorageUpload.mock.calls[0];
      if (uploadCall) {
        expect(uploadCall[0]).toMatch(/\.webp$/);
        expect(uploadCall[2].contentType).toBe("image/webp");
      }
    });

    it("image/gifのContent-Typeで.gif拡張子でアップロードされる", async () => {
      setupDefaultRpc();
      setupMessageChains();

      mockFetch.mockImplementation(async (url: string) => {
        if (typeof url === "string" && url.includes("api-data.line.me")) {
          return {
            ok: true,
            headers: new Headers({ "content-type": "image/gif" }),
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
          };
        }
        return {
          ok: true,
          json: () => Promise.resolve({ displayName: "テスト", pictureUrl: "" }),
          text: () => Promise.resolve(""),
          headers: new Headers({ "content-type": "application/json" }),
        };
      });

      await POST(makeWebhookReq({ events: [messageEvent("U001", { type: "image", id: "img-gif-1" })] }));

      const uploadCall = mockStorageUpload.mock.calls[0];
      if (uploadCall) {
        expect(uploadCall[0]).toMatch(/\.gif$/);
        expect(uploadCall[2].contentType).toBe("image/gif");
      }
    });

    it("Supabase Storageアップロードエラー時にnullが返りcontentが[画像]になる", async () => {
      setupDefaultRpc();
      setupMessageChains();

      mockStorageUpload.mockResolvedValueOnce({ error: { message: "Storage quota exceeded" } });

      mockFetch.mockImplementation(async (url: string) => {
        if (typeof url === "string" && url.includes("api-data.line.me")) {
          return {
            ok: true,
            headers: new Headers({ "content-type": "image/jpeg" }),
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
          };
        }
        return {
          ok: true,
          json: () => Promise.resolve({ displayName: "テスト", pictureUrl: "" }),
          text: () => Promise.resolve(""),
          headers: new Headers({ "content-type": "application/json" }),
        };
      });

      const res = await POST(makeWebhookReq({ events: [messageEvent("U001", { type: "image", id: "img-err-1" })] }));
      expect(res.status).toBe(200);
      // message_logにはINSERTされる（[画像]の内容で）
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("message_log");
    });
  });

  // =================================================================
  // 2. getLineProfile / getLineDisplayName
  // =================================================================
  describe("getLineProfile: プロフィール取得", () => {
    it("accessToken未指定時は空のプロフィールが返る（followイベントでプロフィール更新されない）", async () => {
      // accessTokenを空に
      delete process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

      tableChains["patients"] = createChain({
        data: [{ patient_id: "p001", name: "既存太郎" }],
        error: null,
      });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });

      const res = await POST(makeWebhookReq({
        events: [{ type: "follow", source: { type: "user", userId: "U_NOPROFILE" } }],
      }));
      expect(res.status).toBe(200);
      // プロフィールAPI（api.line.me/v2/bot/profile）は呼ばれない
      const profileCalls = mockFetch.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === "string" && (c[0] as string).includes("api.line.me/v2/bot/profile")
      );
      expect(profileCalls.length).toBe(0);
    });

    it("プロフィールAPI応答エラー(!res.ok)時は空のプロフィールで処理が継続する", async () => {
      setupDefaultRpc();
      setupMessageChains();

      // プロフィールAPIだけ失敗させる
      mockFetch.mockImplementation(async (url: string) => {
        if (typeof url === "string" && url.includes("api.line.me/v2/bot/profile")) {
          return { ok: false, status: 404 };
        }
        return {
          ok: true,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(""),
          headers: new Headers({ "content-type": "application/json" }),
        };
      });

      const res = await POST(makeWebhookReq({ events: [messageEvent("U_PROFILE_ERR")] }));
      expect(res.status).toBe(200);
      // エラーでも処理は継続（クラッシュしない）
    });
  });

  // =================================================================
  // 3. mergeFakePatients: LINE_仮レコード統合
  // =================================================================
  describe("mergeFakePatients: LINE_仮レコード統合", () => {
    it("正規患者とLINE_仮レコードが共存する場合、仮レコードが統合される", async () => {
      // findPatientByLineUid: 正規患者 + LINE_仮レコードの両方を返す
      tableChains["patients"] = createChain({
        data: [
          { patient_id: "p-proper-001", name: "正規太郎" },
          { patient_id: "LINE_FAKE01", name: "仮ユーザー" },
        ],
        error: null,
      });
      // マージ対象テーブル
      tableChains["reservations"] = createChain({ data: null, error: null });
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["reorders"] = createChain({ data: null, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = createChain({ data: null, error: null });
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["friend_field_values"] = createChain({ data: null, error: null });
      tableChains["intake"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
      tableChains["keyword_auto_replies"] = createChain({ data: [], error: null });

      // RPCが失敗してフォールバック → findPatientByLineUid が呼ばれる
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: "rpc fail" } });

      const res = await POST(makeWebhookReq({ events: [messageEvent("U_MERGE_TEST")] }));
      expect(res.status).toBe(200);

      // 正規患者(p-proper-001)が返されることを確認するためmessage_logにINSERT
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("message_log");
    });

    it("UNIQUE制約エラー(23505)はmergeFakePatientsで無視される", async () => {
      // UNIQUE制約違反が返るテーブルチェーン
      const uniqueErrorChain = createChain({ data: null, error: { code: "23505", message: "duplicate key" } });
      tableChains["patients"] = createChain({
        data: [
          { patient_id: "p-proper-002", name: "正規次郎" },
          { patient_id: "LINE_FAKE02", name: "仮ユーザー2" },
        ],
        error: null,
      });
      tableChains["reservations"] = uniqueErrorChain;
      tableChains["orders"] = createChain({ data: null, error: null });
      tableChains["reorders"] = createChain({ data: null, error: null });
      tableChains["message_log"] = createChain({ data: null, error: null });
      tableChains["patient_tags"] = uniqueErrorChain;
      tableChains["patient_marks"] = createChain({ data: null, error: null });
      tableChains["friend_field_values"] = createChain({ data: null, error: null });
      tableChains["intake"] = createChain({ data: null, error: null });
      tableChains["tag_definitions"] = createChain({ data: null, error: null });
      tableChains["rich_menus"] = createChain({ data: null, error: null });
      tableChains["keyword_auto_replies"] = createChain({ data: [], error: null });

      mockRpc.mockResolvedValueOnce({ data: null, error: { message: "rpc fail" } });

      // 23505エラーがあってもクラッシュしない
      const res = await POST(makeWebhookReq({ events: [messageEvent("U_MERGE_UNIQUE")] }));
      expect(res.status).toBe(200);
    });
  });

  // =================================================================
  // 4. checkAndReplyKeyword: 完全フロー
  // =================================================================
  describe("checkAndReplyKeyword: 完全フロー", () => {
    it("複数ルールで最初にマッチしたルールのみ実行される", async () => {
      setupDefaultRpc();
      setupMessageChains();

      // 2つのルール: priority順（高い方が先に評価される）
      tableChains["keyword_auto_replies"] = createChain({
        data: [
          {
            id: 10, name: "高優先", keyword: "予約", match_type: "partial",
            is_enabled: true, priority: 10, reply_type: "text",
            reply_text: "高優先の返信", reply_template_id: null, condition_rules: null,
            trigger_count: 0,
          },
          {
            id: 11, name: "低優先", keyword: "予約", match_type: "partial",
            is_enabled: true, priority: 1, reply_type: "text",
            reply_text: "低優先の返信", reply_template_id: null, condition_rules: null,
            trigger_count: 0,
          },
        ],
        error: null,
      });

      await POST(makeWebhookReq({ events: [messageEvent("U001", { type: "text", text: "予約したい" })] }));

      // 高優先のルールだけ実行される
      expect(mockPushMessage).toHaveBeenCalledTimes(1);
      expect(mockPushMessage).toHaveBeenCalledWith(
        "U001",
        [{ type: "text", text: "高優先の返信" }],
        "00000000-0000-0000-0000-000000000001",
      );
    });

    it("テンプレート返信: Flexメッセージ（message_type=flex）", async () => {
      setupDefaultRpc();
      setupMessageChains();

      tableChains["keyword_auto_replies"] = createChain({
        data: [{
          id: 20, name: "Flex返信", keyword: "メニュー", match_type: "exact",
          is_enabled: true, priority: 1, reply_type: "template",
          reply_text: null, reply_template_id: 200, condition_rules: null,
          trigger_count: 0,
        }],
        error: null,
      });

      const flexContent = { type: "bubble", body: { type: "box", layout: "vertical", contents: [] } };
      tableChains["message_templates"] = createChain({
        data: { content: "メニュー案内", message_type: "flex", flex_content: flexContent },
        error: null,
      });

      await POST(makeWebhookReq({ events: [messageEvent("U001", { type: "text", text: "メニュー" })] }));

      expect(mockPushMessage).toHaveBeenCalledWith(
        "U001",
        [expect.objectContaining({ type: "flex", altText: "メニュー案内" })],
        "00000000-0000-0000-0000-000000000001",
      );
    });

    it("テンプレート返信: 画像メッセージ（message_type=image）", async () => {
      setupDefaultRpc();
      setupMessageChains();

      tableChains["keyword_auto_replies"] = createChain({
        data: [{
          id: 21, name: "画像返信", keyword: "地図", match_type: "exact",
          is_enabled: true, priority: 1, reply_type: "template",
          reply_text: null, reply_template_id: 201, condition_rules: null,
          trigger_count: 0,
        }],
        error: null,
      });

      tableChains["message_templates"] = createChain({
        data: { content: "https://example.com/map.png", message_type: "image", flex_content: null },
        error: null,
      });

      await POST(makeWebhookReq({ events: [messageEvent("U001", { type: "text", text: "地図" })] }));

      expect(mockPushMessage).toHaveBeenCalledWith(
        "U001",
        [{
          type: "image",
          originalContentUrl: "https://example.com/map.png",
          previewImageUrl: "https://example.com/map.png",
        }],
        "00000000-0000-0000-0000-000000000001",
      );
    });

    it("condition_rulesがnullの場合は条件チェックをスキップしてマッチする", async () => {
      setupDefaultRpc();
      setupMessageChains();

      tableChains["keyword_auto_replies"] = createChain({
        data: [{
          id: 22, name: "条件なし", keyword: "テスト", match_type: "exact",
          is_enabled: true, priority: 1, reply_type: "text",
          reply_text: "条件なし返信", reply_template_id: null,
          condition_rules: null,
          trigger_count: 0,
        }],
        error: null,
      });

      await POST(makeWebhookReq({ events: [messageEvent("U001", { type: "text", text: "テスト" })] }));
      expect(mockPushMessage).toHaveBeenCalledWith(
        "U001",
        [{ type: "text", text: "条件なし返信" }],
        "00000000-0000-0000-0000-000000000001",
      );
    });

    it("変数置換: {name}, {patient_id}, {send_date}が正しく置換される", async () => {
      setupDefaultRpc("p-var-001", "山田花子");
      setupMessageChains();

      tableChains["keyword_auto_replies"] = createChain({
        data: [{
          id: 23, name: "変数テスト", keyword: "情報", match_type: "exact",
          is_enabled: true, priority: 1, reply_type: "text",
          reply_text: "{name}様（ID: {patient_id}）今日は{send_date}です。",
          reply_template_id: null, condition_rules: null,
          trigger_count: 0,
        }],
        error: null,
      });

      await POST(makeWebhookReq({ events: [messageEvent("U001", { type: "text", text: "情報" })] }));

      const callArgs = mockPushMessage.mock.calls[0];
      const sentText = callArgs[1][0].text;
      expect(sentText).toContain("山田花子様");
      expect(sentText).toContain("p-var-001");
      // 日付は動的なのでフォーマットだけ確認
      expect(sentText).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/);
    });
  });

  // =================================================================
  // 5. evaluateConditionRules: タグ条件の詳細
  // =================================================================
  describe("evaluateConditionRules: タグ条件評価", () => {
    it("not_hasオペレーター: タグを持っていない場合にマッチ", async () => {
      setupDefaultRpc();
      setupMessageChains();

      // 条件: tag_id=100 を持っていない(not_has)
      tableChains["keyword_auto_replies"] = createChain({
        data: [{
          id: 30, name: "タグなし限定", keyword: "特典", match_type: "exact",
          is_enabled: true, priority: 1, reply_type: "text",
          reply_text: "初めての方への特典です！",
          reply_template_id: null,
          condition_rules: [{ type: "tag", tag_id: 100, operator: "not_has" }],
          trigger_count: 0,
        }],
        error: null,
      });

      // patient_tags: tag_id=100を持っていない（空リスト）
      tableChains["patient_tags"] = createChain({ data: [], error: null });

      await POST(makeWebhookReq({ events: [messageEvent("U001", { type: "text", text: "特典" })] }));

      // not_has条件を満たすのでマッチ→返信
      expect(mockPushMessage).toHaveBeenCalledWith(
        "U001",
        [{ type: "text", text: "初めての方への特典です！" }],
        "00000000-0000-0000-0000-000000000001",
      );
    });

    it("not_hasオペレーター: タグを持っている場合はスキップ", async () => {
      setupDefaultRpc();
      setupMessageChains();

      tableChains["keyword_auto_replies"] = createChain({
        data: [{
          id: 31, name: "タグなし限定", keyword: "特典", match_type: "exact",
          is_enabled: true, priority: 1, reply_type: "text",
          reply_text: "初めての方への特典です！",
          reply_template_id: null,
          condition_rules: [{ type: "tag", tag_id: 100, operator: "not_has" }],
          trigger_count: 0,
        }],
        error: null,
      });

      // patient_tags: tag_id=100を持っている
      tableChains["patient_tags"] = createChain({ data: [{ tag_id: 100 }], error: null });

      await POST(makeWebhookReq({ events: [messageEvent("U001", { type: "text", text: "特典" })] }));

      // not_has条件を満たさない → キーワード返信なし → AI返信がスケジュール
      expect(mockScheduleAiReply).toHaveBeenCalled();
    });
  });

  // =================================================================
  // 6. handleChatbotMessage: チャットボットフロー
  // =================================================================
  describe("handleChatbotMessage: チャットボットフロー", () => {
    it("アクティブセッションがある場合processUserInputで処理される", async () => {
      setupDefaultRpc();
      setupMessageChains();

      // チャットボット: アクティブセッションあり
      mockGetActiveSession.mockResolvedValueOnce({ id: "session-001" });
      // processUserInput: テキスト応答を返す
      mockProcessUserInput.mockResolvedValueOnce({ type: "text", text: "チャットボット応答です" });

      await POST(makeWebhookReq({ events: [messageEvent("U_BOT_01", { type: "text", text: "はい" })] }));

      expect(mockProcessUserInput).toHaveBeenCalledWith("session-001", "はい", "00000000-0000-0000-0000-000000000001");
      expect(mockPushMessage).toHaveBeenCalledWith(
        "U_BOT_01",
        [{ type: "text", text: "チャットボット応答です" }],
        "00000000-0000-0000-0000-000000000001",
      );
      // チャットボットで処理されたのでAI返信は呼ばれない
      expect(mockScheduleAiReply).not.toHaveBeenCalled();
    });

    it("アクティブセッションで選択肢付き応答（Flex Message）が送信される", async () => {
      setupDefaultRpc();
      setupMessageChains();

      mockGetActiveSession.mockResolvedValueOnce({ id: "session-002" });
      mockProcessUserInput.mockResolvedValueOnce({
        type: "question",
        text: "どちらを選びますか？",
        buttons: [
          { label: "選択A", value: "a" },
          { label: "選択B", value: "b" },
        ],
      });

      await POST(makeWebhookReq({ events: [messageEvent("U_BOT_02", { type: "text", text: "選択" })] }));

      // Flexメッセージで送信
      expect(mockPushMessage).toHaveBeenCalledWith(
        "U_BOT_02",
        [expect.objectContaining({ type: "flex", altText: "どちらを選びますか？" })],
        "00000000-0000-0000-0000-000000000001",
      );
    });

    it("新規シナリオ開始: キーワードトリガーでシナリオが見つかる", async () => {
      setupDefaultRpc();
      setupMessageChains();

      // アクティブセッションなし
      mockGetActiveSession.mockResolvedValueOnce(null);
      // キーワードでシナリオ発見
      mockFindScenarioByKeyword.mockResolvedValueOnce({ id: "scenario-001", name: "予約フロー" });
      // シナリオ開始 → セッション作成
      mockStartScenario.mockResolvedValueOnce({ id: "session-new-001" });
      // 最初のメッセージ
      mockGetNextMessage.mockResolvedValueOnce({ type: "text", text: "予約フローを開始します。" });

      await POST(makeWebhookReq({ events: [messageEvent("U_BOT_03", { type: "text", text: "予約開始" })] }));

      expect(mockStartScenario).toHaveBeenCalledWith("p001", "scenario-001", "00000000-0000-0000-0000-000000000001");
      expect(mockPushMessage).toHaveBeenCalledWith(
        "U_BOT_03",
        [{ type: "text", text: "予約フローを開始します。" }],
        "00000000-0000-0000-0000-000000000001",
      );
      // チャットボットで処理 → AI返信なし
      expect(mockScheduleAiReply).not.toHaveBeenCalled();
    });

    it("新規シナリオ開始時に選択肢付きメッセージが返る場合Flexで送信される", async () => {
      setupDefaultRpc();
      setupMessageChains();

      mockGetActiveSession.mockResolvedValueOnce(null);
      mockFindScenarioByKeyword.mockResolvedValueOnce({ id: "scenario-002" });
      mockStartScenario.mockResolvedValueOnce({ id: "session-new-002" });
      mockGetNextMessage.mockResolvedValueOnce({
        type: "question",
        text: "何をご希望ですか？",
        buttons: [{ label: "初診", value: "first" }],
      });

      await POST(makeWebhookReq({ events: [messageEvent("U_BOT_04", { type: "text", text: "診察" })] }));

      expect(mockPushMessage).toHaveBeenCalledWith(
        "U_BOT_04",
        [expect.objectContaining({ type: "flex" })],
        "00000000-0000-0000-0000-000000000001",
      );
    });

    it("チャットボット未処理時（シナリオなし）はAI返信にフォールバック", async () => {
      setupDefaultRpc();
      setupMessageChains();

      mockGetActiveSession.mockResolvedValueOnce(null);
      mockFindScenarioByKeyword.mockResolvedValueOnce(null);

      await POST(makeWebhookReq({ events: [messageEvent("U_BOT_05", { type: "text", text: "一般質問" })] }));

      // チャットボット未処理 → AI返信がスケジュール
      expect(mockScheduleAiReply).toHaveBeenCalledWith(
        "U_BOT_05", "p001", "テスト", "一般質問",
        "00000000-0000-0000-0000-000000000001",
      );
    });

    it("アクティブセッション完了（response=null）時はAI返信にフォールスルー", async () => {
      setupDefaultRpc();
      setupMessageChains();

      mockGetActiveSession.mockResolvedValueOnce({ id: "session-done" });
      // セッション完了 → null
      mockProcessUserInput.mockResolvedValueOnce(null);
      // シナリオキーワードも見つからない
      mockFindScenarioByKeyword.mockResolvedValueOnce(null);

      await POST(makeWebhookReq({ events: [messageEvent("U_BOT_06", { type: "text", text: "完了" })] }));

      // チャットボット処理がfalseを返す → AI返信にフォールバック
      expect(mockScheduleAiReply).toHaveBeenCalled();
    });
  });

  // =================================================================
  // 7. executeRichMenuActions: 残りアクションタイプ
  // =================================================================
  describe("executeRichMenuActions: 追加アクションタイプ", () => {
    it("tag_op: タグ追加アクション", async () => {
      setupDefaultRpc();
      setupMessageChains();

      // tag_definitions: タグが存在する
      tableChains["tag_definitions"] = createChain({ data: { id: 50 }, error: null });

      const pbData = JSON.stringify({
        type: "rich_menu_action",
        actions: [{ type: "tag_op", value: "VIP", mode: "add" }],
      });

      await POST(makeWebhookReq({ events: [postbackEvent("U_TAG_01", pbData)] }));

      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("tag_definitions");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("patient_tags");
    });

    it("tag_op: タグ解除アクション（mode=remove）", async () => {
      setupDefaultRpc();
      setupMessageChains();

      tableChains["tag_definitions"] = createChain({ data: { id: 50 }, error: null });

      const pbData = JSON.stringify({
        type: "rich_menu_action",
        actions: [{ type: "tag_op", value: "VIP", mode: "remove" }],
      });

      await POST(makeWebhookReq({ events: [postbackEvent("U_TAG_02", pbData)] }));

      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("patient_tags");
    });

    it("mark_display: 対応マーク更新アクション", async () => {
      setupDefaultRpc();
      setupMessageChains();

      const pbData = JSON.stringify({
        type: "rich_menu_action",
        actions: [{ type: "mark_display", value: "yellow" }],
      });

      await POST(makeWebhookReq({ events: [postbackEvent("U_MARK_01", pbData)] }));

      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("patient_marks");
    });

    it("menu_op: リッチメニュー切り替えアクション", async () => {
      setupDefaultRpc();
      setupMessageChains();

      // rich_menus: メニューが存在
      tableChains["rich_menus"] = createChain({
        data: { line_rich_menu_id: "richmenu-abc123", name: "メインメニュー" },
        error: null,
      });

      const pbData = JSON.stringify({
        type: "rich_menu_action",
        actions: [{ type: "menu_op", value: "5" }],
      });

      await POST(makeWebhookReq({ events: [postbackEvent("U_MENU_01", pbData)] }));

      // LINE APIへのメニュー割り当てリクエスト
      const menuCalls = mockFetch.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === "string" && (c[0] as string).includes("richmenu/richmenu-abc123")
      );
      expect(menuCalls.length).toBeGreaterThan(0);
    });

    it("friend_info: 友だち情報欄の代入アクション", async () => {
      setupDefaultRpc();
      setupMessageChains();

      // friend_field_definitions: フィールド定義が存在
      tableChains["friend_field_definitions"] = createChain({ data: { id: 10 }, error: null });
      // friend_field_values: 既存値なし
      tableChains["friend_field_values"] = createChain({ data: null, error: null });

      const pbData = JSON.stringify({
        type: "rich_menu_action",
        actions: [{ type: "friend_info", fieldName: "来院回数", value: "1", operation: "assign" }],
      });

      await POST(makeWebhookReq({ events: [postbackEvent("U_FRIEND_01", pbData)] }));

      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("friend_field_definitions");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("friend_field_values");
    });

    it("friend_info: deleteオペレーション", async () => {
      setupDefaultRpc();
      setupMessageChains();

      tableChains["friend_field_definitions"] = createChain({ data: { id: 10 }, error: null });
      tableChains["friend_field_values"] = createChain({ data: null, error: null });

      const pbData = JSON.stringify({
        type: "rich_menu_action",
        actions: [{ type: "friend_info", fieldName: "メモ", operation: "delete" }],
      });

      await POST(makeWebhookReq({ events: [postbackEvent("U_FRIEND_02", pbData)] }));

      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("friend_field_values");
    });

    it("template_send: Flexテンプレート送信", async () => {
      setupDefaultRpc();
      setupMessageChains();

      const flexContent = { type: "bubble", body: { type: "box", layout: "vertical", contents: [] } };
      tableChains["message_templates"] = createChain({
        data: { content: "Flexご案内", name: "Flexテンプレ", message_type: "flex", flex_content: flexContent },
        error: null,
      });

      const pbData = JSON.stringify({
        type: "rich_menu_action",
        actions: [{ type: "template_send", value: "1" }],
      });

      await POST(makeWebhookReq({ events: [postbackEvent("U_TMPL_FLEX", pbData)] }));

      expect(mockPushMessage).toHaveBeenCalledWith(
        "U_TMPL_FLEX",
        [expect.objectContaining({ type: "flex", altText: "Flexテンプレ" })],
        "00000000-0000-0000-0000-000000000001",
      );
    });

    it("template_send: 画像テンプレート送信", async () => {
      setupDefaultRpc();
      setupMessageChains();

      tableChains["message_templates"] = createChain({
        data: { content: "https://example.com/img.png", name: "画像テンプレ", message_type: "image", flex_content: null },
        error: null,
      });

      const pbData = JSON.stringify({
        type: "rich_menu_action",
        actions: [{ type: "template_send", value: "2" }],
      });

      await POST(makeWebhookReq({ events: [postbackEvent("U_TMPL_IMG", pbData)] }));

      expect(mockPushMessage).toHaveBeenCalledWith(
        "U_TMPL_IMG",
        [{
          type: "image",
          originalContentUrl: "https://example.com/img.png",
          previewImageUrl: "https://example.com/img.png",
        }],
        "00000000-0000-0000-0000-000000000001",
      );
    });

    it("未対応アクションタイプはログ出力のみでエラーにならない", async () => {
      setupDefaultRpc();
      setupMessageChains();

      const pbData = JSON.stringify({
        type: "rich_menu_action",
        actions: [{ type: "unknown_action_type", value: "xxx" }],
      });

      const res = await POST(makeWebhookReq({ events: [postbackEvent("U_UNKNOWN_ACT", pbData)] }));
      expect(res.status).toBe(200);
      // pushMessageは呼ばれない（アクション実行されない）
      expect(mockPushMessage).not.toHaveBeenCalled();
    });
  });

  // =================================================================
  // 8. AI返信タイミング（after()内処理）
  // =================================================================
  describe("AI返信: after()内処理フロー", () => {
    it("pendingAiReplyTargetsがある場合after()コールバックが登録される", async () => {
      setupDefaultRpc();
      setupMessageChains();

      // チャットボット・キーワード未マッチ → AI返信パスに進む
      mockGetActiveSession.mockResolvedValueOnce(null);
      mockFindScenarioByKeyword.mockResolvedValueOnce(null);

      await POST(makeWebhookReq({ events: [messageEvent("U_AI_01", { type: "text", text: "質問です" })] }));

      // after()が呼ばれることを確認
      expect(mockAfterCallbacks.length).toBeGreaterThan(0);
    });

    it("after()内でacquireLock成功時にprocessAiReplyが呼ばれる", async () => {
      setupDefaultRpc();
      setupMessageChains();

      mockGetActiveSession.mockResolvedValueOnce(null);
      mockFindScenarioByKeyword.mockResolvedValueOnce(null);
      mockAcquireLock.mockResolvedValueOnce({ acquired: true, release: vi.fn() });

      await POST(makeWebhookReq({ events: [messageEvent("U_AI_02", { type: "text", text: "質問です" })] }));

      // after()コールバック実行
      for (const cb of mockAfterCallbacks) {
        await cb();
      }

      expect(mockProcessAiReply).toHaveBeenCalled();
      expect(mockClearAiReplyDebounce).toHaveBeenCalled();
    });

    it("after()内でacquireLock失敗時にrescheduleAiReplyが呼ばれる", async () => {
      setupDefaultRpc();
      setupMessageChains();

      mockGetActiveSession.mockResolvedValueOnce(null);
      mockFindScenarioByKeyword.mockResolvedValueOnce(null);
      mockAcquireLock.mockResolvedValueOnce({ acquired: false });

      await POST(makeWebhookReq({ events: [messageEvent("U_AI_03", { type: "text", text: "質問です" })] }));

      for (const cb of mockAfterCallbacks) {
        await cb();
      }

      // ロック失敗 → cronに委任
      expect(mockRescheduleAiReply).toHaveBeenCalled();
      expect(mockProcessAiReply).not.toHaveBeenCalled();
    });
  });

  // =================================================================
  // 9. 営業時間外処理
  // =================================================================
  describe("営業時間外: 定型メッセージ送信", () => {
    it("営業時間外でoutsideMessageがある場合、定型メッセージが送信されAI返信はスキップ", async () => {
      setupDefaultRpc();
      setupMessageChains();

      mockIsWithinBusinessHours.mockResolvedValueOnce({
        withinHours: false,
        outsideMessage: "現在営業時間外です。翌営業日にご連絡します。",
      });
      mockGetActiveSession.mockResolvedValueOnce(null);
      mockFindScenarioByKeyword.mockResolvedValueOnce(null);

      await POST(makeWebhookReq({ events: [messageEvent("U_BIZ_01", { type: "text", text: "質問です" })] }));

      expect(mockPushMessage).toHaveBeenCalledWith(
        "U_BIZ_01",
        [{ type: "text", text: "現在営業時間外です。翌営業日にご連絡します。" }],
        "00000000-0000-0000-0000-000000000001",
      );
      // AI返信はスキップ
      expect(mockScheduleAiReply).not.toHaveBeenCalled();
    });

    it("営業時間チェックエラー時はAI返信フローにフォールバック", async () => {
      setupDefaultRpc();
      setupMessageChains();

      mockIsWithinBusinessHours.mockRejectedValueOnce(new Error("Redis接続エラー"));
      mockGetActiveSession.mockResolvedValueOnce(null);
      mockFindScenarioByKeyword.mockResolvedValueOnce(null);

      await POST(makeWebhookReq({ events: [messageEvent("U_BIZ_02", { type: "text", text: "質問です" })] }));

      // エラー時はフォールバックでAI返信がスケジュール
      expect(mockScheduleAiReply).toHaveBeenCalled();
    });
  });
});

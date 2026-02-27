// lib/__tests__/ai-reply.test.ts — AI返信テスト

// --- テーブルごとの独立チェーン生成 ---
function createChain(defaultResolve: any = { data: null, error: null }) {
  const chain: any = {};
  const methods = [
    "insert", "update", "delete", "select", "eq", "neq", "in",
    "is", "not", "order", "limit", "range", "single", "maybeSingle",
    "upsert", "gte",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

// --- テーブルごとのチェーンマップ ---
let tableChains: Record<string, ReturnType<typeof createChain>> = {};

function resetTableChains() {
  tableChains = {
    ai_reply_settings: createChain({ data: null, error: null }),
    ai_reply_drafts: createChain({ data: null, error: null }),
    message_log: createChain({ data: null, error: null }),
  };
}

// --- モック定義 ---
vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn() }));
vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    ttl: vi.fn(),
    sadd: vi.fn(),
    smembers: vi.fn(),
    srem: vi.fn(),
  },
}));
vi.mock("@/lib/line-push", () => ({ pushMessage: vi.fn() }));
vi.mock("@/lib/ai-reply-filter", () => ({ shouldProcessWithAI: vi.fn() }));
vi.mock("@/lib/ai-reply-approval", () => ({ sendApprovalFlexMessage: vi.fn() }));
vi.mock("@/lib/settings", () => ({ getSettingOrEnv: vi.fn() }));
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({})),
}));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (!tableChains[table]) tableChains[table] = createChain();
      return tableChains[table];
    }),
  },
}));

import {
  buildSystemPrompt,
  buildUserMessage,
  scheduleAiReply,
  processPendingAiReplies,
  sendAiReply,
  handleImplicitAiFeedback,
  lastProcessLog,
  determineFlowStage,
  fetchPatientFlowStatus,
  type RejectedDraftEntry,
  type PatientFlowStatus,
} from "@/lib/ai-reply";
import { redis } from "@/lib/redis";
import { pushMessage } from "@/lib/line-push";
import { shouldProcessWithAI } from "@/lib/ai-reply-filter";
import { sendApprovalFlexMessage } from "@/lib/ai-reply-approval";
import { getSettingOrEnv } from "@/lib/settings";
import Anthropic from "@anthropic-ai/sdk";

// --- processAiReply テスト用ヘルパー ---
// デバウンス通過済みエントリをセットアップし、processAiReplyを間接呼び出しする
function setupDebounceEntry(overrides?: Partial<{
  lineUid: string; patientId: string; patientName: string; tenantId: string | null;
}>) {
  const entry = {
    lineUid: overrides?.lineUid ?? "uid1",
    patientId: overrides?.patientId ?? "p1",
    patientName: overrides?.patientName ?? "田中",
    tenantId: overrides?.tenantId ?? null,
    ts: Date.now() - 15_000, // 15秒前（10秒超）
  };
  vi.mocked(redis.smembers).mockResolvedValue([entry.patientId]);
  vi.mocked(redis.get).mockResolvedValue(JSON.stringify(entry));
  return entry;
}

// Claude APIモッククラスを返すヘルパー
function mockAnthropicCreate(responseText: string, inputTokens = 100, outputTokens = 50) {
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: responseText }],
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  });
  // new Anthropic() でインスタンス化されるのでclassとしてモック
  vi.mocked(Anthropic as any).mockImplementation(function (this: any) {
    this.messages = { create: mockCreate };
  });
  return mockCreate;
}

// supabaseAdmin.from のデフォルトモックをリセットするヘルパー
async function resetFromMock() {
  const { supabaseAdmin } = await import("@/lib/supabase");
  vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
    if (!tableChains[table]) tableChains[table] = createChain();
    return tableChains[table];
  });
}

// ============================================================
// buildSystemPrompt（純粋関数テスト）
// ============================================================
describe("buildSystemPrompt", () => {
  it("ナレッジベースあり・カスタム指示あり → 両方含む", () => {
    const result = buildSystemPrompt("KB内容", "カスタム指示内容");
    expect(result).toContain("KB内容");
    expect(result).toContain("カスタム指示内容");
    expect(result).not.toContain("（未設定）");
  });

  it("ナレッジベースなし → （未設定）が表示される", () => {
    const result = buildSystemPrompt("", "カスタム指示");
    expect(result).toContain("（未設定）");
    expect(result).toContain("カスタム指示");
  });

  it("カスタム指示なし → デフォルト指示が含まれる", () => {
    const result = buildSystemPrompt("KB", "");
    expect(result).toContain("丁寧で親しみやすい口調");
    expect(result).toContain("KB");
  });

  it("両方なし → デフォルト指示+（未設定）", () => {
    const result = buildSystemPrompt("", "");
    expect(result).toContain("（未設定）");
    expect(result).toContain("丁寧で親しみやすい口調");
  });

  it("却下パターンあり → 却下セクションが追加される", () => {
    const rejected: RejectedDraftEntry[] = [
      {
        original_message: "診察はいつですか？",
        draft_reply: "明日です",
        reject_category: "inaccurate",
        reject_reason: "日時が不正確",
      },
    ];
    const result = buildSystemPrompt("KB", "指示", rejected);
    expect(result).toContain("過去の却下された返信例");
    expect(result).toContain("診察はいつですか？");
    expect(result).toContain("明日です");
    expect(result).toContain("不正確");
    expect(result).toContain("日時が不正確");
  });

  it("却下パターン複数 → 全件が含まれる", () => {
    const rejected: RejectedDraftEntry[] = [
      {
        original_message: "メッセージ1",
        draft_reply: "返信1",
        reject_category: "inappropriate",
        reject_reason: null,
      },
      {
        original_message: "メッセージ2",
        draft_reply: "返信2",
        reject_category: "not_answering",
        reject_reason: "質問と無関係",
      },
    ];
    const result = buildSystemPrompt("KB", "指示", rejected);
    expect(result).toContain("メッセージ1");
    expect(result).toContain("メッセージ2");
    expect(result).toContain("不適切な表現");
    expect(result).toContain("質問に答えていない");
  });

  it("却下パターンのreject_categoryがnull → 「理由なし」", () => {
    const rejected: RejectedDraftEntry[] = [
      {
        original_message: "テスト",
        draft_reply: "返信",
        reject_category: null,
        reject_reason: null,
      },
    ];
    const result = buildSystemPrompt("KB", "指示", rejected);
    expect(result).toContain("理由なし");
  });

  it("却下パターンのdraft_replyがnull → 空文字で表示", () => {
    const rejected: RejectedDraftEntry[] = [
      {
        original_message: "テスト",
        draft_reply: null,
        reject_category: "other",
        reject_reason: null,
      },
    ];
    const result = buildSystemPrompt("KB", "指示", rejected);
    expect(result).toContain('AI返信案: ""');
  });

  it("却下パターンが空配列 → 却下セクションなし", () => {
    const result = buildSystemPrompt("KB", "指示", []);
    expect(result).not.toContain("過去の却下された返信例");
  });

  it("却下パターンundefined → 却下セクションなし", () => {
    const result = buildSystemPrompt("KB", "指示", undefined);
    expect(result).not.toContain("過去の却下された返信例");
  });

  it("必須セクションがすべて含まれる", () => {
    const result = buildSystemPrompt("KB", "指示");
    expect(result).toContain("カテゴリ分類");
    expect(result).toContain("operational");
    expect(result).toContain("medical");
    expect(result).toContain("greeting");
    expect(result).toContain("other");
    expect(result).toContain("出力形式");
    expect(result).toContain("JSON");
  });
});

// ============================================================
// scheduleAiReply
// ============================================================
describe("scheduleAiReply", () => {
  beforeEach(() => {
    resetTableChains();
    vi.clearAllMocks();
  });

  it("設定が無効（is_enabled=false）→ 早期リターン", async () => {
    tableChains.ai_reply_settings.then.mockImplementation((r: any) =>
      r({ data: { is_enabled: false }, error: null })
    );
    await scheduleAiReply("uid1", "p1", "田中", "こんにちは", null);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("設定がnull → 早期リターン", async () => {
    tableChains.ai_reply_settings.then.mockImplementation((r: any) =>
      r({ data: null, error: null })
    );
    await scheduleAiReply("uid1", "p1", "田中", "こんにちは", null);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("フィルタリングでスキップ → Redis保存されない", async () => {
    tableChains.ai_reply_settings.then.mockImplementation((r: any) =>
      r({ data: { is_enabled: true }, error: null })
    );
    vi.mocked(shouldProcessWithAI).mockReturnValue({ process: false, reason: "too_short" });
    await scheduleAiReply("uid1", "p1", "田中", "あ", null);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("フィルタリング通過 → Redisにデバウンス情報が保存される", async () => {
    tableChains.ai_reply_settings.then.mockImplementation((r: any) =>
      r({ data: { is_enabled: true }, error: null })
    );
    vi.mocked(shouldProcessWithAI).mockReturnValue({ process: true });

    await scheduleAiReply("uid1", "p1", "田中", "予約を変更したいです", null);

    expect(redis.set).toHaveBeenCalledTimes(1);
    const setCall = vi.mocked(redis.set).mock.calls[0];
    expect(setCall[0]).toBe("ai_debounce:p1");
    const parsed = JSON.parse(setCall[1] as string);
    expect(parsed.lineUid).toBe("uid1");
    expect(parsed.patientId).toBe("p1");
    expect(parsed.patientName).toBe("田中");
    expect(redis.sadd).toHaveBeenCalledWith("ai_debounce_keys", "p1");
  });

  it("Redis set失敗 → エラーをキャッチしてリターン", async () => {
    tableChains.ai_reply_settings.then.mockImplementation((r: any) =>
      r({ data: { is_enabled: true }, error: null })
    );
    vi.mocked(shouldProcessWithAI).mockReturnValue({ process: true });
    vi.mocked(redis.set).mockRejectedValue(new Error("Redis error"));

    // エラーがスローされないことを確認
    await expect(
      scheduleAiReply("uid1", "p1", "田中", "テストメッセージです", null)
    ).resolves.toBeUndefined();
  });
});

// ============================================================
// processPendingAiReplies
// ============================================================
describe("processPendingAiReplies", () => {
  beforeEach(() => {
    resetTableChains();
    vi.clearAllMocks();
  });

  it("デバウンスキーが空 → 0件処理", async () => {
    vi.mocked(redis.smembers).mockResolvedValue([]);
    const result = await processPendingAiReplies();
    expect(result).toBe(0);
  });

  it("デバウンスキーがnull → 0件処理", async () => {
    vi.mocked(redis.smembers).mockResolvedValue(null as any);
    const result = await processPendingAiReplies();
    expect(result).toBe(0);
  });

  it("Redis getでnull（TTL切れ）→ セットから除去", async () => {
    vi.mocked(redis.smembers).mockResolvedValue(["p1"]);
    vi.mocked(redis.get).mockResolvedValue(null);

    const result = await processPendingAiReplies();
    expect(result).toBe(0);
    expect(redis.srem).toHaveBeenCalledWith("ai_debounce_keys", "p1");
  });

  it("不正なJSON → キー削除してスキップ", async () => {
    vi.mocked(redis.smembers).mockResolvedValue(["p1"]);
    vi.mocked(redis.get).mockResolvedValue("invalid json{{{");

    const result = await processPendingAiReplies();
    expect(result).toBe(0);
    expect(redis.del).toHaveBeenCalledWith("ai_debounce:p1");
    expect(redis.srem).toHaveBeenCalledWith("ai_debounce_keys", "p1");
  });

  it("デバウンス期間未経過（10秒未満）→ スキップ", async () => {
    vi.mocked(redis.smembers).mockResolvedValue(["p1"]);
    const entry = {
      lineUid: "uid1",
      patientId: "p1",
      patientName: "田中",
      tenantId: null,
      ts: Date.now() - 5000, // 5秒前（10秒未満）
    };
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify(entry));

    const result = await processPendingAiReplies();
    expect(result).toBe(0);
    // マーカー削除されていない
    expect(redis.del).not.toHaveBeenCalled();
  });

  it("smembersでエラー → 0件で返る（キャッチされる）", async () => {
    vi.mocked(redis.smembers).mockRejectedValue(new Error("Redis error"));
    const result = await processPendingAiReplies();
    expect(result).toBe(0);
  });

  it("rawが既にオブジェクト（JSON.parseが不要） → 正常にパースされる", async () => {
    const entry = {
      lineUid: "uid1",
      patientId: "p1",
      patientName: "田中",
      tenantId: null,
      ts: Date.now() - 5_000, // デバウンス未経過 → スキップ
    };
    vi.mocked(redis.smembers).mockResolvedValue(["p1"]);
    // rawがオブジェクトとして返る（Upstash Redisの挙動）
    vi.mocked(redis.get).mockResolvedValue(entry as any);

    const result = await processPendingAiReplies();
    expect(result).toBe(0);
    // パースエラーにならずスキップ（デバウンス未経過）
    expect(redis.del).not.toHaveBeenCalled();
  });

  it("デバウンス通過 → マーカー削除してprocessAiReply呼び出し", async () => {
    setupDebounceEntry();

    // processAiReply内: settings無効で早期リターンさせる
    tableChains.ai_reply_settings.then.mockImplementation((r: any) =>
      r({ data: { is_enabled: false }, error: null })
    );

    const result = await processPendingAiReplies();
    // processAiReplyが呼ばれたが設定無効で0件（processedはインクリメントされる）
    expect(result).toBe(1);
    // マーカー削除が呼ばれた
    expect(redis.del).toHaveBeenCalledWith("ai_debounce:p1");
    expect(redis.srem).toHaveBeenCalledWith("ai_debounce_keys", "p1");
  });

  it("processAiReply内でエラー → キャッチされて0件扱い", async () => {
    setupDebounceEntry();

    // processAiReply内で例外を投げさせる
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation(() => {
      throw new Error("DB接続エラー");
    });

    const result = await processPendingAiReplies();
    // processAiReplyがエラーだが例外は握りつぶされる
    expect(result).toBe(0);
    // マーカー削除は呼ばれている（processAiReply呼び出し前に実行済み）
    expect(redis.del).toHaveBeenCalledWith("ai_debounce:p1");
  });

  it("複数のデバウンスエントリ → 各エントリが独立して処理される", async () => {
    await resetFromMock(); // 前のテストで上書きされた from モックをリセット
    const entry1 = {
      lineUid: "uid1", patientId: "p1", patientName: "田中", tenantId: null,
      ts: Date.now() - 15_000, // 15秒前（10秒超 → デバウンス通過）
    };
    const entry2 = {
      lineUid: "uid2", patientId: "p2", patientName: "佐藤", tenantId: null,
      ts: Date.now() - 5_000, // 5秒前（10秒未満 → デバウンス未経過）
    };
    vi.mocked(redis.smembers).mockResolvedValue(["p1", "p2"]);
    vi.mocked(redis.get).mockImplementation(async (key: string) => {
      if (key === "ai_debounce:p1") return JSON.stringify(entry1);
      if (key === "ai_debounce:p2") return JSON.stringify(entry2);
      return null;
    });

    // p1のprocessAiReplyが実行される: settings無効で早期リターン
    tableChains.ai_reply_settings.then.mockImplementation((r: any) =>
      r({ data: { is_enabled: false }, error: null })
    );

    const result = await processPendingAiReplies();
    // p1のみ処理（p2はデバウンス未経過でスキップ）
    expect(result).toBe(1);
    expect(redis.del).toHaveBeenCalledWith("ai_debounce:p1");
    expect(redis.del).not.toHaveBeenCalledWith("ai_debounce:p2");
  });
});

// ============================================================
// processAiReply（processPendingAiReplies経由の間接テスト）
// ============================================================
describe("processAiReply（間接テスト）", () => {
  beforeEach(() => {
    resetTableChains();
    vi.clearAllMocks();
  });

  // デバウンス通過後にprocessAiReplyが呼ばれるセットアップ
  function setupForProcessAiReply() {
    setupDebounceEntry();
  }

  it("設定が無効（is_enabled=false）→ 早期リターン", async () => {
    setupForProcessAiReply();
    tableChains.ai_reply_settings.then.mockImplementation((r: any) =>
      r({ data: { is_enabled: false }, error: null })
    );

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
  });

  it("設定がnull → 早期リターン", async () => {
    setupForProcessAiReply();
    tableChains.ai_reply_settings.then.mockImplementation((r: any) =>
      r({ data: null, error: null })
    );

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
  });

  it("日次上限到達 → 早期リターン", async () => {
    setupForProcessAiReply();
    const settings = { is_enabled: true, daily_limit: 10 };

    // 1回目: settings取得、2回目: 日次カウント
    let settingsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") {
        settingsCallCount++;
        return createChain({ data: settings, error: null });
      }
      if (table === "ai_reply_drafts") {
        // 日次カウント: 上限に到達
        return createChain({ data: null, error: null, count: 10 });
      }
      return createChain();
    });

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
  });

  it("APIキー未設定 → 早期リターン", async () => {
    setupForProcessAiReply();
    const settings = { is_enabled: true, daily_limit: 100 };

    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") {
        return createChain({ data: settings, error: null });
      }
      if (table === "ai_reply_drafts") {
        return createChain({ data: null, error: null, count: 0 });
      }
      return createChain();
    });
    // APIキー未設定
    vi.mocked(getSettingOrEnv).mockResolvedValue("");

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
  });

  it("未返信メッセージなし → 早期リターン", async () => {
    setupForProcessAiReply();
    const settings = { is_enabled: true, daily_limit: 100 };

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") {
        return createChain({ data: settings, error: null });
      }
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) {
          // 日次カウント
          return createChain({ data: null, error: null, count: 0 });
        }
        // 既存pendingドラフトの更新（expired化）
        return createChain({ data: null, error: null });
      }
      if (table === "message_log") {
        // 直近会話: outgoing のみ（未返信メッセージなし）
        return createChain({
          data: [
            { direction: "outgoing", content: "こんにちは", event_type: "message", sent_at: "2026-01-01T00:00:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
  });

  it("Claude APIレスポンス: 直接JSON → 正常にパースされる", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "テストKB", custom_instructions: "丁寧に",
      approval_timeout_hours: 24,
    };
    const aiResponse = JSON.stringify({
      category: "operational",
      confidence: 0.9,
      reply: "ご予約の変更を承ります。",
      reason: "予約変更の問い合わせ",
    });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") {
        return createChain({ data: settings, error: null });
      }
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 }); // 日次カウント
        if (draftsCallCount === 2) return createChain({ data: null, error: null }); // pending expired化
        if (draftsCallCount === 3) return createChain({ data: null, error: null }); // 却下パターン取得
        // ドラフト挿入
        return createChain({ data: { id: 42 }, error: null });
      }
      if (table === "message_log") {
        return createChain({
          data: [
            { direction: "incoming", content: "予約を変更したい", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    mockAnthropicCreate(aiResponse);

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    // approvalモードなのでsendApprovalFlexMessageが呼ばれる
    expect(sendApprovalFlexMessage).toHaveBeenCalled();
  });

  it("Claude APIレスポンス: コードブロック内JSON → 正常にパースされる", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "auto",
      knowledge_base: "", custom_instructions: "",
      approval_timeout_hours: 24,
    };
    const aiResponse = '```json\n{"category":"operational","confidence":0.85,"reply":"お問い合わせありがとうございます。","reason":"一般的な問い合わせ"}\n```';

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null }); // expired化
        if (draftsCallCount === 3) return createChain({ data: null, error: null }); // 却下パターン
        return createChain({ data: { id: 43 }, error: null }); // ドラフト挿入
      }
      if (table === "message_log") {
        return createChain({
          data: [
            { direction: "incoming", content: "テストメッセージ", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    mockAnthropicCreate(aiResponse);
    // autoモードなのでpushMessageが呼ばれる
    vi.mocked(pushMessage).mockResolvedValue({ ok: true } as any);

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    // autoモード → sendAiReplyが呼ばれ、pushMessageが実行される
    expect(pushMessage).toHaveBeenCalled();
  });

  it("Claude APIレスポンス: JSONなし → エラーでリターン", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "", custom_instructions: "",
      approval_timeout_hours: 24,
    };

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        return createChain({ data: { id: 44 }, error: null });
      }
      if (table === "message_log") {
        return createChain({
          data: [
            { direction: "incoming", content: "こんにちは", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    // JSONが含まれないレスポンス
    mockAnthropicCreate("申し訳ございませんが、応答を生成できません。");

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    // ドラフト挿入は呼ばれない（Claude APIエラーでリターン）
    expect(sendApprovalFlexMessage).not.toHaveBeenCalled();
  });

  it("Claude APIでエラー → キャッチしてリターン", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "", custom_instructions: "",
      approval_timeout_hours: 24,
    };

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        return createChain({ data: { id: 45 }, error: null });
      }
      if (table === "message_log") {
        return createChain({
          data: [
            { direction: "incoming", content: "テスト", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    // Anthropicがエラーをスロー
    vi.mocked(Anthropic as any).mockImplementation(function (this: any) {
      this.messages = { create: vi.fn().mockRejectedValue(new Error("API rate limit")) };
    });

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    expect(sendApprovalFlexMessage).not.toHaveBeenCalled();
  });

  it("greetingカテゴリ → 返信スキップ（ドラフト保存されない）", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "", custom_instructions: "",
      approval_timeout_hours: 24,
    };
    const aiResponse = JSON.stringify({
      category: "greeting",
      confidence: 0.95,
      reply: null,
      reason: "挨拶メッセージ",
    });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        return createChain({ data: { id: 46 }, error: null });
      }
      if (table === "message_log") {
        return createChain({
          data: [
            { direction: "incoming", content: "ありがとうございます", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    mockAnthropicCreate(aiResponse);

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    // greetingなのでドラフト挿入もApprovalも呼ばれない
    expect(sendApprovalFlexMessage).not.toHaveBeenCalled();
    expect(pushMessage).not.toHaveBeenCalled();
  });

  it("replyがnull（カテゴリother）→ 返信スキップ", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "", custom_instructions: "",
      approval_timeout_hours: 24,
    };
    const aiResponse = JSON.stringify({
      category: "other",
      confidence: 0.5,
      reply: null,
      reason: "返信不要と判断",
    });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        return createChain({ data: { id: 47 }, error: null });
      }
      if (table === "message_log") {
        return createChain({
          data: [
            { direction: "incoming", content: "画像を送ります", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    mockAnthropicCreate(aiResponse);

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    expect(sendApprovalFlexMessage).not.toHaveBeenCalled();
  });

  it("DB保存エラー → リターン（ドラフトinsert失敗）", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "", custom_instructions: "",
      approval_timeout_hours: 24,
    };
    const aiResponse = JSON.stringify({
      category: "operational",
      confidence: 0.9,
      reply: "ご予約を承ります。",
      reason: "予約問い合わせ",
    });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        // ドラフト挿入エラー
        return createChain({ data: null, error: { message: "insert error" } });
      }
      if (table === "message_log") {
        return createChain({
          data: [
            { direction: "incoming", content: "予約したい", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    mockAnthropicCreate(aiResponse);

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    // DB保存エラーなのでApprovalもpushMessageも呼ばれない
    expect(sendApprovalFlexMessage).not.toHaveBeenCalled();
    expect(pushMessage).not.toHaveBeenCalled();
  });

  it("autoモード → sendAiReplyが呼ばれてpushMessageが実行される", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "auto",
      knowledge_base: "テストKB", custom_instructions: "",
      approval_timeout_hours: 24,
    };
    const aiResponse = JSON.stringify({
      category: "operational",
      confidence: 0.9,
      reply: "お問い合わせありがとうございます。",
      reason: "一般問い合わせ",
    });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        return createChain({ data: { id: 48 }, error: null });
      }
      if (table === "message_log") {
        return createChain({
          data: [
            { direction: "incoming", content: "営業時間は？", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    mockAnthropicCreate(aiResponse);
    vi.mocked(pushMessage).mockResolvedValue({ ok: true } as any);

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    // autoモード: pushMessage（sendAiReply経由）が呼ばれる
    expect(pushMessage).toHaveBeenCalledWith(
      "uid1",
      [{ type: "text", text: "お問い合わせありがとうございます。" }],
      undefined
    );
    // sendApprovalFlexMessageは呼ばれない
    expect(sendApprovalFlexMessage).not.toHaveBeenCalled();
  });

  it("approvalモード → sendApprovalFlexMessageが呼ばれる", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "KB", custom_instructions: "丁寧に",
      approval_timeout_hours: 12,
    };
    const aiResponse = JSON.stringify({
      category: "medical",
      confidence: 0.7,
      reply: "担当医に確認いたします。",
      reason: "医療相談",
    });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        return createChain({ data: { id: 49 }, error: null });
      }
      if (table === "message_log") {
        // descending order で返す（reverse()で昇順に戻される）
        return createChain({
          data: [
            { direction: "incoming", content: "薬の副作用が心配です", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
            { direction: "outgoing", content: "こんにちは", event_type: "message", sent_at: "2026-01-01T00:00:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    mockAnthropicCreate(aiResponse);

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    // approvalモード: sendApprovalFlexMessageが呼ばれる
    expect(sendApprovalFlexMessage).toHaveBeenCalled();
    expect(pushMessage).not.toHaveBeenCalled();
  });

  it("会話コンテキストあり（outgoing後のincoming）→ buildUserMessageにコンテキストが渡される", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "", custom_instructions: "",
      approval_timeout_hours: 24,
    };
    const aiResponse = JSON.stringify({
      category: "operational",
      confidence: 0.9,
      reply: "承知いたしました。",
      reason: "フォローアップ",
    });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        return createChain({ data: { id: 50 }, error: null });
      }
      if (table === "message_log") {
        // descending order で返す（reverse()で昇順に戻される）
        return createChain({
          data: [
            { direction: "incoming", content: "もう1つ質問があります", event_type: "message", sent_at: "2026-01-01T00:02:00Z" },
            { direction: "incoming", content: "ありがとうございます", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
            { direction: "outgoing", content: "お薬の効果について", event_type: "message", sent_at: "2026-01-01T00:00:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    const mockCreate = mockAnthropicCreate(aiResponse);

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    // Anthropic APIが呼ばれたことを確認
    expect(mockCreate).toHaveBeenCalled();
    // user messageに複数メッセージが含まれる
    const callArgs = mockCreate.mock.calls[0][0];
    const userContent = callArgs.messages[0].content;
    expect(userContent).toContain("ありがとうございます");
    expect(userContent).toContain("もう1つ質問があります");
    // コンテキストも含まれる
    expect(userContent).toContain("スタッフ");
  });

  it("複数の未返信メッセージ → 番号付きで結合される", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "", custom_instructions: "",
      approval_timeout_hours: 24,
    };
    const aiResponse = JSON.stringify({
      category: "operational",
      confidence: 0.8,
      reply: "お問い合わせ内容を確認いたします。",
      reason: "複数の質問",
    });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        return createChain({ data: { id: 51 }, error: null });
      }
      if (table === "message_log") {
        // descending order で返すので逆順（reverse()で昇順に戻される）
        return createChain({
          data: [
            { direction: "incoming", content: "質問3", event_type: "message", sent_at: "2026-01-01T00:03:00Z" },
            { direction: "incoming", content: "質問2", event_type: "message", sent_at: "2026-01-01T00:02:00Z" },
            { direction: "incoming", content: "質問1", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    const mockCreate = mockAnthropicCreate(aiResponse);

    await processPendingAiReplies();

    // 3つのメッセージが番号付きで結合される
    const callArgs = mockCreate.mock.calls[0][0];
    const userContent = callArgs.messages[0].content;
    expect(userContent).toContain("(1) 質問1");
    expect(userContent).toContain("(2) 質問2");
    expect(userContent).toContain("(3) 質問3");
  });

  it("VERCEL_PROJECT_PRODUCTION_URL環境変数あり → originが設定される", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "", custom_instructions: "",
      approval_timeout_hours: 24,
    };
    const aiResponse = JSON.stringify({
      category: "operational",
      confidence: 0.9,
      reply: "承知いたしました。",
      reason: "問い合わせ",
    });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        return createChain({ data: { id: 52 }, error: null });
      }
      if (table === "message_log") {
        return createChain({
          data: [
            { direction: "incoming", content: "テスト", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    mockAnthropicCreate(aiResponse);

    // VERCEL_PROJECT_PRODUCTION_URL を設定
    const origUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "test.vercel.app";
    try {
      await processPendingAiReplies();
      // sendApprovalFlexMessageのorigin引数を検証
      expect(sendApprovalFlexMessage).toHaveBeenCalled();
      const callArgs = vi.mocked(sendApprovalFlexMessage).mock.calls[0];
      expect(callArgs[8]).toBe("https://test.vercel.app");
    } finally {
      if (origUrl === undefined) {
        delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      } else {
        process.env.VERCEL_PROJECT_PRODUCTION_URL = origUrl;
      }
    }
  });

  it("Claudeレスポンスのcontent[0].typeがtext以外 → 空文字として扱いJSONなしエラー", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "", custom_instructions: "",
      approval_timeout_hours: 24,
    };

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        return createChain({ data: { id: 53 }, error: null });
      }
      if (table === "message_log") {
        return createChain({
          data: [
            { direction: "incoming", content: "テスト", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    // content typeがtool_useの場合
    vi.mocked(Anthropic as any).mockImplementation(function (this: any) {
      this.messages = {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "tool_use", id: "toolu_xxx", name: "test", input: {} }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      };
    });

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    // JSONなしエラーでリターン
    expect(sendApprovalFlexMessage).not.toHaveBeenCalled();
  });

  it("日次カウントがnull → 0として扱い上限チェック通過", async () => {
    setupForProcessAiReply();
    const settings = { is_enabled: true, daily_limit: 100 };

    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        // countがnull（todayCount || 0 のnullパス）
        return createChain({ data: null, error: null, count: null });
      }
      return createChain();
    });
    // APIキー未設定で早期リターン
    vi.mocked(getSettingOrEnv).mockResolvedValue("");

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
  });

  it("recentMsgsがnull → 空配列として扱われる", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "", custom_instructions: "",
      approval_timeout_hours: null, // nullの場合24がデフォルト
    };

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        return createChain({ data: { id: 54 }, error: null });
      }
      if (table === "message_log") {
        // recentMsgsがnull
        return createChain({ data: null, error: null });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    // recentMsgsがnull → 未返信メッセージなしでスキップ
  });

  it("approval_timeout_hoursがnull → デフォルト24時間", async () => {
    setupForProcessAiReply();
    const settings = {
      is_enabled: true, daily_limit: 100, mode: "approval",
      knowledge_base: "", custom_instructions: "",
      approval_timeout_hours: 0, // falsyなので24がデフォルト
    };
    const aiResponse = JSON.stringify({
      category: "operational",
      confidence: 0.9,
      reply: "承知いたしました。",
      reason: "問い合わせ",
    });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_settings") return createChain({ data: settings, error: null });
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        if (draftsCallCount === 1) return createChain({ data: null, error: null, count: 0 });
        if (draftsCallCount === 2) return createChain({ data: null, error: null });
        if (draftsCallCount === 3) return createChain({ data: null, error: null });
        return createChain({ data: { id: 55 }, error: null });
      }
      if (table === "message_log") {
        return createChain({
          data: [
            { direction: "incoming", content: "テスト", event_type: "message", sent_at: "2026-01-01T00:01:00Z" },
          ],
          error: null,
        });
      }
      return createChain();
    });
    vi.mocked(getSettingOrEnv).mockResolvedValue("sk-test-key");
    mockAnthropicCreate(aiResponse);

    const result = await processPendingAiReplies();
    expect(result).toBe(1);
    expect(sendApprovalFlexMessage).toHaveBeenCalled();
  });
});

// ============================================================
// sendAiReply
// ============================================================
describe("sendAiReply", () => {
  beforeEach(async () => {
    resetTableChains();
    vi.clearAllMocks();
    await resetFromMock(); // processAiReplyテストで上書きされた from モックをリセット
  });

  it("pushMessage成功 → ドラフトをsent更新 & message_logにinsert", async () => {
    vi.mocked(pushMessage).mockResolvedValue({ ok: true } as any);

    await sendAiReply(1, "uid1", "返信テキスト", "p1", null);

    expect(pushMessage).toHaveBeenCalledWith(
      "uid1",
      [{ type: "text", text: "返信テキスト" }],
      undefined
    );
    // ドラフト更新
    expect(tableChains.ai_reply_drafts.update).toHaveBeenCalled();
    const updateArgs = tableChains.ai_reply_drafts.update.mock.calls[0][0];
    expect(updateArgs.status).toBe("sent");
    // message_log挿入
    expect(tableChains.message_log.insert).toHaveBeenCalled();
    const insertArgs = tableChains.message_log.insert.mock.calls[0][0];
    expect(insertArgs.event_type).toBe("ai_reply");
    expect(insertArgs.content).toBe("返信テキスト");
  });

  it("pushMessage失敗（ok=false）→ ドラフトをpendingに戻し、message_logにinsertしない", async () => {
    vi.mocked(pushMessage).mockResolvedValue({ ok: false } as any);

    await sendAiReply(2, "uid1", "テスト", "p1", null);

    const updateArgs = tableChains.ai_reply_drafts.update.mock.calls[0][0];
    expect(updateArgs.status).toBe("pending");
    expect(updateArgs.sent_at).toBeNull();
    expect(tableChains.message_log.insert).not.toHaveBeenCalled();
  });

  it("pushMessage戻り値がnull（res?.ok → false）→ pending", async () => {
    vi.mocked(pushMessage).mockResolvedValue(null as any);

    await sendAiReply(3, "uid1", "テスト", "p1", null);

    const updateArgs = tableChains.ai_reply_drafts.update.mock.calls[0][0];
    expect(updateArgs.status).toBe("pending");
  });

  it("tenantIdあり → pushMessageにtenantIdが渡る", async () => {
    vi.mocked(pushMessage).mockResolvedValue({ ok: true } as any);

    await sendAiReply(1, "uid1", "返信", "p1", "tenant1");

    expect(pushMessage).toHaveBeenCalledWith(
      "uid1",
      [{ type: "text", text: "返信" }],
      "tenant1"
    );
  });
});

// ============================================================
// handleImplicitAiFeedback
// ============================================================
describe("handleImplicitAiFeedback", () => {
  beforeEach(async () => {
    resetTableChains();
    vi.clearAllMocks();
    await resetFromMock(); // processAiReplyテストで上書きされた from モックをリセット
  });

  it("pendingドラフトなし → 何もしない", async () => {
    // ai_reply_drafts select → 空
    tableChains.ai_reply_drafts.then.mockImplementation((r: any) =>
      r({ data: [], error: null })
    );

    await handleImplicitAiFeedback("p1", "手動返信", null);

    // update は呼ばれない
    expect(tableChains.ai_reply_drafts.update).not.toHaveBeenCalled();
  });

  it("pendingドラフトがnull → 何もしない", async () => {
    tableChains.ai_reply_drafts.then.mockImplementation((r: any) =>
      r({ data: null, error: null })
    );

    await handleImplicitAiFeedback("p1", "手動返信", null);
    expect(tableChains.ai_reply_drafts.update).not.toHaveBeenCalled();
  });

  it("pendingドラフトあり → expired更新+ナレッジ追記", async () => {
    // 1回目: ai_reply_drafts select (pending)
    // 2回目: ai_reply_drafts update (expired)
    // 3回目: ai_reply_settings select
    // 4回目: ai_reply_settings update

    const pendingDrafts = [
      { id: 10, original_message: "元メッセージ", draft_reply: "AI返信" },
    ];

    // テーブルごとのチェーンを最初から設定し直す
    const draftsSelectChain = createChain({ data: pendingDrafts, error: null });
    const draftsUpdateChain = createChain({ data: null, error: null });
    const settingsSelectChain = createChain({
      data: { id: 1, knowledge_base: "既存KB" },
      error: null,
    });
    const settingsUpdateChain = createChain({ data: null, error: null });

    let draftsCallCount = 0;
    let settingsCallCount = 0;

    // supabaseAdmin.from のモック: テーブル名+呼び出し回数で振り分け
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        // 1回目=select, 2回目=update
        return draftsCallCount === 1 ? draftsSelectChain : draftsUpdateChain;
      }
      if (table === "ai_reply_settings") {
        settingsCallCount++;
        return settingsCallCount === 1 ? settingsSelectChain : settingsUpdateChain;
      }
      return createChain();
    });

    await handleImplicitAiFeedback("p1", "スタッフ返信テスト", null);

    // ドラフトが expired に更新された
    expect(draftsUpdateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "expired",
        reject_category: "other",
        reject_reason: "スタッフが手動返信（暗黙の却下）",
      })
    );

    // ナレッジベースが更新された
    expect(settingsUpdateChain.update).toHaveBeenCalled();
    const kbUpdateArgs = settingsUpdateChain.update.mock.calls[0][0];
    expect(kbUpdateArgs.knowledge_base).toContain("既存KB");
    expect(kbUpdateArgs.knowledge_base).toContain("スタッフ手動返信例");
    expect(kbUpdateArgs.knowledge_base).toContain("元メッセージ");
    expect(kbUpdateArgs.knowledge_base).toContain("スタッフ返信テスト");
  });

  it("AI返信設定が存在しない → ナレッジ追記スキップ（エラーなし）", async () => {
    const pendingDrafts = [
      { id: 10, original_message: "テスト", draft_reply: "AI返信" },
    ];
    const draftsSelectChain = createChain({ data: pendingDrafts, error: null });
    const draftsUpdateChain = createChain({ data: null, error: null });
    const settingsChain = createChain({ data: null, error: null });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        return draftsCallCount === 1 ? draftsSelectChain : draftsUpdateChain;
      }
      if (table === "ai_reply_settings") return settingsChain;
      return createChain();
    });

    await handleImplicitAiFeedback("p1", "返信", null);

    // expired更新は実行される
    expect(draftsUpdateChain.update).toHaveBeenCalled();
    // ナレッジ更新は実行されない（settingsがnull）
    expect(settingsChain.update).not.toHaveBeenCalled();
  });

  it("エラー発生 → fire-and-forget（例外がスローされない）", async () => {
    // fromが例外をスロー
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation(() => {
      throw new Error("DB error");
    });

    // エラーがスローされないことを確認
    await expect(
      handleImplicitAiFeedback("p1", "返信", null)
    ).resolves.toBeUndefined();
  });

  it("複数のpendingドラフト → 全件がexpired更新対象", async () => {
    const pendingDrafts = [
      { id: 10, original_message: "msg1", draft_reply: "reply1" },
      { id: 11, original_message: "msg2", draft_reply: "reply2" },
      { id: 12, original_message: "msg3", draft_reply: "reply3" },
    ];
    const draftsSelectChain = createChain({ data: pendingDrafts, error: null });
    const draftsUpdateChain = createChain({ data: null, error: null });
    const settingsChain = createChain({
      data: { id: 1, knowledge_base: "" },
      error: null,
    });
    const settingsUpdateChain = createChain({ data: null, error: null });

    let draftsCallCount = 0;
    let settingsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        return draftsCallCount === 1 ? draftsSelectChain : draftsUpdateChain;
      }
      if (table === "ai_reply_settings") {
        settingsCallCount++;
        return settingsCallCount === 1 ? settingsChain : settingsUpdateChain;
      }
      return createChain();
    });

    await handleImplicitAiFeedback("p1", "手動返信", null);

    // in() に3件のIDが渡される
    expect(draftsUpdateChain.in).toHaveBeenCalledWith("id", [10, 11, 12]);
  });

  it("staffReplyが空文字 → ナレッジ追記スキップ", async () => {
    const pendingDrafts = [
      { id: 10, original_message: "テスト", draft_reply: "AI返信" },
    ];
    const draftsSelectChain = createChain({ data: pendingDrafts, error: null });
    const draftsUpdateChain = createChain({ data: null, error: null });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        return draftsCallCount === 1 ? draftsSelectChain : draftsUpdateChain;
      }
      return createChain();
    });

    // staffReplyが空文字 → latestDraft?.original_message && staffReply が false
    await handleImplicitAiFeedback("p1", "", null);

    // expired更新は実行される
    expect(draftsUpdateChain.update).toHaveBeenCalled();
    // ai_reply_settings テーブルにはアクセスされない（ナレッジ追記スキップ）
  });

  it("latestDraft.original_messageがnull → ナレッジ追記スキップ", async () => {
    const pendingDrafts = [
      { id: 10, original_message: null, draft_reply: "AI返信" },
    ];
    const draftsSelectChain = createChain({ data: pendingDrafts, error: null });
    const draftsUpdateChain = createChain({ data: null, error: null });

    let draftsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        return draftsCallCount === 1 ? draftsSelectChain : draftsUpdateChain;
      }
      return createChain();
    });

    await handleImplicitAiFeedback("p1", "手動返信テスト", null);

    // expired更新は実行される
    expect(draftsUpdateChain.update).toHaveBeenCalled();
  });

  it("既存ナレッジベースが空文字 → 空文字+追記で保存", async () => {
    const pendingDrafts = [
      { id: 10, original_message: "質問テスト", draft_reply: "AI返信テスト" },
    ];
    const draftsSelectChain = createChain({ data: pendingDrafts, error: null });
    const draftsUpdateChain = createChain({ data: null, error: null });
    const settingsSelectChain = createChain({
      data: { id: 1, knowledge_base: null },
      error: null,
    });
    const settingsUpdateChain = createChain({ data: null, error: null });

    let draftsCallCount = 0;
    let settingsCallCount = 0;
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "ai_reply_drafts") {
        draftsCallCount++;
        return draftsCallCount === 1 ? draftsSelectChain : draftsUpdateChain;
      }
      if (table === "ai_reply_settings") {
        settingsCallCount++;
        return settingsCallCount === 1 ? settingsSelectChain : settingsUpdateChain;
      }
      return createChain();
    });

    await handleImplicitAiFeedback("p1", "スタッフの返信", null);

    // ナレッジベース更新が呼ばれた
    expect(settingsUpdateChain.update).toHaveBeenCalled();
    const kbUpdateArgs = settingsUpdateChain.update.mock.calls[0][0];
    expect(kbUpdateArgs.knowledge_base).toContain("スタッフ手動返信例");
    expect(kbUpdateArgs.knowledge_base).toContain("質問テスト");
  });
});

// ============================================================
// determineFlowStage（純粋関数テスト）
// ============================================================
describe("determineFlowStage", () => {
  const base: Omit<PatientFlowStatus, "flowStage"> = {
    hasRegisteredPersonalInfo: false,
    hasVerifiedPhone: false,
    hasCompletedQuestionnaire: false,
    intakeStatus: null,
    hasReservation: false,
    nextReservation: null,
    latestOrder: null,
    activeReorder: null,
  };

  it("全て未完了 → 友だち追加直後・個人情報未登録", () => {
    expect(determineFlowStage(base)).toBe("友だち追加直後・個人情報未登録");
  });

  it("個人情報登録済み・電話番号未認証 → 個人情報登録済み・電話番号認証待ち", () => {
    expect(determineFlowStage({ ...base, hasRegisteredPersonalInfo: true })).toBe("個人情報登録済み・電話番号認証待ち");
  });

  it("電話番号認証済み・問診未完了 → 問診未完了", () => {
    expect(determineFlowStage({ ...base, hasRegisteredPersonalInfo: true, hasVerifiedPhone: true })).toBe("問診未完了");
  });

  it("問診完了・予約なし → 問診完了・予約待ち", () => {
    expect(determineFlowStage({
      ...base, hasRegisteredPersonalInfo: true, hasVerifiedPhone: true, hasCompletedQuestionnaire: true,
    })).toBe("問診完了・予約待ち");
  });

  it("予約済み・診察前 → 予約済み・診察待ち", () => {
    expect(determineFlowStage({
      ...base, hasRegisteredPersonalInfo: true, hasVerifiedPhone: true, hasCompletedQuestionnaire: true,
      hasReservation: true, nextReservation: { date: "2026-03-01", time: "10:00" },
    })).toBe("予約済み・診察待ち");
  });

  it("診察完了(OK) → 診察完了・決済待ち", () => {
    expect(determineFlowStage({
      ...base, hasRegisteredPersonalInfo: true, hasVerifiedPhone: true, hasCompletedQuestionnaire: true,
      intakeStatus: "OK",
    })).toBe("診察完了・決済待ち");
  });

  it("診察完了(NG) → 診察完了・処方不可", () => {
    expect(determineFlowStage({
      ...base, hasRegisteredPersonalInfo: true, hasVerifiedPhone: true, hasCompletedQuestionnaire: true,
      intakeStatus: "NG",
    })).toBe("診察完了・処方不可");
  });

  it("決済済み・発送前 → 決済済み・発送待ち", () => {
    expect(determineFlowStage({
      ...base, latestOrder: { paymentStatus: "paid", shippingStatus: "pending", paymentMethod: "credit_card" },
    })).toBe("決済済み・発送待ち");
  });

  it("発送準備中 → 発送準備中", () => {
    expect(determineFlowStage({
      ...base, latestOrder: { paymentStatus: "paid", shippingStatus: "preparing", paymentMethod: "credit_card" },
    })).toBe("発送準備中");
  });

  it("発送済み・再処方なし → 発送済み・再処方可能", () => {
    expect(determineFlowStage({
      ...base, latestOrder: { paymentStatus: "paid", shippingStatus: "shipped", paymentMethod: "credit_card" },
    })).toBe("発送済み・再処方可能");
  });

  it("発送済み・再処方pending → 再処方申請中", () => {
    expect(determineFlowStage({
      ...base,
      latestOrder: { paymentStatus: "paid", shippingStatus: "shipped", paymentMethod: "credit_card" },
      activeReorder: { status: "pending" },
    })).toBe("再処方申請中");
  });

  it("発送済み・再処方confirmed → 再処方承認済み・決済待ち", () => {
    expect(determineFlowStage({
      ...base,
      latestOrder: { paymentStatus: "paid", shippingStatus: "delivered", paymentMethod: "bank_transfer" },
      activeReorder: { status: "confirmed" },
    })).toBe("再処方承認済み・決済待ち");
  });
});

// ============================================================
// buildUserMessage（患者ステータス含む）
// ============================================================
describe("buildUserMessage", () => {
  it("ステータスなし → 従来通りの出力", () => {
    const result = buildUserMessage(["こんにちは"], []);
    expect(result).toContain("患者からの新しいメッセージ");
    expect(result).toContain("こんにちは");
    expect(result).not.toContain("この患者の現在のステータス");
  });

  it("ステータスあり → ステータスセクションが先頭に含まれる", () => {
    const status: PatientFlowStatus = {
      hasRegisteredPersonalInfo: true,
      hasVerifiedPhone: true,
      hasCompletedQuestionnaire: true,
      intakeStatus: "OK",
      hasReservation: false,
      nextReservation: null,
      latestOrder: null,
      activeReorder: null,
      flowStage: "診察完了・決済待ち",
    };
    const result = buildUserMessage(["決済方法を教えてください"], [], status);
    expect(result).toContain("この患者の現在のステータス");
    expect(result).toContain("診察完了・決済待ち");
    expect(result).toContain("決済方法を教えてください");
  });

  it("予約情報あり → 予約日時が含まれる", () => {
    const status: PatientFlowStatus = {
      hasRegisteredPersonalInfo: true,
      hasVerifiedPhone: true,
      hasCompletedQuestionnaire: true,
      intakeStatus: null,
      hasReservation: true,
      nextReservation: { date: "2026-03-01", time: "14:00" },
      latestOrder: null,
      activeReorder: null,
      flowStage: "予約済み・診察待ち",
    };
    const result = buildUserMessage(["テスト"], [], status);
    expect(result).toContain("次回予約: 2026-03-01 14:00");
  });

  it("注文情報あり → 決済・発送ステータスが含まれる", () => {
    const status: PatientFlowStatus = {
      hasRegisteredPersonalInfo: true,
      hasVerifiedPhone: true,
      hasCompletedQuestionnaire: true,
      intakeStatus: "OK",
      hasReservation: false,
      nextReservation: null,
      latestOrder: { paymentStatus: "paid", shippingStatus: "shipped", paymentMethod: "credit_card" },
      activeReorder: null,
      flowStage: "発送済み・再処方可能",
    };
    const result = buildUserMessage(["テスト"], [], status);
    expect(result).toContain("最新注文: 決済=paid, 発送=shipped");
  });

  it("再処方情報あり → 再処方ステータスが含まれる", () => {
    const status: PatientFlowStatus = {
      hasRegisteredPersonalInfo: true,
      hasVerifiedPhone: true,
      hasCompletedQuestionnaire: true,
      intakeStatus: "OK",
      hasReservation: false,
      nextReservation: null,
      latestOrder: { paymentStatus: "paid", shippingStatus: "shipped", paymentMethod: "credit_card" },
      activeReorder: { status: "pending" },
      flowStage: "再処方申請中",
    };
    const result = buildUserMessage(["テスト"], [], status);
    expect(result).toContain("再処方: pending");
  });

  it("flowStageが不明 → ステータスセクション非表示", () => {
    const status: PatientFlowStatus = {
      hasRegisteredPersonalInfo: false,
      hasVerifiedPhone: false,
      hasCompletedQuestionnaire: false,
      intakeStatus: null,
      hasReservation: false,
      nextReservation: null,
      latestOrder: null,
      activeReorder: null,
      flowStage: "不明",
    };
    const result = buildUserMessage(["テスト"], [], status);
    expect(result).not.toContain("この患者の現在のステータス");
  });
});

// ============================================================
// buildSystemPrompt（ステータスガイドライン追加確認）
// ============================================================
describe("buildSystemPrompt - ステータスガイドライン", () => {
  it("患者ステータスに基づく対応セクションが含まれる", () => {
    const result = buildSystemPrompt("KB", "指示");
    expect(result).toContain("患者ステータスに基づく対応");
    expect(result).toContain("友だち追加直後・個人情報未登録");
    expect(result).toContain("問診未完了");
    expect(result).toContain("診察完了・決済待ち");
    expect(result).toContain("一般的な質問をした場合は、フローステージに関係なく");
  });
});

// ============================================================
// fetchPatientFlowStatus
// ============================================================
describe("fetchPatientFlowStatus", () => {
  beforeEach(async () => {
    resetTableChains();
    vi.clearAllMocks();
    await resetFromMock();
  });

  it("全データなし → 友だち追加直後", async () => {
    const result = await fetchPatientFlowStatus("p1", null);
    expect(result.flowStage).toBe("友だち追加直後・個人情報未登録");
    expect(result.hasRegisteredPersonalInfo).toBe(false);
    expect(result.hasVerifiedPhone).toBe(false);
    expect(result.hasCompletedQuestionnaire).toBe(false);
  });

  it("患者名あり・電話番号なし → 個人情報登録済み・電話番号認証待ち", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "patients") return createChain({ data: { name: "田中太郎", tel: null }, error: null });
      return createChain();
    });

    const result = await fetchPatientFlowStatus("p1", null);
    expect(result.flowStage).toBe("個人情報登録済み・電話番号認証待ち");
    expect(result.hasRegisteredPersonalInfo).toBe(true);
    expect(result.hasVerifiedPhone).toBe(false);
  });

  it("患者名・電話番号あり・問診未完了 → 問診未完了", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "patients") return createChain({ data: { name: "田中太郎", tel: "09012345678" }, error: null });
      return createChain();
    });

    const result = await fetchPatientFlowStatus("p1", null);
    expect(result.flowStage).toBe("問診未完了");
  });

  it("問診完了 → 問診完了・予約待ち", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "patients") return createChain({ data: { name: "田中太郎", tel: "09012345678" }, error: null });
      if (table === "intake") return createChain({ data: { status: null, answers: { ng_check: "ok" } }, error: null });
      return createChain();
    });

    const result = await fetchPatientFlowStatus("p1", null);
    expect(result.flowStage).toBe("問診完了・予約待ち");
    expect(result.hasCompletedQuestionnaire).toBe(true);
  });

  it("診察完了(OK) → 診察完了・決済待ち", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === "patients") return createChain({ data: { name: "田中太郎", tel: "09012345678" }, error: null });
      if (table === "intake") return createChain({ data: { status: "OK", answers: { ng_check: "ok" } }, error: null });
      return createChain();
    });

    const result = await fetchPatientFlowStatus("p1", null);
    expect(result.flowStage).toBe("診察完了・決済待ち");
    expect(result.intakeStatus).toBe("OK");
  });

  it("DB取得エラー → フォールバック（flowStage=不明）", async () => {
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation(() => {
      throw new Error("DB接続エラー");
    });

    const result = await fetchPatientFlowStatus("p1", null);
    expect(result.flowStage).toBe("不明");
    expect(result.hasCompletedQuestionnaire).toBe(false);
  });
});

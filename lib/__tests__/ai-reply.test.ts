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
  scheduleAiReply,
  processPendingAiReplies,
  sendAiReply,
  handleImplicitAiFeedback,
  lastProcessLog,
  type RejectedDraftEntry,
} from "@/lib/ai-reply";
import { redis } from "@/lib/redis";
import { pushMessage } from "@/lib/line-push";
import { shouldProcessWithAI } from "@/lib/ai-reply-filter";
import { getSettingOrEnv } from "@/lib/settings";

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

  it("デバウンス期間未経過（60秒未満）→ スキップ", async () => {
    vi.mocked(redis.smembers).mockResolvedValue(["p1"]);
    const entry = {
      lineUid: "uid1",
      patientId: "p1",
      patientName: "田中",
      tenantId: null,
      ts: Date.now() - 30000, // 30秒前（60秒未満）
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
});

// ============================================================
// sendAiReply
// ============================================================
describe("sendAiReply", () => {
  beforeEach(() => {
    resetTableChains();
    vi.clearAllMocks();
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
  beforeEach(() => {
    resetTableChains();
    vi.clearAllMocks();
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
});

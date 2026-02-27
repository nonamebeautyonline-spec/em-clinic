// __tests__/api/ai-reply-send.test.ts
// AI返信ドラフト送信API（/api/ai-reply/[draftId]/send）のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdateEq = vi.fn().mockReturnValue({ data: null, error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      update: mockUpdate,
    })),
  },
}));

vi.mock("@/lib/ai-reply-sign", () => ({
  verifyDraftSignature: vi.fn(),
}));

vi.mock("@/lib/ai-reply", () => ({
  sendAiReply: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query) => query),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue(""),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/ai-reply", () => ({
  aiReplySendSchema: {},
}));

// global fetch モック
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

// テスト用ドラフトデータ
const baseDraft = {
  id: 123,
  line_uid: "U1234567890",
  draft_reply: "テスト返信です",
  patient_id: "patient-001",
  tenant_id: "tenant-001",
  status: "pending",
  original_message: "元のメッセージ",
};

describe("AI Reply Send API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("draftIdが非数値の場合は400を返す", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    vi.mocked(parseBody).mockResolvedValue({ data: { sig: "s", exp: 9999999999 } } as any);

    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = { json: vi.fn() } as any;

    const res = await POST(req, { params: Promise.resolve({ draftId: "abc" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("無効なID");
  });

  it("parseBody失敗時はエラーレスポンスを返す", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    const mockErrorResponse = { json: async () => ({ error: "バリデーションエラー" }), status: 422 };
    vi.mocked(parseBody).mockResolvedValue({ error: mockErrorResponse } as any);

    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = { json: vi.fn() } as any;

    const res = await POST(req, { params: Promise.resolve({ draftId: "123" }) });
    expect(res).toBe(mockErrorResponse);
  });

  it("署名無効の場合は403を返す", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    vi.mocked(parseBody).mockResolvedValue({ data: { sig: "invalid-sig", exp: 9999999999 } } as any);

    const { verifyDraftSignature } = await import("@/lib/ai-reply-sign");
    vi.mocked(verifyDraftSignature).mockReturnValue(false);

    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = { json: vi.fn() } as any;

    const res = await POST(req, { params: Promise.resolve({ draftId: "123" }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("署名が無効");
  });

  it("ドラフトが見つからない場合は404を返す", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    vi.mocked(parseBody).mockResolvedValue({ data: { sig: "valid-sig", exp: 9999999999 } } as any);

    const { verifyDraftSignature } = await import("@/lib/ai-reply-sign");
    vi.mocked(verifyDraftSignature).mockReturnValue(true);

    mockSingle.mockReturnValue({ data: null, error: { message: "not found" } });

    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = { json: vi.fn() } as any;

    const res = await POST(req, { params: Promise.resolve({ draftId: "123" }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("ドラフトが見つかりません");
  });

  it("ドラフトstatusがpending以外の場合は400を返す", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    vi.mocked(parseBody).mockResolvedValue({ data: { sig: "valid-sig", exp: 9999999999 } } as any);

    const { verifyDraftSignature } = await import("@/lib/ai-reply-sign");
    vi.mocked(verifyDraftSignature).mockReturnValue(true);

    mockSingle.mockReturnValue({ data: { ...baseDraft, status: "sent" }, error: null });

    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = { json: vi.fn() } as any;

    const res = await POST(req, { params: Promise.resolve({ draftId: "123" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("既に処理済み");
  });

  it("正常系ではsendAiReplyが呼ばれて200を返す", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    vi.mocked(parseBody).mockResolvedValue({ data: { sig: "valid-sig", exp: 9999999999 } } as any);

    const { verifyDraftSignature } = await import("@/lib/ai-reply-sign");
    vi.mocked(verifyDraftSignature).mockReturnValue(true);

    const { sendAiReply } = await import("@/lib/ai-reply");
    vi.mocked(sendAiReply).mockResolvedValue(undefined as any);

    // 1回目: ドラフト取得（pending）、2回目: 送信後ステータス確認（sent）
    mockSingle
      .mockReturnValueOnce({ data: { ...baseDraft }, error: null })
      .mockReturnValueOnce({ data: { status: "sent" }, error: null });

    mockMaybeSingle.mockReturnValue({ data: null, error: null });

    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = { json: vi.fn() } as any;

    const res = await POST(req, { params: Promise.resolve({ draftId: "123" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(sendAiReply).toHaveBeenCalled();
  });

  it("正常系でstatus=sentの場合modified_replyが更新される", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    vi.mocked(parseBody).mockResolvedValue({ data: { sig: "valid-sig", exp: 9999999999 } } as any);

    const { verifyDraftSignature } = await import("@/lib/ai-reply-sign");
    vi.mocked(verifyDraftSignature).mockReturnValue(true);

    const { sendAiReply } = await import("@/lib/ai-reply");
    vi.mocked(sendAiReply).mockResolvedValue(undefined as any);

    // 1回目: ドラフト取得、2回目: 送信後ステータス確認
    mockSingle
      .mockReturnValueOnce({ data: { ...baseDraft }, error: null })
      .mockReturnValueOnce({ data: { status: "sent" }, error: null });

    mockMaybeSingle.mockReturnValue({ data: { id: "settings-1", knowledge_base: "既存KB" }, error: null });

    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = { json: vi.fn() } as any;

    const res = await POST(req, { params: Promise.resolve({ draftId: "123" }) });
    expect(res.status).toBe(200);
    // update が呼ばれていること（modified_reply保存 + ナレッジ更新）
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("ナレッジ追記エラーでも200を返す", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    vi.mocked(parseBody).mockResolvedValue({ data: { sig: "valid-sig", exp: 9999999999 } } as any);

    const { verifyDraftSignature } = await import("@/lib/ai-reply-sign");
    vi.mocked(verifyDraftSignature).mockReturnValue(true);

    const { sendAiReply } = await import("@/lib/ai-reply");
    vi.mocked(sendAiReply).mockResolvedValue(undefined as any);

    mockSingle
      .mockReturnValueOnce({ data: { ...baseDraft }, error: null })
      .mockReturnValueOnce({ data: { status: "sent" }, error: null });

    // maybeSingleでエラーを投げる
    mockMaybeSingle.mockImplementation(() => { throw new Error("KB error"); });

    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = { json: vi.fn() } as any;

    const res = await POST(req, { params: Promise.resolve({ draftId: "123" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("管理通知エラーでも200を返す", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    vi.mocked(parseBody).mockResolvedValue({ data: { sig: "valid-sig", exp: 9999999999 } } as any);

    const { verifyDraftSignature } = await import("@/lib/ai-reply-sign");
    vi.mocked(verifyDraftSignature).mockReturnValue(true);

    const { sendAiReply } = await import("@/lib/ai-reply");
    vi.mocked(sendAiReply).mockResolvedValue(undefined as any);

    const { getSettingOrEnv } = await import("@/lib/settings");
    vi.mocked(getSettingOrEnv).mockResolvedValue("some-token");

    mockSingle
      .mockReturnValueOnce({ data: { ...baseDraft }, error: null })
      .mockReturnValueOnce({ data: { status: "sent" }, error: null });

    mockMaybeSingle.mockReturnValue({ data: null, error: null });

    // fetch（管理通知）が失敗
    mockFetch.mockRejectedValue(new Error("LINE API error"));

    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = { json: vi.fn() } as any;

    const res = await POST(req, { params: Promise.resolve({ draftId: "123" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("sendAiReplyが正しい引数で呼ばれる", async () => {
    const { parseBody } = await import("@/lib/validations/helpers");
    vi.mocked(parseBody).mockResolvedValue({ data: { sig: "valid-sig", exp: 9999999999 } } as any);

    const { verifyDraftSignature } = await import("@/lib/ai-reply-sign");
    vi.mocked(verifyDraftSignature).mockReturnValue(true);

    const { sendAiReply } = await import("@/lib/ai-reply");
    vi.mocked(sendAiReply).mockResolvedValue(undefined as any);

    const draft = { ...baseDraft };
    mockSingle
      .mockReturnValueOnce({ data: draft, error: null })
      .mockReturnValueOnce({ data: { status: "pending" }, error: null }); // sent以外→modified_reply処理スキップ

    const { POST } = await import("@/app/api/ai-reply/[draftId]/send/route");
    const req = { json: vi.fn() } as any;

    const res = await POST(req, { params: Promise.resolve({ draftId: "123" }) });
    expect(res.status).toBe(200);
    expect(sendAiReply).toHaveBeenCalledWith(
      123,
      draft.line_uid,
      draft.draft_reply,
      draft.patient_id,
      draft.tenant_id,
    );
  });
});

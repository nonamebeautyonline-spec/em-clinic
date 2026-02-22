// 音声認識API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- 共有モックインスタンス ---
const mockTranscribeFile = vi.fn();
const mockGroqCreate = vi.fn();
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
const mockSupabaseSelect = vi.fn();

vi.mock("@deepgram/sdk", () => ({
  createClient: vi.fn(() => ({
    listen: {
      prerecorded: {
        transcribeFile: mockTranscribeFile,
      },
    },
  })),
}));

vi.mock("groq-sdk", () => ({
  default: vi.fn(function GroqMock() {
    return {
      audio: {
        transcriptions: {
          create: mockGroqCreate,
        },
      },
    };
  }),
}));

// Supabase モック
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: mockSupabaseSelect(),
          error: null,
        })),
      })),
    })),
  },
}));

// Redis モック
vi.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
    del: (...args: unknown[]) => mockRedisDel(...args),
  },
}));

// tenant モック
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((_query: unknown) => {
    // withTenant は query をそのまま返す（テナントフィルタ追加のシミュレーション）
    return {
      data: mockSupabaseSelect(),
      error: null,
    };
  }),
  tenantPayload: vi.fn((tenantId: string) => ({ tenant_id: tenantId })),
}));

// medical-refine モック（デフォルトは補正なし）
vi.mock("@/lib/voice/medical-refine", () => ({
  refineMedicalText: vi.fn(() => ({
    refined: "",
    corrections: [],
    was_modified: false,
  })),
}));

// 環境変数
const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  mockTranscribeFile.mockReset();
  mockGroqCreate.mockReset();
  mockRedisGet.mockReset();
  mockRedisSet.mockReset();
  mockRedisDel.mockReset();
  mockSupabaseSelect.mockReset();
  // デフォルト: Redis キャッシュなし、DB も空（フォールバックキーワード使用）
  mockRedisGet.mockResolvedValue(null);
  mockRedisSet.mockResolvedValue("OK");
  mockSupabaseSelect.mockReturnValue([]);
  process.env = {
    ...originalEnv,
    DEEPGRAM_API_KEY: "test-deepgram-key",
    GROQ_API_KEY: "test-groq-key",
  };
});

// テスト用の音声 File を生成
function createAudioFile(sizeBytes = 1000): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], "test.webm", { type: "audio/webm" });
}

// FormData を使った POST リクエストを生成
function createRequest(file?: File): Request {
  const formData = new FormData();
  if (file) {
    formData.append("audio", file);
  }
  return new Request("http://localhost/api/voice/transcribe", {
    method: "POST",
    body: formData,
  });
}

// Deepgram 成功レスポンスのヘルパー
function deepgramSuccess(transcript: string, confidence: number) {
  return {
    result: {
      results: {
        channels: [{
          alternatives: [{ transcript, confidence }],
        }],
      },
    },
  };
}

describe("POST /api/voice/transcribe", () => {
  it("音声ファイルがない場合は400を返す", async () => {
    const { POST } = await import("@/app/api/voice/transcribe/route");
    const req = createRequest(); // ファイルなし
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain("音声ファイル");
  });

  it("ファイルサイズが上限を超えた場合は400を返す", async () => {
    const { POST } = await import("@/app/api/voice/transcribe/route");
    const bigFile = createAudioFile(5 * 1024 * 1024); // 5MB
    const req = createRequest(bigFile);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("4MB");
  });

  it("Deepgramで正常に文字起こしできる", async () => {
    mockTranscribeFile.mockResolvedValue(
      deepgramSuccess("マンジャロ2.5mgを処方します", 0.95)
    );

    const { POST } = await import("@/app/api/voice/transcribe/route");
    const req = createRequest(createAudioFile());
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.transcript).toBe("マンジャロ2.5mgを処方します");
    expect(body.confidence).toBe(0.95);
    expect(body.model_used).toBe("deepgram-nova-3");
  });

  it("Deepgramの精度が低い場合はGroqにフォールバック", async () => {
    mockTranscribeFile.mockResolvedValue(
      deepgramSuccess("まんじゃろを処方", 0.5) // 閾値0.7未満
    );
    mockGroqCreate.mockResolvedValue({
      text: "マンジャロを処方します",
      segments: [{ avg_logprob: -0.1 }],
    });

    const { POST } = await import("@/app/api/voice/transcribe/route");
    const req = createRequest(createAudioFile());
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.transcript).toBe("マンジャロを処方します");
    expect(body.model_used).toBe("groq-whisper-turbo");
  });

  it("Deepgramが失敗した場合はGroqでリトライ", async () => {
    mockTranscribeFile.mockRejectedValue(new Error("Deepgram API error"));
    mockGroqCreate.mockResolvedValue({
      text: "フィナステリド1mgを継続",
      segments: [{ avg_logprob: -0.15 }],
    });

    const { POST } = await import("@/app/api/voice/transcribe/route");
    const req = createRequest(createAudioFile());
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.transcript).toBe("フィナステリド1mgを継続");
    expect(body.model_used).toBe("groq-whisper-turbo");
  });

  it("両方失敗した場合は500を返す", async () => {
    process.env.GROQ_API_KEY = "";
    mockTranscribeFile.mockRejectedValue(new Error("Deepgram down"));

    const { POST } = await import("@/app/api/voice/transcribe/route");
    const req = createRequest(createAudioFile());
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });

  it("空の認識結果の場合は422を返す", async () => {
    mockTranscribeFile.mockResolvedValue(
      deepgramSuccess("", 0.9)
    );

    const { POST } = await import("@/app/api/voice/transcribe/route");
    const req = createRequest(createAudioFile());
    const res = await POST(req as any);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain("認識できません");
  });

  it("Redis キャッシュがある場合はDBをスキップする", async () => {
    const cachedKeywords = ["マンジャロ:2", "フィナステリド:2"];
    mockRedisGet.mockResolvedValue(cachedKeywords);
    mockTranscribeFile.mockResolvedValue(
      deepgramSuccess("マンジャロ処方", 0.95)
    );

    const { POST } = await import("@/app/api/voice/transcribe/route");
    const req = createRequest(createAudioFile());
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    // Redis GET が呼ばれていることを確認
    expect(mockRedisGet).toHaveBeenCalled();
  });

  it("DB に辞書データがある場合はそれを使用する", async () => {
    mockRedisGet.mockResolvedValue(null); // キャッシュなし
    mockSupabaseSelect.mockReturnValue([
      { term: "チルゼパチド", boost_weight: 2.0 },
      { term: "セマグルチド", boost_weight: 2.0 },
    ]);
    mockTranscribeFile.mockResolvedValue(
      deepgramSuccess("チルゼパチドを処方", 0.95)
    );

    const { POST } = await import("@/app/api/voice/transcribe/route");
    const req = createRequest(createAudioFile());
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    // Redis SET でキャッシュされたことを確認
    expect(mockRedisSet).toHaveBeenCalled();
  });
});

describe("VOICE_LIMITS", () => {
  it("定数が正しく設定されている", async () => {
    const { VOICE_LIMITS } = await import("@/lib/validations/voice");
    expect(VOICE_LIMITS.MAX_FILE_SIZE).toBe(4 * 1024 * 1024);
    expect(VOICE_LIMITS.MAX_DURATION_SEC).toBe(300);
    expect(VOICE_LIMITS.FALLBACK_CONFIDENCE_THRESHOLD).toBe(0.7);
    expect(VOICE_LIMITS.ALLOWED_MIME_TYPES).toContain("audio/webm");
  });
});

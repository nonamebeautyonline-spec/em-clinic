// lib/__tests__/ai-patient-memory.test.ts — 患者メモリ管理テスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---

// from()呼び出しごとに独立したクエリビルダーを返す
// テスト側でfromCallsを参照して各呼び出しの挙動を制御可能
const fromCalls: Array<Record<string, ReturnType<typeof vi.fn>>> = [];

function createChainableBuilder(resolveValue: unknown = { error: null }) {
  const builder: Record<string, any> = {};
  const methods = ["select", "eq", "update", "order", "limit"];
  for (const m of methods) {
    builder[m] = vi.fn().mockImplementation(() => builder);
  }
  // insertはawaitされるので直接結果を返す
  builder.insert = vi.fn().mockImplementation(() => resolveValue);
  // builderがawaitされた場合（Promise.resolveとして使われる場合）
  builder.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => {
    resolve(resolveValue);
  });
  return builder;
}

const mockFrom = vi.fn().mockImplementation(() => {
  const builder = createChainableBuilder();
  fromCalls.push(builder);
  return builder;
});

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn(async (query: unknown) => query),
  strictWithTenant: vi.fn(async (query: unknown) => query),
  tenantPayload: vi.fn((id: string | null) => ({ tenant_id: id })),
}));

const mockGetSettingOrEnv = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: (...args: unknown[]) => mockGetSettingOrEnv(...args),
}));

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  };
});

import {
  fetchPatientMemory,
  savePatientMemory,
  deactivateMemory,
  formatMemoryForPrompt,
  extractAndSaveMemory,
  type PatientMemory,
} from "@/lib/ai-patient-memory";
import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant } from "@/lib/tenant";

// --- ヘルパー ---

function makeMemory(overrides: Partial<PatientMemory> = {}): PatientMemory {
  return {
    id: 1,
    memory_type: "allergy",
    content: "花粉症あり",
    source: "auto",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    expires_at: null,
    is_active: true,
    ...overrides,
  };
}

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const PATIENT_ID = "patient-001";

// --- テスト本体 ---

describe("fetchPatientMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCalls.length = 0;
  });

  it("正常取得: アクティブなメモリを返す", async () => {
    const memories = [makeMemory(), makeMemory({ id: 2, memory_type: "preference", content: "午前希望" })];
    vi.mocked(strictWithTenant).mockResolvedValueOnce({ data: memories, error: null } as any);

    const result = await fetchPatientMemory(PATIENT_ID, TENANT_ID);

    expect(result).toHaveLength(2);
    expect(result[0].content).toBe("花粉症あり");
    expect(result[1].content).toBe("午前希望");
    expect(mockFrom).toHaveBeenCalledWith("ai_patient_memory");
  });

  it("空結果: dataがnullの場合は空配列を返す", async () => {
    vi.mocked(strictWithTenant).mockResolvedValueOnce({ data: null, error: null } as any);

    const result = await fetchPatientMemory(PATIENT_ID, TENANT_ID);

    expect(result).toEqual([]);
  });

  it("エラー時: 空配列を返す", async () => {
    vi.mocked(strictWithTenant).mockResolvedValueOnce({
      data: null,
      error: { message: "DB error" },
    } as any);

    const result = await fetchPatientMemory(PATIENT_ID, TENANT_ID);

    expect(result).toEqual([]);
  });

  it("期限切れメモリを除外する", async () => {
    const active = makeMemory({ id: 1, expires_at: "2099-12-31T00:00:00Z" });
    const expired = makeMemory({ id: 2, expires_at: "2020-01-01T00:00:00Z", content: "期限切れ" });
    const noExpiry = makeMemory({ id: 3, expires_at: null, content: "期限なし" });

    vi.mocked(strictWithTenant).mockResolvedValueOnce({
      data: [active, expired, noExpiry],
      error: null,
    } as any);

    const result = await fetchPatientMemory(PATIENT_ID, TENANT_ID);

    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual([1, 3]);
  });
});

describe("savePatientMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCalls.length = 0;
  });

  it("新規保存: 重複なしの場合insertする", async () => {
    // 重複チェック（strictWithTenant経由）→ 既存なし
    vi.mocked(strictWithTenant).mockResolvedValueOnce({ data: [], error: null } as any);

    const result = await savePatientMemory({
      tenantId: TENANT_ID,
      patientId: PATIENT_ID,
      memoryType: "allergy",
      content: "花粉症あり",
    });

    expect(result).toBe(true);
    // from()が2回呼ばれる（重複チェック + insert）
    expect(mockFrom).toHaveBeenCalledTimes(2);
    // 2回目のfrom呼び出しでinsertが使われている
    expect(fromCalls[1].insert).toHaveBeenCalled();
  });

  it("重複検出: 類似する既存メモリがあれば更新する", async () => {
    // 重複チェック: 既存レコードあり（contentが部分一致）
    vi.mocked(strictWithTenant).mockResolvedValueOnce({
      data: [{ id: 10, content: "花粉症あり" }],
      error: null,
    } as any);

    const result = await savePatientMemory({
      tenantId: TENANT_ID,
      patientId: PATIENT_ID,
      memoryType: "allergy",
      content: "花粉症あり、スギ花粉が特にひどい",
    });

    expect(result).toBe(true);
    // from()が2回呼ばれる（重複チェック + update）
    expect(mockFrom).toHaveBeenCalledTimes(2);
    // 2回目のfrom呼び出しでupdateが使われている
    expect(fromCalls[1].update).toHaveBeenCalledWith(
      expect.objectContaining({ content: "花粉症あり、スギ花粉が特にひどい" })
    );
  });

  it("保存エラー時: falseを返す", async () => {
    vi.mocked(strictWithTenant).mockResolvedValueOnce({ data: [], error: null } as any);
    // insertがエラーを返すようにfromを上書き
    mockFrom.mockImplementationOnce(() => {
      // 重複チェック用（strictWithTenantが結果を制御するのでビルダーの中身は不問）
      const b = createChainableBuilder();
      fromCalls.push(b);
      return b;
    }).mockImplementationOnce(() => {
      // insert用: エラーを返す
      const b = createChainableBuilder();
      b.insert = vi.fn().mockReturnValue({ error: { message: "insert failed" } });
      fromCalls.push(b);
      return b;
    });

    const result = await savePatientMemory({
      tenantId: TENANT_ID,
      patientId: PATIENT_ID,
      memoryType: "allergy",
      content: "花粉症あり",
    });

    expect(result).toBe(false);
  });
});

describe("deactivateMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCalls.length = 0;
  });

  it("正常無効化: trueを返す", async () => {
    vi.mocked(strictWithTenant).mockResolvedValueOnce({ data: null, error: null } as any);

    const result = await deactivateMemory(42, TENANT_ID);

    expect(result).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("ai_patient_memory");
    expect(fromCalls[0].update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false })
    );
  });

  it("エラー時: falseを返す", async () => {
    vi.mocked(strictWithTenant).mockResolvedValueOnce({
      data: null,
      error: { message: "update failed" },
    } as any);

    const result = await deactivateMemory(42, TENANT_ID);

    expect(result).toBe(false);
  });
});

describe("formatMemoryForPrompt", () => {
  it("メモリありの場合: 見出し付きフォーマットを返す", () => {
    const memories = [
      makeMemory({ memory_type: "allergy", content: "花粉症あり" }),
      makeMemory({ memory_type: "preference", content: "午前中の診察希望" }),
      makeMemory({ memory_type: "unknown_type" as any, content: "カスタムタイプ" }),
    ];

    const result = formatMemoryForPrompt(memories);

    expect(result).toContain("## この患者に関する記憶");
    expect(result).toContain("- [アレルギー] 花粉症あり");
    expect(result).toContain("- [好み・希望] 午前中の診察希望");
    // 未定義のタイプはそのまま表示
    expect(result).toContain("- [unknown_type] カスタムタイプ");
  });

  it("空配列の場合: 空文字を返す", () => {
    const result = formatMemoryForPrompt([]);

    expect(result).toBe("");
  });
});

describe("extractAndSaveMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCalls.length = 0;
    mockGetSettingOrEnv.mockResolvedValue(null);
  });

  it("APIキーなし: 早期returnする（Anthropicクライアント未生成）", async () => {
    mockGetSettingOrEnv.mockResolvedValueOnce(null);

    await extractAndSaveMemory({
      patientId: PATIENT_ID,
      tenantId: TENANT_ID,
      messages: ["花粉症がひどいです"],
      aiReply: "花粉症のお薬をご案内します。",
    });

    // APIキーがないのでsupabaseAdmin.fromは呼ばれない
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

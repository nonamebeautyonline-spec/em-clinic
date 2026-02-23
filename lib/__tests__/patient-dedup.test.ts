// lib/__tests__/patient-dedup.test.ts — 患者名寄せロジックテスト

import {
  levenshteinDistance,
  calculateSimilarity,
  type PatientRecord,
} from "@/lib/patient-dedup";

// --- Supabaseモック（テーブルごとに独立チェーン） ---

function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  const methods = [
    "insert", "update", "delete", "select", "eq", "neq",
    "in", "is", "not", "order", "limit", "range",
    "single", "maybeSingle", "upsert",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // await chain → defaultResolve
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};

function getOrCreateChain(table: string) {
  if (!tableChains[table]) {
    tableChains[table] = createChain();
  }
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({})),
}));

beforeEach(() => {
  tableChains = {};
});

// --- テスト用患者レコードファクトリ ---
function makePatient(overrides: Partial<PatientRecord> = {}): PatientRecord {
  return {
    id: 1,
    patient_id: "P001",
    name: "田中太郎",
    name_kana: "タナカタロウ",
    tel: "09012345678",
    email: null,
    sex: "男性",
    birthday: "1990-01-01",
    line_id: null,
    created_at: "2025-01-01T00:00:00Z",
    tenant_id: null,
    ...overrides,
  };
}

// ============================================================
// levenshteinDistance — 純粋関数テスト（追加ケース）
// ============================================================

describe("levenshteinDistance（追加ケース）", () => {
  it("挿入操作 → 距離1", () => {
    expect(levenshteinDistance("abc", "abcd")).toBe(1);
  });

  it("削除操作 → 距離1", () => {
    expect(levenshteinDistance("abcd", "abc")).toBe(1);
  });

  it("置換操作 → 距離1", () => {
    expect(levenshteinDistance("abc", "axc")).toBe(1);
  });

  it("長い日本語文字列の比較", () => {
    expect(levenshteinDistance("山田花子", "山田はな子")).toBe(2);
  });

  it("アルファベットと数字の混合", () => {
    expect(levenshteinDistance("abc123", "abc124")).toBe(1);
  });
});

// ============================================================
// calculateSimilarity — 類似度計算テスト（追加ケース）
// ============================================================

describe("calculateSimilarity（追加ケース）", () => {
  it("電話番号完全一致 → スコア95", () => {
    const a = makePatient({ tel: "09012345678" });
    const b = makePatient({ patient_id: "P002", tel: "09012345678" });
    const result = calculateSimilarity(a, b);
    expect(result.similarity).toBe(95);
    expect(result.matchReasons).toContainEqual(
      expect.objectContaining({ type: "phone_exact", score: 95 }),
    );
  });

  it("電話番号正規化後一致（0090→090） → スコア90", () => {
    const a = makePatient({ tel: "09012345678" });
    const b = makePatient({ patient_id: "P002", tel: "0090-1234-5678" });
    const result = calculateSimilarity(a, b);
    expect(result.similarity).toBe(90);
    expect(result.matchReasons).toContainEqual(
      expect.objectContaining({ type: "phone_normalized" }),
    );
  });

  it("名前（距離2）+ 生年月日一致 → スコア80", () => {
    const a = makePatient({ tel: null, name: "田中太郎", birthday: "1990-01-01" });
    const b = makePatient({
      patient_id: "P002", tel: null, name: "山中次郎", birthday: "1990-01-01",
    });
    const result = calculateSimilarity(a, b);
    expect(result.similarity).toBe(80);
  });

  it("名前（距離3）+ 生年月日一致 → マッチしない", () => {
    const a = makePatient({ tel: null, name: "田中太郎", birthday: "1990-01-01" });
    const b = makePatient({
      patient_id: "P002", tel: null, name: "佐藤花子", birthday: "1990-01-01",
    });
    const result = calculateSimilarity(a, b);
    expect(result.matchReasons.find((r) => r.type === "name_birthday")).toBeUndefined();
  });

  it("カナ + 性別一致 → スコア70", () => {
    const a = makePatient({ tel: null, name_kana: "タナカ", sex: "男性", birthday: null });
    const b = makePatient({
      patient_id: "P002", tel: null, name_kana: "タナカ", sex: "男性", birthday: null,
    });
    const result = calculateSimilarity(a, b);
    expect(result.similarity).toBe(70);
  });

  it("カナ一致・性別不一致 → マッチしない", () => {
    const a = makePatient({ tel: null, name_kana: "タナカ", sex: "男性", birthday: null });
    const b = makePatient({
      patient_id: "P002", tel: null, name_kana: "タナカ", sex: "女性", birthday: null,
    });
    const result = calculateSimilarity(a, b);
    expect(result.matchReasons.find((r) => r.type === "name_kana_sex")).toBeUndefined();
  });

  it("一致なし → スコア0", () => {
    const a = makePatient({ tel: "09011111111", name_kana: "タナカ", sex: "男性" });
    const b = makePatient({
      patient_id: "P002", tel: "08099999999", name_kana: "サトウ", sex: "女性",
      birthday: "1985-06-15",
    });
    const result = calculateSimilarity(a, b);
    expect(result.similarity).toBe(0);
  });

  it("両者のtel=null → 電話番号マッチなし", () => {
    const a = makePatient({ tel: null });
    const b = makePatient({ patient_id: "P002", tel: null });
    const result = calculateSimilarity(a, b);
    const phoneReasons = result.matchReasons.filter((r) =>
      r.type === "phone_exact" || r.type === "phone_normalized"
    );
    expect(phoneReasons).toHaveLength(0);
  });
});

// ============================================================
// findDuplicateCandidates — テーブルごとのチェーンモック
// ============================================================

describe("findDuplicateCandidates", () => {
  it("患者0件 → 空配列", async () => {
    const { findDuplicateCandidates } = await import("@/lib/patient-dedup");
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) =>
      resolve({ data: [], error: null }),
    );

    const result = await findDuplicateCandidates(null);
    expect(result).toEqual([]);
  });

  it("クエリエラー → 例外スロー", async () => {
    const { findDuplicateCandidates } = await import("@/lib/patient-dedup");
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((resolve: any) =>
      resolve({ data: null, error: { message: "DB error" } }),
    );

    await expect(findDuplicateCandidates(null)).rejects.toThrow("患者データ取得エラー");
  });

  it("電話番号重複ペアを検出する", async () => {
    const { findDuplicateCandidates } = await import("@/lib/patient-dedup");
    const patients = [
      makePatient({ id: 1, patient_id: "P001", tel: "09012345678" }),
      makePatient({ id: 2, patient_id: "P002", tel: "09012345678" }),
    ];

    getOrCreateChain("patients").then = vi.fn((r: any) =>
      r({ data: patients, error: null }),
    );
    getOrCreateChain("reservations").then = vi.fn((r: any) =>
      r({ data: [] }),
    );
    getOrCreateChain("orders").then = vi.fn((r: any) =>
      r({ data: [] }),
    );
    getOrCreateChain("dedup_ignored").then = vi.fn((r: any) =>
      r({ data: [] }),
    );

    const result = await findDuplicateCandidates(null);
    expect(result.length).toBe(1);
    expect(result[0].similarity).toBe(95);
    expect(result[0].patientA.patient_id).toBe("P001");
    expect(result[0].patientB.patient_id).toBe("P002");
  });

  it("minScore で候補をフィルタする", async () => {
    const { findDuplicateCandidates } = await import("@/lib/patient-dedup");
    // カナ+性別のみ一致(70) → minScore=80 でフィルタ
    // 名前・生年月日は異なるので name_birthday は発火しない
    const patients = [
      makePatient({ id: 1, patient_id: "P001", tel: null, name: "田中太郎", name_kana: "タナカ", sex: "男性", birthday: "1990-01-01" }),
      makePatient({ id: 2, patient_id: "P002", tel: null, name: "佐藤花子", name_kana: "タナカ", sex: "男性", birthday: "1985-06-15" }),
    ];

    getOrCreateChain("patients").then = vi.fn((r: any) =>
      r({ data: patients, error: null }),
    );
    getOrCreateChain("reservations").then = vi.fn((r: any) =>
      r({ data: [] }),
    );
    getOrCreateChain("orders").then = vi.fn((r: any) =>
      r({ data: [] }),
    );
    getOrCreateChain("dedup_ignored").then = vi.fn((r: any) =>
      r({ data: [] }),
    );

    const result = await findDuplicateCandidates(null, 80);
    expect(result.length).toBe(0); // 70 < 80 なのでフィルタアウト
  });
});

// ============================================================
// mergePatients
// ============================================================

describe("mergePatients", () => {
  it("keepId が存在しない → エラー", async () => {
    const { mergePatients } = await import("@/lib/patient-dedup");
    const chain = getOrCreateChain("patients");
    chain.single.mockResolvedValueOnce({ data: null });

    const result = await mergePatients("P_KEEP", "P_REMOVE", null);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("P_KEEP");
  });

  it("removeId が存在しない → エラー", async () => {
    const { mergePatients } = await import("@/lib/patient-dedup");
    const chain = getOrCreateChain("patients");
    chain.single
      .mockResolvedValueOnce({ data: { patient_id: "P_KEEP" } })
      .mockResolvedValueOnce({ data: null });

    const result = await mergePatients("P_KEEP", "P_REMOVE", null);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("P_REMOVE");
  });
});

// ============================================================
// ignoreDuplicatePair
// ============================================================

describe("ignoreDuplicatePair", () => {
  it("正常にupsertされる", async () => {
    const { ignoreDuplicatePair } = await import("@/lib/patient-dedup");
    const chain = getOrCreateChain("dedup_ignored");
    chain.upsert.mockResolvedValueOnce({ error: null });

    const result = await ignoreDuplicatePair("P002", "P001", null);
    expect(result.ok).toBe(true);
  });

  it("IDがソート順で保存される（P002, P001 → P001, P002）", async () => {
    const { ignoreDuplicatePair } = await import("@/lib/patient-dedup");
    const chain = getOrCreateChain("dedup_ignored");
    chain.upsert.mockResolvedValueOnce({ error: null });

    await ignoreDuplicatePair("P002", "P001", null);

    const upsertCall = chain.upsert.mock.calls[0];
    expect(upsertCall[0].patient_id_a).toBe("P001");
    expect(upsertCall[0].patient_id_b).toBe("P002");
  });

  it("upsertエラー → ok: false", async () => {
    const { ignoreDuplicatePair } = await import("@/lib/patient-dedup");
    const chain = getOrCreateChain("dedup_ignored");
    chain.upsert.mockResolvedValueOnce({ error: { message: "conflict" } });

    const result = await ignoreDuplicatePair("P001", "P002", null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("conflict");
  });
});

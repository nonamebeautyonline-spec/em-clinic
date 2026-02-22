// __tests__/api/dedup-patients.test.ts
// 患者名寄せ（重複候補検出＋統合）テスト
// - レーベンシュタイン距離
// - 類似度計算（4パターン）
// - 重複候補検出API
// - 統合実行API
// - 無視API
// - Zodバリデーション

import { describe, it, expect, vi, beforeEach } from "vitest";

// ================================================================
// 1. レーベンシュタイン距離テスト（純粋関数、外部依存なし）
// ================================================================
describe("levenshteinDistance", () => {
  it("同一文字列で距離0", async () => {
    const { levenshteinDistance } = await import("@/lib/patient-dedup");
    expect(levenshteinDistance("田中太郎", "田中太郎")).toBe(0);
  });

  it("空文字列同士で距離0", async () => {
    const { levenshteinDistance } = await import("@/lib/patient-dedup");
    expect(levenshteinDistance("", "")).toBe(0);
  });

  it("片方が空文字列の場合は他方の長さ", async () => {
    const { levenshteinDistance } = await import("@/lib/patient-dedup");
    expect(levenshteinDistance("abc", "")).toBe(3);
    expect(levenshteinDistance("", "abc")).toBe(3);
  });

  it("1文字違いで距離1", async () => {
    const { levenshteinDistance } = await import("@/lib/patient-dedup");
    expect(levenshteinDistance("田中太郎", "田中太朗")).toBe(1);
  });

  it("2文字違いで距離2", async () => {
    const { levenshteinDistance } = await import("@/lib/patient-dedup");
    // 「田中太郎」→「佐藤太郎」は「田」→「佐」と「中」→「藤」の2文字置換
    expect(levenshteinDistance("田中太郎", "佐藤太郎")).toBe(2);
  });

  it("まったく異なる文字列", async () => {
    const { levenshteinDistance } = await import("@/lib/patient-dedup");
    const dist = levenshteinDistance("あいう", "えおか");
    expect(dist).toBe(3);
  });
});

// ================================================================
// 2. 類似度計算テスト（calculateSimilarity）
// ================================================================

// normalizeJPPhone のモックは不要（実際の関数を使う）
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({})),
    rpc: vi.fn(),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: any) => (tid ? { tenant_id: tid } : {})),
}));

const makePatient = (overrides: Partial<any> = {}) => ({
  id: 1,
  patient_id: "P-0001",
  name: null,
  name_kana: null,
  tel: null,
  email: null,
  sex: null,
  birthday: null,
  line_id: null,
  created_at: "2026-01-01T00:00:00Z",
  tenant_id: null,
  ...overrides,
});

describe("calculateSimilarity", () => {
  it("電話番号完全一致で確度95%", async () => {
    const { calculateSimilarity } = await import("@/lib/patient-dedup");
    const a = makePatient({ patient_id: "P-0001", tel: "08012345678" });
    const b = makePatient({ patient_id: "P-0002", tel: "08012345678" });
    const result = calculateSimilarity(a, b);
    expect(result.similarity).toBe(95);
    expect(result.matchReasons).toHaveLength(1);
    expect(result.matchReasons[0].type).toBe("phone_exact");
  });

  it("電話番号 normalizeJPPhone後 一致で確度90%", async () => {
    const { calculateSimilarity } = await import("@/lib/patient-dedup");
    const a = makePatient({ patient_id: "P-0001", tel: "080-1234-5678" });
    const b = makePatient({ patient_id: "P-0002", tel: "08012345678" });
    const result = calculateSimilarity(a, b);
    expect(result.similarity).toBe(90);
    expect(result.matchReasons.some((r: any) => r.type === "phone_normalized")).toBe(true);
  });

  it("名前類似（距離<=2）+ 生年月日一致で確度80%", async () => {
    const { calculateSimilarity } = await import("@/lib/patient-dedup");
    const a = makePatient({ patient_id: "P-0001", name: "田中太郎", birthday: "1985-03-15" });
    const b = makePatient({ patient_id: "P-0002", name: "田中太朗", birthday: "1985-03-15" });
    const result = calculateSimilarity(a, b);
    expect(result.similarity).toBe(80);
    expect(result.matchReasons.some((r: any) => r.type === "name_birthday")).toBe(true);
  });

  it("名前カナ一致 + 性別一致で確度70%", async () => {
    const { calculateSimilarity } = await import("@/lib/patient-dedup");
    const a = makePatient({ patient_id: "P-0001", name_kana: "タナカタロウ", sex: "male" });
    const b = makePatient({ patient_id: "P-0002", name_kana: "タナカタロウ", sex: "male" });
    const result = calculateSimilarity(a, b);
    expect(result.similarity).toBe(70);
    expect(result.matchReasons.some((r: any) => r.type === "name_kana_sex")).toBe(true);
  });

  it("一致条件なしで確度0%", async () => {
    const { calculateSimilarity } = await import("@/lib/patient-dedup");
    const a = makePatient({ patient_id: "P-0001", name: "田中太郎", tel: "08011111111" });
    const b = makePatient({ patient_id: "P-0002", name: "佐藤花子", tel: "09022222222" });
    const result = calculateSimilarity(a, b);
    expect(result.similarity).toBe(0);
    expect(result.matchReasons).toHaveLength(0);
  });

  it("複数条件が同時に一致する場合は最高スコアを採用", async () => {
    const { calculateSimilarity } = await import("@/lib/patient-dedup");
    const a = makePatient({
      patient_id: "P-0001",
      name: "田中太郎",
      name_kana: "タナカタロウ",
      tel: "08012345678",
      sex: "male",
      birthday: "1985-03-15",
    });
    const b = makePatient({
      patient_id: "P-0002",
      name: "田中太郎",
      name_kana: "タナカタロウ",
      tel: "08012345678",
      sex: "male",
      birthday: "1985-03-15",
    });
    const result = calculateSimilarity(a, b);
    // 電話番号完全一致 (95) + 名前+生年月日 (80) + カナ+性別 (70) → 最高95
    expect(result.similarity).toBe(95);
    expect(result.matchReasons.length).toBeGreaterThanOrEqual(3);
  });

  it("電話番号がnullの場合はマッチしない", async () => {
    const { calculateSimilarity } = await import("@/lib/patient-dedup");
    const a = makePatient({ patient_id: "P-0001", tel: null });
    const b = makePatient({ patient_id: "P-0002", tel: null });
    const result = calculateSimilarity(a, b);
    expect(result.matchReasons.filter((r: any) => r.type.startsWith("phone"))).toHaveLength(0);
  });

  it("名前距離が3以上の場合はname_birthday不一致", async () => {
    const { calculateSimilarity } = await import("@/lib/patient-dedup");
    const a = makePatient({ patient_id: "P-0001", name: "田中太郎", birthday: "1985-03-15" });
    const b = makePatient({ patient_id: "P-0002", name: "佐藤花子", birthday: "1985-03-15" });
    const result = calculateSimilarity(a, b);
    expect(result.matchReasons.some((r: any) => r.type === "name_birthday")).toBe(false);
  });
});

// ================================================================
// 3. Zodバリデーションテスト
// ================================================================
describe("dedup Zodスキーマ", () => {
  it("mergePatientSchema: 正常値を受け付ける", async () => {
    const { mergePatientSchema } = await import("@/lib/validations/dedup");
    const result = mergePatientSchema.safeParse({ keep_id: "P-0001", remove_id: "P-0002" });
    expect(result.success).toBe(true);
  });

  it("mergePatientSchema: keep_id が空でエラー", async () => {
    const { mergePatientSchema } = await import("@/lib/validations/dedup");
    const result = mergePatientSchema.safeParse({ keep_id: "", remove_id: "P-0002" });
    expect(result.success).toBe(false);
  });

  it("mergePatientSchema: remove_id が未指定でエラー", async () => {
    const { mergePatientSchema } = await import("@/lib/validations/dedup");
    const result = mergePatientSchema.safeParse({ keep_id: "P-0001" });
    expect(result.success).toBe(false);
  });

  it("ignoreDuplicateSchema: 正常値を受け付ける", async () => {
    const { ignoreDuplicateSchema } = await import("@/lib/validations/dedup");
    const result = ignoreDuplicateSchema.safeParse({ patient_id_a: "P-0001", patient_id_b: "P-0002" });
    expect(result.success).toBe(true);
  });

  it("ignoreDuplicateSchema: patient_id_a が空でエラー", async () => {
    const { ignoreDuplicateSchema } = await import("@/lib/validations/dedup");
    const result = ignoreDuplicateSchema.safeParse({ patient_id_a: "", patient_id_b: "P-0002" });
    expect(result.success).toBe(false);
  });
});

// ================================================================
// 4. アーキテクチャテスト: ファイル存在・構成確認
// ================================================================
describe("患者名寄せ アーキテクチャ", () => {
  it("lib/patient-dedup.ts が正しいエクスポートを持つ", async () => {
    const mod = await import("@/lib/patient-dedup");
    expect(typeof mod.levenshteinDistance).toBe("function");
    expect(typeof mod.calculateSimilarity).toBe("function");
    expect(typeof mod.findDuplicateCandidates).toBe("function");
    expect(typeof mod.mergePatients).toBe("function");
    expect(typeof mod.ignoreDuplicatePair).toBe("function");
  });

  it("検出APIルートが存在すること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/admin/dedup-patients/route.ts", "utf-8");
    expect(content).toContain("findDuplicateCandidates");
    expect(content).toContain("verifyAdminAuth");
    expect(content).toContain("resolveTenantId");
    expect(content).toContain("min_score");
  });

  it("統合APIルートが存在すること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/api/admin/dedup-patients/merge/route.ts", "utf-8");
    expect(content).toContain("mergePatients");
    expect(content).toContain("verifyAdminAuth");
    expect(content).toContain("mergePatientSchema");
    expect(content).toContain("logAudit");
  });

  it("管理画面ページが存在すること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/admin/dedup-patients/page.tsx", "utf-8");
    expect(content).toContain("/api/admin/dedup-patients");
    expect(content).toContain("/api/admin/dedup-patients/merge");
    expect(content).toContain("use client");
  });

  it("MERGE_TABLESを使って統合すること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("lib/patient-dedup.ts", "utf-8");
    expect(content).toContain('import { MERGE_TABLES } from "@/lib/merge-tables"');
    expect(content).toContain("MERGE_TABLES");
    // intake も別途処理
    expect(content).toContain("intake");
  });

  it("サイドバーに患者名寄せリンクがあること", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("app/admin/layout.tsx", "utf-8");
    expect(content).toContain("/admin/dedup-patients");
    expect(content).toContain("患者名寄せ");
  });
});

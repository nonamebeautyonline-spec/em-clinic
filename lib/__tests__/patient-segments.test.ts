// lib/__tests__/patient-segments.test.ts
// 患者セグメント — RFMスコアリング・セグメント判定ロジックのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockIn = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "patients") {
        return {
          select: mockSelect,
        };
      }
      if (table === "patient_segments") {
        return {
          upsert: mockUpsert,
        };
      }
      return {};
    }),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: any) => (tid ? { tenant_id: tid } : { tenant_id: null })),
}));

vi.mock("@/lib/behavior-filters", () => ({
  getVisitCounts: vi.fn(),
  getPurchaseAmounts: vi.fn(),
  getLastVisitDates: vi.fn(),
}));

import {
  calculateRFMScore,
  determineSegment,
  classifyPatients,
  saveSegments,
  SEGMENT_LABELS,
  SEGMENT_COLORS,
  ALL_SEGMENTS,
  type RFMScore,
  type SegmentType,
} from "@/lib/patient-segments";

import { getVisitCounts, getPurchaseAmounts, getLastVisitDates } from "@/lib/behavior-filters";

// ── RFMスコア計算テスト ──────────────────────────────────────

describe("calculateRFMScore", () => {
  // --- Recency ---
  describe("Recency スコア", () => {
    it("null（来院なし） → 1", () => {
      const score = calculateRFMScore(null, 0, 0);
      expect(score.recency).toBe(1);
    });

    it("30日以内 → 5", () => {
      expect(calculateRFMScore(0, 0, 0).recency).toBe(5);
      expect(calculateRFMScore(15, 0, 0).recency).toBe(5);
      expect(calculateRFMScore(30, 0, 0).recency).toBe(5);
    });

    it("31-60日 → 4", () => {
      expect(calculateRFMScore(31, 0, 0).recency).toBe(4);
      expect(calculateRFMScore(60, 0, 0).recency).toBe(4);
    });

    it("61-90日 → 3", () => {
      expect(calculateRFMScore(61, 0, 0).recency).toBe(3);
      expect(calculateRFMScore(90, 0, 0).recency).toBe(3);
    });

    it("91-180日 → 2", () => {
      expect(calculateRFMScore(91, 0, 0).recency).toBe(2);
      expect(calculateRFMScore(180, 0, 0).recency).toBe(2);
    });

    it("181日以上 → 1", () => {
      expect(calculateRFMScore(181, 0, 0).recency).toBe(1);
      expect(calculateRFMScore(365, 0, 0).recency).toBe(1);
    });
  });

  // --- Frequency ---
  describe("Frequency スコア", () => {
    it("0回 → 1", () => {
      expect(calculateRFMScore(null, 0, 0).frequency).toBe(1);
    });

    it("1回 → 2", () => {
      expect(calculateRFMScore(null, 1, 0).frequency).toBe(2);
    });

    it("2回 → 3", () => {
      expect(calculateRFMScore(null, 2, 0).frequency).toBe(3);
    });

    it("3-4回 → 4", () => {
      expect(calculateRFMScore(null, 3, 0).frequency).toBe(4);
      expect(calculateRFMScore(null, 4, 0).frequency).toBe(4);
    });

    it("5回以上 → 5", () => {
      expect(calculateRFMScore(null, 5, 0).frequency).toBe(5);
      expect(calculateRFMScore(null, 10, 0).frequency).toBe(5);
    });
  });

  // --- Monetary ---
  describe("Monetary スコア", () => {
    it("1万未満 → 1", () => {
      expect(calculateRFMScore(null, 0, 0).monetary).toBe(1);
      expect(calculateRFMScore(null, 0, 9999).monetary).toBe(1);
    });

    it("1万-3万未満 → 2", () => {
      expect(calculateRFMScore(null, 0, 10000).monetary).toBe(2);
      expect(calculateRFMScore(null, 0, 29999).monetary).toBe(2);
    });

    it("3万-5万未満 → 3", () => {
      expect(calculateRFMScore(null, 0, 30000).monetary).toBe(3);
      expect(calculateRFMScore(null, 0, 49999).monetary).toBe(3);
    });

    it("5万-10万未満 → 4", () => {
      expect(calculateRFMScore(null, 0, 50000).monetary).toBe(4);
      expect(calculateRFMScore(null, 0, 99999).monetary).toBe(4);
    });

    it("10万以上 → 5", () => {
      expect(calculateRFMScore(null, 0, 100000).monetary).toBe(5);
      expect(calculateRFMScore(null, 0, 500000).monetary).toBe(5);
    });
  });

  // --- 複合パターン ---
  it("全て最高: 最近来院 + 高頻度 + 高額 → 5/5/5", () => {
    const score = calculateRFMScore(10, 8, 200000);
    expect(score).toEqual({ recency: 5, frequency: 5, monetary: 5 });
  });

  it("全て最低: 来院なし + 0回 + 0円 → 1/1/1", () => {
    const score = calculateRFMScore(null, 0, 0);
    expect(score).toEqual({ recency: 1, frequency: 1, monetary: 1 });
  });
});

// ── セグメント判定テスト ──────────────────────────────────────

describe("determineSegment", () => {
  it("VIP: R>=4, F>=4, M>=4", () => {
    expect(determineSegment({ recency: 5, frequency: 5, monetary: 5 })).toBe("vip");
    expect(determineSegment({ recency: 4, frequency: 4, monetary: 4 })).toBe("vip");
  });

  it("アクティブ: R>=3, (F>=2 OR M>=2)", () => {
    expect(determineSegment({ recency: 3, frequency: 2, monetary: 1 })).toBe("active");
    expect(determineSegment({ recency: 5, frequency: 1, monetary: 2 })).toBe("active");
    expect(determineSegment({ recency: 3, frequency: 3, monetary: 3 })).toBe("active");
  });

  it("離脱リスク: R<=2, (F>=3 OR M>=3) — 過去は優良だが最近来ていない", () => {
    expect(determineSegment({ recency: 1, frequency: 5, monetary: 5 })).toBe("churn_risk");
    expect(determineSegment({ recency: 2, frequency: 3, monetary: 1 })).toBe("churn_risk");
    expect(determineSegment({ recency: 2, frequency: 1, monetary: 3 })).toBe("churn_risk");
  });

  it("新規: F<=1, M<=1", () => {
    expect(determineSegment({ recency: 5, frequency: 1, monetary: 1 })).toBe("new");
    expect(determineSegment({ recency: 3, frequency: 1, monetary: 1 })).toBe("new");
    expect(determineSegment({ recency: 1, frequency: 1, monetary: 1 })).toBe("new");
  });

  it("休眠: それ以外", () => {
    // R=1, F=2, M=2 — 頻度・金額がまあまあだが最近来ていない（離脱リスクの閾値未満）
    expect(determineSegment({ recency: 1, frequency: 2, monetary: 2 })).toBe("dormant");
  });

  // 優先順位テスト
  it("VIPが離脱リスクより優先（R>=4ならchurn_riskにはならない）", () => {
    expect(determineSegment({ recency: 4, frequency: 5, monetary: 5 })).toBe("vip");
  });

  it("離脱リスクがアクティブより優先（R<=2は離脱リスク判定が先）", () => {
    // R=2, F=4, M=4 → 離脱リスク（VIPの条件R>=4を満たさず、churn_risk判定へ）
    expect(determineSegment({ recency: 2, frequency: 4, monetary: 4 })).toBe("churn_risk");
  });
});

// ── 定数定義テスト ──────────────────────────────────────

describe("定数定義", () => {
  it("SEGMENT_LABELS が全セグメント分定義されている", () => {
    expect(SEGMENT_LABELS.vip).toBe("VIP");
    expect(SEGMENT_LABELS.active).toBe("アクティブ");
    expect(SEGMENT_LABELS.churn_risk).toBe("離脱リスク");
    expect(SEGMENT_LABELS.dormant).toBe("休眠");
    expect(SEGMENT_LABELS.new).toBe("新規");
  });

  it("SEGMENT_COLORS が全セグメント分定義されている", () => {
    for (const seg of ALL_SEGMENTS) {
      expect(SEGMENT_COLORS[seg]).toBeDefined();
      expect(SEGMENT_COLORS[seg]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("ALL_SEGMENTS が5種類", () => {
    expect(ALL_SEGMENTS).toHaveLength(5);
    expect(ALL_SEGMENTS).toContain("vip");
    expect(ALL_SEGMENTS).toContain("active");
    expect(ALL_SEGMENTS).toContain("churn_risk");
    expect(ALL_SEGMENTS).toContain("dormant");
    expect(ALL_SEGMENTS).toContain("new");
  });
});

// ── classifyPatients テスト ──────────────────────────────────

describe("classifyPatients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("患者がいない場合は空配列を返す", async () => {
    mockSelect.mockReturnValue({ data: [], error: null });

    const results = await classifyPatients(null);
    expect(results).toEqual([]);
  });

  it("行動データからRFMスコアを計算してセグメント分類する", async () => {
    // 患者データ
    mockSelect.mockReturnValue({
      data: [
        { patient_id: "P001" },
        { patient_id: "P002" },
        { patient_id: "P003" },
      ],
      error: null,
    });

    // 来院回数
    const visitMap = new Map([
      ["P001", 5],
      ["P002", 1],
      ["P003", 0],
    ]);
    (getVisitCounts as any).mockResolvedValue(visitMap);

    // 購入金額
    const purchaseMap = new Map([
      ["P001", 150000],
      ["P002", 5000],
      ["P003", 0],
    ]);
    (getPurchaseAmounts as any).mockResolvedValue(purchaseMap);

    // 最終来院日（P001: 10日前、P002: 100日前、P003: null）
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const hundredDaysAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const lastVisitMap = new Map<string, string | null>([
      ["P001", tenDaysAgo],
      ["P002", hundredDaysAgo],
      ["P003", null],
    ]);
    (getLastVisitDates as any).mockResolvedValue(lastVisitMap);

    const results = await classifyPatients(null);
    expect(results).toHaveLength(3);

    // P001: R=5(10日前), F=5(5回), M=5(15万) → VIP
    const p001 = results.find((r) => r.patientId === "P001")!;
    expect(p001.segment).toBe("vip");
    expect(p001.rfmScore.recency).toBe(5);
    expect(p001.rfmScore.frequency).toBe(5);
    expect(p001.rfmScore.monetary).toBe(5);

    // P002: R=2(100日前), F=2(1回), M=1(5000円) → 休眠
    const p002 = results.find((r) => r.patientId === "P002")!;
    // R=2(91-180日), F=2(1回), M=1(1万未満)
    // newの条件: F<=1 AND M<=1 → F=2なので新規ではない
    // dormantに分類される
    expect(p002.segment).toBe("dormant");

    // P003: R=1(null), F=1(0回), M=1(0円) → 新規
    const p003 = results.find((r) => r.patientId === "P003")!;
    expect(p003.segment).toBe("new");
    expect(p003.rfmScore).toEqual({ recency: 1, frequency: 1, monetary: 1 });
  });
});

// ── saveSegments テスト ──────────────────────────────────

describe("saveSegments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空配列の場合はDBアクセスしない", async () => {
    await saveSegments([], null);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("セグメント結果をupsertで保存する", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const results = [
      {
        patientId: "P001",
        segment: "vip" as SegmentType,
        rfmScore: { recency: 5, frequency: 5, monetary: 5 },
      },
      {
        patientId: "P002",
        segment: "new" as SegmentType,
        rfmScore: { recency: 1, frequency: 1, monetary: 1 },
      },
    ];

    await saveSegments(results, null);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [rows, options] = mockUpsert.mock.calls[0];
    expect(rows).toHaveLength(2);
    expect(rows[0].patient_id).toBe("P001");
    expect(rows[0].segment).toBe("vip");
    expect(rows[0].rfm_score).toEqual({ recency: 5, frequency: 5, monetary: 5 });
    expect(rows[1].patient_id).toBe("P002");
    expect(rows[1].segment).toBe("new");
    expect(options.onConflict).toBe("patient_id,tenant_id");
  });

  it("upsertエラー時に例外を投げる", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "DB error" } });

    const results = [
      {
        patientId: "P001",
        segment: "vip" as SegmentType,
        rfmScore: { recency: 5, frequency: 5, monetary: 5 },
      },
    ];

    await expect(saveSegments(results, null)).rejects.toThrow("セグメント保存エラー");
  });

  it("テナントID付きで保存する", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const results = [
      {
        patientId: "P001",
        segment: "active" as SegmentType,
        rfmScore: { recency: 3, frequency: 3, monetary: 3 },
      },
    ];

    await saveSegments(results, "tenant-123");

    const [rows] = mockUpsert.mock.calls[0];
    expect(rows[0].tenant_id).toBe("tenant-123");
  });
});

// ── 境界値テスト ──────────────────────────────────────

describe("境界値テスト", () => {
  it("Recency 境界: 30日 → 5, 31日 → 4", () => {
    expect(calculateRFMScore(30, 0, 0).recency).toBe(5);
    expect(calculateRFMScore(31, 0, 0).recency).toBe(4);
  });

  it("Recency 境界: 60日 → 4, 61日 → 3", () => {
    expect(calculateRFMScore(60, 0, 0).recency).toBe(4);
    expect(calculateRFMScore(61, 0, 0).recency).toBe(3);
  });

  it("Recency 境界: 90日 → 3, 91日 → 2", () => {
    expect(calculateRFMScore(90, 0, 0).recency).toBe(3);
    expect(calculateRFMScore(91, 0, 0).recency).toBe(2);
  });

  it("Recency 境界: 180日 → 2, 181日 → 1", () => {
    expect(calculateRFMScore(180, 0, 0).recency).toBe(2);
    expect(calculateRFMScore(181, 0, 0).recency).toBe(1);
  });

  it("Monetary 境界: 9999円 → 1, 10000円 → 2", () => {
    expect(calculateRFMScore(null, 0, 9999).monetary).toBe(1);
    expect(calculateRFMScore(null, 0, 10000).monetary).toBe(2);
  });

  it("Monetary 境界: 29999円 → 2, 30000円 → 3", () => {
    expect(calculateRFMScore(null, 0, 29999).monetary).toBe(2);
    expect(calculateRFMScore(null, 0, 30000).monetary).toBe(3);
  });

  it("Monetary 境界: 49999円 → 3, 50000円 → 4", () => {
    expect(calculateRFMScore(null, 0, 49999).monetary).toBe(3);
    expect(calculateRFMScore(null, 0, 50000).monetary).toBe(4);
  });

  it("Monetary 境界: 99999円 → 4, 100000円 → 5", () => {
    expect(calculateRFMScore(null, 0, 99999).monetary).toBe(4);
    expect(calculateRFMScore(null, 0, 100000).monetary).toBe(5);
  });
});

// AI WFM Metrics テスト（純ロジック部分）
import { describe, it, expect, vi } from "vitest";

// supabaseAdmin モック（calculateWFMMetrics用）
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

import { classifyAge, calculateBacklogAging } from "../ai-wfm-metrics";

describe("classifyAge", () => {
  it("0-59分は0-1h", () => {
    expect(classifyAge(0)).toBe("0-1h");
    expect(classifyAge(30)).toBe("0-1h");
    expect(classifyAge(59)).toBe("0-1h");
  });

  it("60-239分は1-4h", () => {
    expect(classifyAge(60)).toBe("1-4h");
    expect(classifyAge(120)).toBe("1-4h");
    expect(classifyAge(239)).toBe("1-4h");
  });

  it("240-1439分は4-24h", () => {
    expect(classifyAge(240)).toBe("4-24h");
    expect(classifyAge(720)).toBe("4-24h");
    expect(classifyAge(1439)).toBe("4-24h");
  });

  it("1440分以上は24h+", () => {
    expect(classifyAge(1440)).toBe("24h+");
    expect(classifyAge(10000)).toBe("24h+");
  });
});

describe("calculateBacklogAging", () => {
  it("空配列は全バケット0", () => {
    const result = calculateBacklogAging([]);
    expect(result).toEqual([
      { ageRangeName: "0-1h", count: 0 },
      { ageRangeName: "1-4h", count: 0 },
      { ageRangeName: "4-24h", count: 0 },
      { ageRangeName: "24h+", count: 0 },
    ]);
  });

  it("直近のタスクは0-1hにカウント", () => {
    const now = new Date();
    const result = calculateBacklogAging([
      { createdAt: new Date(now.getTime() - 10 * 60000).toISOString() }, // 10分前
      { createdAt: new Date(now.getTime() - 30 * 60000).toISOString() }, // 30分前
    ]);
    const bucket = result.find((b) => b.ageRangeName === "0-1h");
    expect(bucket?.count).toBe(2);
  });

  it("古いタスクは24h+にカウント", () => {
    const now = new Date();
    const result = calculateBacklogAging([
      { createdAt: new Date(now.getTime() - 48 * 60 * 60000).toISOString() }, // 48時間前
    ]);
    const bucket = result.find((b) => b.ageRangeName === "24h+");
    expect(bucket?.count).toBe(1);
  });

  it("複数バケットに分散", () => {
    const now = new Date();
    const result = calculateBacklogAging([
      { createdAt: new Date(now.getTime() - 10 * 60000).toISOString() },    // 0-1h
      { createdAt: new Date(now.getTime() - 90 * 60000).toISOString() },    // 1-4h
      { createdAt: new Date(now.getTime() - 300 * 60000).toISOString() },   // 4-24h
      { createdAt: new Date(now.getTime() - 2000 * 60000).toISOString() },  // 24h+
    ]);
    expect(result.find((b) => b.ageRangeName === "0-1h")?.count).toBe(1);
    expect(result.find((b) => b.ageRangeName === "1-4h")?.count).toBe(1);
    expect(result.find((b) => b.ageRangeName === "4-24h")?.count).toBe(1);
    expect(result.find((b) => b.ageRangeName === "24h+")?.count).toBe(1);
  });
});

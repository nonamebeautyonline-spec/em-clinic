// AI Offline Eval のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabaseモック（vi.hoisted使用） ---
const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mockFrom },
}));

vi.mock("@/lib/tenant", () => ({
  tenantPayload: (tenantId: string | null) => ({ tenant_id: tenantId }),
}));

import { summarizeEvalResults } from "@/lib/ai-offline-eval";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("summarizeEvalResults", () => {
  it("結果なしの場合はtieを返す", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }));

    const summary = await summarizeEvalResults(1);
    expect(summary.winner).toBe("tie");
    expect(summary.config_a.count).toBe(0);
    expect(summary.config_b.count).toBe(0);
  });

  it("config_bのスコアが5%以上高い場合はbが勝者", async () => {
    const mockResults = [
      { config_key: "a", scores: { overall_score: 0.5, latency_ms: 100, token_count: 500 } },
      { config_key: "a", scores: { overall_score: 0.6, latency_ms: 120, token_count: 450 } },
      { config_key: "b", scores: { overall_score: 0.8, latency_ms: 90, token_count: 400 } },
      { config_key: "b", scores: { overall_score: 0.9, latency_ms: 80, token_count: 350 } },
    ];

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockResults, error: null }),
      }),
    }));

    const summary = await summarizeEvalResults(1);
    expect(summary.winner).toBe("b");
    expect(summary.config_a.count).toBe(2);
    expect(summary.config_b.count).toBe(2);
    expect(summary.config_b.avg_score).toBeGreaterThan(summary.config_a.avg_score);
    expect(summary.improvement_pct).toBeGreaterThan(0);
  });

  it("config_aのスコアが5%以上高い場合はaが勝者", async () => {
    const mockResults = [
      { config_key: "a", scores: { overall_score: 0.9, latency_ms: 100, token_count: 500 } },
      { config_key: "a", scores: { overall_score: 0.85, latency_ms: 110, token_count: 480 } },
      { config_key: "b", scores: { overall_score: 0.5, latency_ms: 200, token_count: 600 } },
      { config_key: "b", scores: { overall_score: 0.45, latency_ms: 220, token_count: 650 } },
    ];

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockResults, error: null }),
      }),
    }));

    const summary = await summarizeEvalResults(1);
    expect(summary.winner).toBe("a");
  });

  it("スコア差が5%以内の場合はtie", async () => {
    const mockResults = [
      { config_key: "a", scores: { overall_score: 0.80, latency_ms: 100, token_count: 500 } },
      { config_key: "a", scores: { overall_score: 0.82, latency_ms: 100, token_count: 500 } },
      { config_key: "b", scores: { overall_score: 0.82, latency_ms: 100, token_count: 500 } },
      { config_key: "b", scores: { overall_score: 0.84, latency_ms: 100, token_count: 500 } },
    ];

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockResults, error: null }),
      }),
    }));

    const summary = await summarizeEvalResults(1);
    expect(summary.winner).toBe("tie");
  });

  it("平均レイテンシとトークン数を正しく計算する", async () => {
    const mockResults = [
      { config_key: "a", scores: { overall_score: 0.7, latency_ms: 100, token_count: 500 } },
      { config_key: "a", scores: { overall_score: 0.8, latency_ms: 200, token_count: 600 } },
    ];

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockResults, error: null }),
      }),
    }));

    const summary = await summarizeEvalResults(1);
    expect(summary.config_a.avg_latency).toBe(150);
    expect(summary.config_a.avg_token_count).toBe(550);
  });
});

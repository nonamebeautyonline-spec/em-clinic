// lib/__tests__/scoring.test.ts — スコアリングのユニットテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// supabase 全体モック（チェーン対応）
const mockRpc = vi.fn().mockResolvedValue({ data: 50, error: null });
const mockInsertFn = vi.fn().mockResolvedValue({ data: null, error: null });

function makeChain() {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: { lead_score: 30 }, error: null });
  chain.single = vi.fn().mockResolvedValue({ data: { id: "r1" }, error: null });
  chain.insert = vi.fn((...args: unknown[]) => { mockInsertFn(...args); return chain; });
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  return chain;
}

// scoring_rules テーブルへのクエリ結果を制御
const rulesData = [{ id: "r1", name: "予約完了", event_type: "reservation_made", score_value: 50, is_active: true }];

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const chain = makeChain();
      // scoring_rules のクエリ結果を注入
      if (table === "scoring_rules") {
        chain.eq = vi.fn().mockImplementation(() => {
          const inner = makeChain();
          inner.eq = vi.fn().mockResolvedValue({ data: rulesData, error: null });
          return inner;
        });
      }
      return chain;
    },
    rpc: mockRpc,
  },
}));

vi.mock("@/lib/tenant", () => ({
  strictWithTenant: (query: unknown) => query,
  tenantPayload: (tid: string) => ({ tenant_id: tid }),
}));

const { processScoring, addScore, getPatientScore } = await import("@/lib/scoring");

describe("scoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patientId がない場合はスキップすること", async () => {
    await processScoring("follow", { tenantId: "t1" });
    expect(mockInsertFn).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("processScoring がイベントに一致するルールでRPCを呼ぶこと", async () => {
    await processScoring("reservation_made", {
      tenantId: "t1",
      patientId: "P001",
    });

    // increment_lead_score RPCが呼ばれたことを確認
    expect(mockRpc).toHaveBeenCalledWith("increment_lead_score", {
      p_patient_id: "P001",
      p_delta: 50,
      p_tenant_id: "t1",
    });
  });

  it("tenantId がない場合はスキップすること", async () => {
    await processScoring("follow", { patientId: "P001" });
    expect(mockInsertFn).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("addScore がpatient_scoresにINSERTしRPCを呼ぶこと", async () => {
    await addScore(
      { patientId: "P001", scoreChange: 20, reason: "手動加点" },
      "t1",
    );

    // patient_scores へのinsert
    expect(mockInsertFn).toHaveBeenCalled();
    // RPC呼び出し
    expect(mockRpc).toHaveBeenCalledWith("increment_lead_score", {
      p_patient_id: "P001",
      p_delta: 20,
      p_tenant_id: "t1",
    });
  });

  it("addScore でscoringRuleIdが指定された場合にinsertに含まれること", async () => {
    await addScore(
      { patientId: "P001", scoreChange: 10, scoringRuleId: "r1", reason: "ルール適用" },
      "t1",
    );

    expect(mockInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ scoring_rule_id: "r1" }),
    );
  });

  it("getPatientScore が患者のスコアを返すこと", async () => {
    // makeChainのデフォルトで lead_score: 30 が返る
    const score = await getPatientScore("P001", "t1");
    expect(score).toBe(30);
  });
});

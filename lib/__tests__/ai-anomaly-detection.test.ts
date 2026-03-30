import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  detectAnomaly,
  runAnomalyDetection,
  checkSLABreaches,
  type DailyMetric,
} from "@/lib/ai-anomaly-detection";

// ---------------------------------------------------------------------------
// ヘルパー: 連続する日次データを生成
// ---------------------------------------------------------------------------

function makeDailyMetrics(values: number[], startDate = "2026-03-20"): DailyMetric[] {
  const start = new Date(startDate);
  return values.map((value, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().slice(0, 10), value };
  });
}

// ---------------------------------------------------------------------------
// detectAnomaly
// ---------------------------------------------------------------------------

describe("detectAnomaly", () => {
  it("正常範囲内なら null を返す", () => {
    // 過去7日: [10,10,10,10,10,10,10], 当日: 10 → 偏差0%
    const data = makeDailyMetrics([10, 10, 10, 10, 10, 10, 10, 10]);
    const result = detectAnomaly("test_metric", data);
    expect(result).toBeNull();
  });

  it("warning 閾値（30%）を超過した場合", () => {
    // 過去: [100,100,100,100,100,100,100], 当日: 140 → 偏差40%
    const data = makeDailyMetrics([100, 100, 100, 100, 100, 100, 100, 140]);
    const result = detectAnomaly("test_metric", data);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("warning");
    expect(result!.isAnomaly).toBe(true);
    expect(result!.deviation).toBe(40);
  });

  it("critical 閾値（50%）を超過した場合", () => {
    // 過去: [100,100,100,100,100,100,100], 当日: 160 → 偏差60%
    const data = makeDailyMetrics([100, 100, 100, 100, 100, 100, 100, 160]);
    const result = detectAnomaly("test_metric", data);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("critical");
    expect(result!.deviation).toBe(60);
  });

  it("baseline=0 で current>0 なら warning を返す", () => {
    // 過去: [0,0,0], 当日: 5
    const data = makeDailyMetrics([0, 0, 0, 5]);
    const result = detectAnomaly("test_metric", data);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("warning");
    expect(result!.baselineValue).toBe(0);
    expect(result!.currentValue).toBe(5);
    expect(result!.deviation).toBe(100);
  });

  it("baseline=0 で current=0 なら null（異常なし）", () => {
    const data = makeDailyMetrics([0, 0, 0, 0]);
    const result = detectAnomaly("test_metric", data);
    expect(result).toBeNull();
  });

  it("データ不足（1日分）の場合は null を返す", () => {
    const data = makeDailyMetrics([100]);
    const result = detectAnomaly("test_metric", data);
    expect(result).toBeNull();
  });

  it("カスタム閾値を指定できる", () => {
    // 過去: [100,100], 当日: 120 → 偏差20%
    // デフォルトなら正常だが、warningPct=15 なら warning
    const data = makeDailyMetrics([100, 100, 120]);
    const result = detectAnomaly("test_metric", data, { warningPct: 15 });
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("warning");
  });

  it("減少方向の異常も検出する", () => {
    // 過去: [100,100,100,100,100,100,100], 当日: 40 → 偏差60%
    const data = makeDailyMetrics([100, 100, 100, 100, 100, 100, 100, 40]);
    const result = detectAnomaly("test_metric", data);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("critical");
    expect(result!.currentValue).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// runAnomalyDetection
// ---------------------------------------------------------------------------

describe("runAnomalyDetection", () => {
  it("複数指標を一括チェックし異常のみ返す", () => {
    const metrics = {
      // 正常
      normal_metric: makeDailyMetrics([10, 10, 10, 10]),
      // warning
      warn_metric: makeDailyMetrics([100, 100, 100, 140]),
      // critical
      critical_metric: makeDailyMetrics([100, 100, 100, 160]),
    };

    const results = runAnomalyDetection(metrics);

    // 正常指標は含まれない
    expect(results.length).toBe(2);
    expect(results.map((r) => r.metricName)).toContain("warn_metric");
    expect(results.map((r) => r.metricName)).toContain("critical_metric");
  });

  it("critical が warning より先にソートされる", () => {
    const metrics = {
      warn_metric: makeDailyMetrics([100, 100, 100, 140]),
      critical_metric: makeDailyMetrics([100, 100, 100, 160]),
    };

    const results = runAnomalyDetection(metrics);

    expect(results[0].severity).toBe("critical");
    expect(results[1].severity).toBe("warning");
  });

  it("全て正常なら空配列を返す", () => {
    const metrics = {
      m1: makeDailyMetrics([10, 10, 10, 10]),
      m2: makeDailyMetrics([20, 20, 20, 20]),
    };

    const results = runAnomalyDetection(metrics);
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// checkSLABreaches
// ---------------------------------------------------------------------------

describe("checkSLABreaches", () => {
  // Date.now を固定して安定したテスト
  const NOW = new Date("2026-03-30T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("閾値超過のタスクを検出する（warning）", () => {
    // 90分前に作成されたタスク → warning（デフォルト60分）
    const tasks = [
      {
        id: "t1",
        workflow_type: "ai_reply",
        status: "pending",
        handoff_status: "pending",
        created_at: new Date(NOW - 90 * 60000).toISOString(),
      },
    ];

    const results = checkSLABreaches(tasks);

    expect(results.length).toBe(1);
    expect(results[0].taskId).toBe("t1");
    expect(results[0].severity).toBe("warning");
    expect(results[0].staleDurationMin).toBe(90);
  });

  it("閾値超過のタスクを検出する（critical）", () => {
    // 300分前に作成されたタスク → critical（デフォルト240分）
    const tasks = [
      {
        id: "t1",
        workflow_type: "ai_reply",
        status: "pending",
        handoff_status: "pending",
        created_at: new Date(NOW - 300 * 60000).toISOString(),
      },
    ];

    const results = checkSLABreaches(tasks);

    expect(results.length).toBe(1);
    expect(results[0].severity).toBe("critical");
  });

  it("completed タスクは除外する", () => {
    const tasks = [
      {
        id: "t1",
        workflow_type: "ai_reply",
        status: "completed",
        handoff_status: "pending",
        created_at: new Date(NOW - 300 * 60000).toISOString(),
      },
    ];

    const results = checkSLABreaches(tasks);
    expect(results).toEqual([]);
  });

  it("skipped タスクは除外する", () => {
    const tasks = [
      {
        id: "t1",
        workflow_type: "ai_reply",
        status: "skipped",
        handoff_status: "pending",
        created_at: new Date(NOW - 300 * 60000).toISOString(),
      },
    ];

    const results = checkSLABreaches(tasks);
    expect(results).toEqual([]);
  });

  it("handoff_status が pending 以外は除外する", () => {
    const tasks = [
      {
        id: "t1",
        workflow_type: "ai_reply",
        status: "pending",
        handoff_status: "resolved",
        created_at: new Date(NOW - 300 * 60000).toISOString(),
      },
    ];

    const results = checkSLABreaches(tasks);
    expect(results).toEqual([]);
  });

  it("閾値未満のタスクは除外する", () => {
    // 30分前（デフォルトwarning=60分未満）
    const tasks = [
      {
        id: "t1",
        workflow_type: "ai_reply",
        status: "pending",
        handoff_status: "pending",
        created_at: new Date(NOW - 30 * 60000).toISOString(),
      },
    ];

    const results = checkSLABreaches(tasks);
    expect(results).toEqual([]);
  });

  it("critical → warning の順でソートされる", () => {
    const tasks = [
      {
        id: "t1",
        workflow_type: "ai_reply",
        status: "pending",
        handoff_status: "pending",
        created_at: new Date(NOW - 90 * 60000).toISOString(), // warning
      },
      {
        id: "t2",
        workflow_type: "ai_reply",
        status: "pending",
        handoff_status: "pending",
        created_at: new Date(NOW - 300 * 60000).toISOString(), // critical
      },
    ];

    const results = checkSLABreaches(tasks);
    expect(results[0].severity).toBe("critical");
    expect(results[1].severity).toBe("warning");
  });

  it("カスタム閾値を指定できる", () => {
    // 20分前のタスク → warningMin=10 なら warning
    const tasks = [
      {
        id: "t1",
        workflow_type: "ai_reply",
        status: "pending",
        handoff_status: "pending",
        created_at: new Date(NOW - 20 * 60000).toISOString(),
      },
    ];

    const results = checkSLABreaches(tasks, {
      warningMin: 10,
      criticalMin: 30,
    });

    expect(results.length).toBe(1);
    expect(results[0].severity).toBe("warning");
  });
});

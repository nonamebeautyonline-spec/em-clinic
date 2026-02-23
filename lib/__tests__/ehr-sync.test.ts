// lib/__tests__/ehr-sync.test.ts
// 電子カルテ同期エンジンのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: [], error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn(async () => null),
}));

// アダプターモック（classとしてnew可能にする）
vi.mock("@/lib/ehr/orca-adapter", () => {
  const OrcaAdapter = function(this: any, config: any) {
    this.provider = "orca";
    this.config = config;
    this.testConnection = vi.fn(async () => ({ ok: true, message: "OK" }));
    this.getPatient = vi.fn(async () => null);
    this.searchPatients = vi.fn(async () => []);
    this.pushPatient = vi.fn(async () => ({ externalId: "EXT-1" }));
    this.getKarteList = vi.fn(async () => []);
    this.pushKarte = vi.fn(async () => {});
  } as any;
  return { OrcaAdapter };
});

vi.mock("@/lib/ehr/csv-adapter", () => {
  const CsvAdapter = function(this: any) {
    this.provider = "csv";
    this.testConnection = vi.fn(async () => ({ ok: true, message: "OK" }));
    this.getPatient = vi.fn(async () => null);
    this.searchPatients = vi.fn(async () => []);
    this.pushPatient = vi.fn(async () => ({ externalId: "CSV-1" }));
    this.getKarteList = vi.fn(async () => []);
    this.pushKarte = vi.fn(async () => {});
  } as any;
  return { CsvAdapter };
});

vi.mock("@/lib/ehr/fhir-adapter", () => {
  const FhirAdapter = function(this: any, config: any) {
    this.provider = "fhir";
    this.config = config;
    this.testConnection = vi.fn(async () => ({ ok: true, message: "OK" }));
    this.getPatient = vi.fn(async () => null);
    this.searchPatients = vi.fn(async () => []);
    this.pushPatient = vi.fn(async () => ({ externalId: "FHIR-1" }));
    this.getKarteList = vi.fn(async () => []);
    this.pushKarte = vi.fn(async () => {});
  } as any;
  return { FhirAdapter };
});

// mapper モック
vi.mock("@/lib/ehr/mapper", () => ({
  toEhrPatient: vi.fn((patient: any, intake: any) => ({
    externalId: "",
    name: patient?.name || "テスト太郎",
  })),
  fromEhrPatient: vi.fn((ehrPatient: any) => ({
    name: ehrPatient?.name || "外部太郎",
  })),
  toEhrKarte: vi.fn((intake: any, patient: any) => ({
    patientExternalId: "",
    date: intake?.created_at || "2026-01-01",
    content: intake?.note || "テストカルテ",
  })),
  fromEhrKarte: vi.fn((karte: any) => ({
    note: karte?.content || "インポートカルテ",
  })),
}));

import {
  createAdapter,
  pushPatient,
  pullPatient,
  pushKarte,
  pullKarte,
  syncBatch,
  getSyncLogs,
} from "@/lib/ehr/sync";

import { getSetting } from "@/lib/settings";

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
});

// ============================================================
// createAdapter
// ============================================================
describe("createAdapter", () => {
  it("設定なし → null", async () => {
    vi.mocked(getSetting).mockResolvedValue(null);

    const adapter = await createAdapter("tenant-1");
    expect(adapter).toBeNull();
  });

  it("orca プロバイダ → OrcaAdapter を返す", async () => {
    vi.mocked(getSetting).mockResolvedValue("orca");

    const adapter = await createAdapter("tenant-1");
    expect(adapter).not.toBeNull();
    expect(adapter!.provider).toBe("orca");
  });

  it("csv プロバイダ → CsvAdapter を返す", async () => {
    vi.mocked(getSetting).mockResolvedValue("csv");

    const adapter = await createAdapter("tenant-1");
    expect(adapter).not.toBeNull();
    expect(adapter!.provider).toBe("csv");
  });

  it("fhir プロバイダ → FhirAdapter を返す", async () => {
    vi.mocked(getSetting).mockResolvedValue("fhir");

    const adapter = await createAdapter("tenant-1");
    expect(adapter).not.toBeNull();
    expect(adapter!.provider).toBe("fhir");
  });

  it("未知のプロバイダ → null", async () => {
    vi.mocked(getSetting).mockResolvedValue("unknown_provider");

    const adapter = await createAdapter("tenant-1");
    expect(adapter).toBeNull();
  });
});

// ============================================================
// pushPatient
// ============================================================
describe("pushPatient", () => {
  const mockAdapter: any = {
    provider: "orca",
    pushPatient: vi.fn(async () => ({ externalId: "EXT-100" })),
  };

  it("正常: 患者を外部カルテにプッシュ", async () => {
    // patients テーブル
    const patientChain = createChain({
      data: { patient_id: "P-1", name: "テスト太郎" },
      error: null,
    });
    tableChains["patients"] = patientChain;

    // intake テーブル
    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    // ehr_patient_mappings（getMapping）
    const mappingChain = createChain({ data: null, error: null });
    tableChains["ehr_patient_mappings"] = mappingChain;

    // ehr_sync_logs
    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pushPatient("P-1", mockAdapter, "tenant-1");

    expect(result.status).toBe("success");
    expect(result.direction).toBe("push");
    expect(result.resourceType).toBe("patient");
    expect(mockAdapter.pushPatient).toHaveBeenCalled();
  });

  it("患者なし → skipped", async () => {
    const patientChain = createChain({ data: null, error: null });
    tableChains["patients"] = patientChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pushPatient("P-notfound", mockAdapter, "tenant-1");

    expect(result.status).toBe("skipped");
    expect(result.detail).toContain("患者が見つかりません");
  });

  it("既存マッピングがある場合は外部IDを設定", async () => {
    const patientChain = createChain({
      data: { patient_id: "P-1", name: "テスト太郎" },
      error: null,
    });
    tableChains["patients"] = patientChain;

    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    // 既存マッピング
    const mappingChain = createChain({
      data: { external_id: "EXT-EXIST" },
      error: null,
    });
    tableChains["ehr_patient_mappings"] = mappingChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pushPatient("P-1", mockAdapter, "tenant-1");

    expect(result.status).toBe("success");
  });

  it("adapter.pushPatient エラー → error ステータス", async () => {
    const patientChain = createChain({
      data: { patient_id: "P-1", name: "テスト太郎" },
      error: null,
    });
    tableChains["patients"] = patientChain;

    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    const mappingChain = createChain({ data: null, error: null });
    tableChains["ehr_patient_mappings"] = mappingChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const errorAdapter: any = {
      provider: "orca",
      pushPatient: vi.fn(async () => { throw new Error("接続失敗"); }),
    };

    const result = await pushPatient("P-1", errorAdapter, "tenant-1");

    expect(result.status).toBe("error");
    expect(result.detail).toContain("接続失敗");
  });
});

// ============================================================
// pullPatient
// ============================================================
describe("pullPatient", () => {
  it("正常: 外部カルテから患者をプル（既存マッピング）", async () => {
    const mockAdapter: any = {
      provider: "orca",
      getPatient: vi.fn(async () => ({
        externalId: "EXT-1",
        name: "外部太郎",
      })),
    };

    // getMappingByExternalId
    const mappingChain = createChain({
      data: { patient_id: "P-1" },
      error: null,
    });
    tableChains["ehr_patient_mappings"] = mappingChain;

    // patients.update
    const patientChain = createChain({ error: null });
    tableChains["patients"] = patientChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pullPatient("EXT-1", mockAdapter, "tenant-1");

    expect(result.status).toBe("success");
    expect(result.detail).toContain("既存患者データを更新");
    expect(patientChain.update).toHaveBeenCalled();
  });

  it("マッピングなし → 新規患者として登録", async () => {
    const mockAdapter: any = {
      provider: "orca",
      getPatient: vi.fn(async () => ({
        externalId: "EXT-NEW",
        name: "新規太郎",
      })),
    };

    // マッピングなし
    const mappingChain = createChain({ data: null, error: null });
    tableChains["ehr_patient_mappings"] = mappingChain;

    // patients.insert
    const patientChain = createChain({ error: null });
    tableChains["patients"] = patientChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pullPatient("EXT-NEW", mockAdapter, "tenant-1");

    expect(result.status).toBe("success");
    expect(result.detail).toContain("新規患者として登録");
    expect(patientChain.insert).toHaveBeenCalled();
  });

  it("外部カルテに患者なし → skipped", async () => {
    const mockAdapter: any = {
      provider: "orca",
      getPatient: vi.fn(async () => null),
    };

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pullPatient("EXT-NOTFOUND", mockAdapter, "tenant-1");

    expect(result.status).toBe("skipped");
    expect(result.detail).toContain("外部カルテに患者が見つかりません");
  });

  it("adapter.getPatient エラー → error", async () => {
    const mockAdapter: any = {
      provider: "orca",
      getPatient: vi.fn(async () => { throw new Error("タイムアウト"); }),
    };

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pullPatient("EXT-1", mockAdapter, "tenant-1");

    expect(result.status).toBe("error");
    expect(result.detail).toContain("タイムアウト");
  });
});

// ============================================================
// pushKarte
// ============================================================
describe("pushKarte", () => {
  it("正常: カルテを外部にプッシュ", async () => {
    const mockAdapter: any = {
      provider: "orca",
      pushKarte: vi.fn(async () => {}),
    };

    // patients
    const patientChain = createChain({
      data: { patient_id: "P-1", name: "テスト太郎" },
      error: null,
    });
    tableChains["patients"] = patientChain;

    // ehr_patient_mappings（getMapping）
    const mappingChain = createChain({
      data: { external_id: "EXT-1" },
      error: null,
    });
    tableChains["ehr_patient_mappings"] = mappingChain;

    // intake（noteあり）
    const intakeChain = createChain({
      data: [
        { id: 1, note: "カルテ1", created_at: "2026-01-01" },
        { id: 2, note: "カルテ2", created_at: "2026-01-02" },
      ],
      error: null,
    });
    tableChains["intake"] = intakeChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pushKarte("P-1", mockAdapter, "tenant-1");

    expect(result.status).toBe("success");
    expect(result.detail).toContain("カルテ2件を送信しました");
    expect(mockAdapter.pushKarte).toHaveBeenCalledTimes(2);
  });

  it("患者なし → skipped", async () => {
    const mockAdapter: any = { provider: "orca" };

    const patientChain = createChain({ data: null, error: null });
    tableChains["patients"] = patientChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pushKarte("P-notfound", mockAdapter, "tenant-1");

    expect(result.status).toBe("skipped");
    expect(result.detail).toContain("患者が見つかりません");
  });

  it("外部IDマッピングなし → skipped", async () => {
    const mockAdapter: any = { provider: "orca" };

    const patientChain = createChain({
      data: { patient_id: "P-1", name: "テスト太郎" },
      error: null,
    });
    tableChains["patients"] = patientChain;

    const mappingChain = createChain({ data: null, error: null });
    tableChains["ehr_patient_mappings"] = mappingChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pushKarte("P-1", mockAdapter, "tenant-1");

    expect(result.status).toBe("skipped");
    expect(result.detail).toContain("外部IDマッピングがありません");
  });

  it("pushKarte エラー → error", async () => {
    const mockAdapter: any = {
      provider: "orca",
      pushKarte: vi.fn(async () => { throw new Error("送信失敗"); }),
    };

    const patientChain = createChain({
      data: { patient_id: "P-1", name: "テスト太郎" },
      error: null,
    });
    tableChains["patients"] = patientChain;

    const mappingChain = createChain({
      data: { external_id: "EXT-1" },
      error: null,
    });
    tableChains["ehr_patient_mappings"] = mappingChain;

    const intakeChain = createChain({
      data: [{ id: 1, note: "カルテ", created_at: "2026-01-01" }],
      error: null,
    });
    tableChains["intake"] = intakeChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pushKarte("P-1", mockAdapter, "tenant-1");

    expect(result.status).toBe("error");
    expect(result.detail).toContain("送信失敗");
  });
});

// ============================================================
// pullKarte
// ============================================================
describe("pullKarte", () => {
  it("正常: カルテをインポート", async () => {
    const mockAdapter: any = {
      provider: "orca",
      getKarteList: vi.fn(async () => [
        { externalId: "K-1", patientExternalId: "EXT-1", date: "2026-01-01", content: "カルテ内容" },
      ]),
    };

    // getMapping
    const mappingChain = createChain({
      data: { external_id: "EXT-1" },
      error: null,
    });
    tableChains["ehr_patient_mappings"] = mappingChain;

    // 重複チェック: なし
    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pullKarte("P-1", mockAdapter, "tenant-1");

    expect(result.status).toBe("success");
    expect(result.detail).toContain("カルテ1件をインポートしました");
  });

  it("外部IDマッピングなし → skipped", async () => {
    const mockAdapter: any = { provider: "orca" };

    const mappingChain = createChain({ data: null, error: null });
    tableChains["ehr_patient_mappings"] = mappingChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pullKarte("P-1", mockAdapter, "tenant-1");

    expect(result.status).toBe("skipped");
    expect(result.detail).toContain("外部IDマッピングがありません");
  });

  it("外部カルテにデータなし → skipped", async () => {
    const mockAdapter: any = {
      provider: "orca",
      getKarteList: vi.fn(async () => []),
    };

    const mappingChain = createChain({
      data: { external_id: "EXT-1" },
      error: null,
    });
    tableChains["ehr_patient_mappings"] = mappingChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pullKarte("P-1", mockAdapter, "tenant-1");

    expect(result.status).toBe("skipped");
    expect(result.detail).toContain("外部カルテにデータがありません");
  });

  it("getKarteList エラー → error", async () => {
    const mockAdapter: any = {
      provider: "orca",
      getKarteList: vi.fn(async () => { throw new Error("取得失敗"); }),
    };

    const mappingChain = createChain({
      data: { external_id: "EXT-1" },
      error: null,
    });
    tableChains["ehr_patient_mappings"] = mappingChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const result = await pullKarte("P-1", mockAdapter, "tenant-1");

    expect(result.status).toBe("error");
    expect(result.detail).toContain("取得失敗");
  });
});

// ============================================================
// syncBatch
// ============================================================
describe("syncBatch", () => {
  it("5件 push → 1バッチで処理", async () => {
    const mockAdapter: any = {
      provider: "orca",
      pushPatient: vi.fn(async () => ({ externalId: "EXT-1" })),
    };

    // patients
    const patientChain = createChain({
      data: { patient_id: "P-1", name: "テスト太郎" },
      error: null,
    });
    tableChains["patients"] = patientChain;

    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    const mappingChain = createChain({ data: null, error: null });
    tableChains["ehr_patient_mappings"] = mappingChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const ids = ["P-1", "P-2", "P-3", "P-4", "P-5"];
    const results = await syncBatch(ids, "push", mockAdapter, "tenant-1");

    expect(results.length).toBe(5);
  });

  it("60件 push → 50件ずつ2バッチ", async () => {
    const mockAdapter: any = {
      provider: "orca",
      pushPatient: vi.fn(async () => ({ externalId: "EXT-1" })),
    };

    const patientChain = createChain({
      data: { patient_id: "P-1", name: "テスト太郎" },
      error: null,
    });
    tableChains["patients"] = patientChain;

    const intakeChain = createChain({ data: null, error: null });
    tableChains["intake"] = intakeChain;

    const mappingChain = createChain({ data: null, error: null });
    tableChains["ehr_patient_mappings"] = mappingChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const ids = Array.from({ length: 60 }, (_, i) => `P-${i}`);
    const results = await syncBatch(ids, "push", mockAdapter, "tenant-1");

    expect(results.length).toBe(60);
  });

  it("pull 方向: マッピングなし → skipped", async () => {
    const mockAdapter: any = {
      provider: "orca",
      getPatient: vi.fn(async () => null),
    };

    // マッピングなし
    const mappingChain = createChain({ data: null, error: null });
    tableChains["ehr_patient_mappings"] = mappingChain;

    const logChain = createChain({ error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const results = await syncBatch(["P-1"], "pull", mockAdapter, "tenant-1");

    expect(results.length).toBe(1);
    expect(results[0].status).toBe("skipped");
    expect(results[0].detail).toContain("外部IDマッピングなし");
  });

  it("空配列 → 結果も空", async () => {
    const mockAdapter: any = { provider: "orca" };

    const results = await syncBatch([], "push", mockAdapter, "tenant-1");
    expect(results).toEqual([]);
  });
});

// ============================================================
// getSyncLogs
// ============================================================
describe("getSyncLogs", () => {
  it("正常: ログを取得", async () => {
    const logChain = createChain({
      data: [
        { id: 1, provider: "orca", direction: "push", status: "success" },
        { id: 2, provider: "orca", direction: "pull", status: "error" },
      ],
      error: null,
    });
    tableChains["ehr_sync_logs"] = logChain;

    const logs = await getSyncLogs("tenant-1");

    expect(logs.length).toBe(2);
    expect(logChain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(logChain.limit).toHaveBeenCalledWith(50);
  });

  it("limit 指定", async () => {
    const logChain = createChain({ data: [], error: null });
    tableChains["ehr_sync_logs"] = logChain;

    await getSyncLogs("tenant-1", 10);

    expect(logChain.limit).toHaveBeenCalledWith(10);
  });

  it("tenantId ありの場合 eq フィルターが適用", async () => {
    const logChain = createChain({ data: [], error: null });
    tableChains["ehr_sync_logs"] = logChain;

    await getSyncLogs("tenant-1");

    expect(logChain.eq).toHaveBeenCalledWith("tenant_id", "tenant-1");
  });

  it("tenantId なしの場合 eq フィルターなし", async () => {
    const logChain = createChain({ data: [], error: null });
    tableChains["ehr_sync_logs"] = logChain;

    await getSyncLogs();

    expect(logChain.eq).not.toHaveBeenCalledWith("tenant_id", expect.any(String));
  });

  it("data が null の場合は空配列を返す", async () => {
    const logChain = createChain({ data: null, error: null });
    tableChains["ehr_sync_logs"] = logChain;

    const logs = await getSyncLogs();
    expect(logs).toEqual([]);
  });
});

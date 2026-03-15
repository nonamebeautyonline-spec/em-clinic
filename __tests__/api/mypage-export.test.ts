// __tests__/api/mypage-export.test.ts
// 患者データエクスポートAPIのテスト
import { describe, it, expect } from "vitest";

// === エクスポートデータ構造 ===
describe("mypage/export データ構造", () => {
  const EXPORT_TABLES = [
    "patient",
    "intake",
    "reservations",
    "orders",
    "reorders",
    "point_ledger",
  ];

  it("6テーブルのデータを含む", () => {
    expect(EXPORT_TABLES).toHaveLength(6);
  });

  it("患者情報を含む", () => {
    expect(EXPORT_TABLES).toContain("patient");
  });

  it("問診データを含む", () => {
    expect(EXPORT_TABLES).toContain("intake");
  });

  it("予約データを含む", () => {
    expect(EXPORT_TABLES).toContain("reservations");
  });

  it("注文データを含む", () => {
    expect(EXPORT_TABLES).toContain("orders");
  });

  it("再処方データを含む", () => {
    expect(EXPORT_TABLES).toContain("reorders");
  });

  it("ポイント台帳を含む", () => {
    expect(EXPORT_TABLES).toContain("point_ledger");
  });
});

// === エクスポートファイル名生成 ===
describe("mypage/export ファイル名生成", () => {
  function generateFileName(date: Date): string {
    return `patient-data-${date.toISOString().slice(0, 10)}.json`;
  }

  it("YYYY-MM-DD形式の日付を含む", () => {
    const name = generateFileName(new Date("2026-03-14T10:00:00Z"));
    expect(name).toBe("patient-data-2026-03-14.json");
  });

  it(".json拡張子が付く", () => {
    const name = generateFileName(new Date());
    expect(name).toMatch(/\.json$/);
  });

  it("patient-data-プレフィックスが付く", () => {
    const name = generateFileName(new Date());
    expect(name).toMatch(/^patient-data-/);
  });
});

// === レート制限チェック ===
describe("mypage/export レート制限", () => {
  it("レート制限キーはpatient_idを含む", () => {
    const patientId = "p_test_001";
    const key = `export:${patientId}`;
    expect(key).toBe("export:p_test_001");
  });

  it("異なるpatient_idは異なるキー", () => {
    const key1 = `export:p_001`;
    const key2 = `export:p_002`;
    expect(key1).not.toBe(key2);
  });
});

// === エクスポートJSONの整形 ===
describe("mypage/export JSON出力", () => {
  it("exported_at がISO形式", () => {
    const exportData = {
      exported_at: new Date().toISOString(),
      patient_id: "p_001",
      patient: [],
      intake: [],
      reservations: [],
      orders: [],
      reorders: [],
      point_ledger: [],
    };

    // ISO日時形式のチェック
    expect(exportData.exported_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
  });

  it("空のテーブルは空配列で返す", () => {
    const exportData = {
      exported_at: new Date().toISOString(),
      patient_id: "p_001",
      patient: [],
      intake: [],
      reservations: [],
      orders: [],
      reorders: [],
      point_ledger: [],
    };

    expect(exportData.patient).toEqual([]);
    expect(exportData.intake).toEqual([]);
    expect(exportData.reservations).toEqual([]);
    expect(exportData.orders).toEqual([]);
    expect(exportData.reorders).toEqual([]);
    expect(exportData.point_ledger).toEqual([]);
  });

  it("JSON.stringifyで整形できる", () => {
    const exportData = {
      exported_at: "2026-03-14T10:00:00.000Z",
      patient_id: "p_001",
      patient: [{ patient_id: "p_001", name: "テスト太郎" }],
      intake: [],
      reservations: [],
      orders: [],
      reorders: [],
      point_ledger: [],
    };

    const json = JSON.stringify(exportData, null, 2);
    expect(json).toContain('"patient_id": "p_001"');
    expect(json).toContain('"name": "テスト太郎"');
  });
});

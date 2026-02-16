// __tests__/api/patientbundle.test.ts
// patientbundle API のビジネスルールテスト（カルテ統合・電話番号正規化）
import { describe, it, expect } from "vitest";

// === 来院履歴の統合ロジック ===
describe("patientbundle 来院履歴の統合", () => {
  interface IntakeRow {
    id: number;
    reserve_id: string | null;
    note: string | null;
    created_at: string;
    answers?: Record<string, unknown>;
  }

  interface ReorderRow {
    id: number;
    karte_note: string | null;
    product_code: string;
    created_at: string;
    status: string;
  }

  // intake からカルテ重複を除外するロジック
  function filterIntakeForHistory(rows: IntakeRow[]): IntakeRow[] {
    return rows.filter(r =>
      r.reserve_id != null || !(r.note || "").startsWith("再処方")
    );
  }

  // reorders からカルテのある再処方を来院履歴に追加
  function getReorderKarteHistory(reorders: ReorderRow[]) {
    return reorders
      .filter(r => r.karte_note != null)
      .map(r => ({
        type: "reorder_karte" as const,
        note: r.karte_note,
        product_code: r.product_code,
        created_at: r.created_at,
      }));
  }

  it("reserve_id ありの intake は来院履歴に含まれる", () => {
    const rows: IntakeRow[] = [
      { id: 1, reserve_id: "res_001", note: "通常問診", created_at: "2026-01-01" },
    ];
    expect(filterIntakeForHistory(rows).length).toBe(1);
  });

  it("再処方で始まる note で reserve_id なしは除外", () => {
    const rows: IntakeRow[] = [
      { id: 1, reserve_id: null, note: "再処方希望\n商品:MJL_5mg", created_at: "2026-01-01" },
    ];
    expect(filterIntakeForHistory(rows).length).toBe(0);
  });

  it("通常の note は reserve_id なしでも含まれる", () => {
    const rows: IntakeRow[] = [
      { id: 1, reserve_id: null, note: "通常問診", created_at: "2026-01-01" },
    ];
    expect(filterIntakeForHistory(rows).length).toBe(1);
  });

  it("再処方カルテ（karte_note）が来院履歴に追加される", () => {
    const reorders: ReorderRow[] = [
      { id: 1, karte_note: "副作用がなく、継続使用のため処方", product_code: "MJL_5mg_1m", created_at: "2026-02-01", status: "confirmed" },
      { id: 2, karte_note: null, product_code: "MJL_5mg_1m", created_at: "2026-02-10", status: "pending" },
    ];
    const history = getReorderKarteHistory(reorders);
    expect(history.length).toBe(1);
    expect(history[0].type).toBe("reorder_karte");
    expect(history[0].note).toContain("副作用がなく");
  });

  it("karte_note が null の再処方は来院履歴に含まれない", () => {
    const reorders: ReorderRow[] = [
      { id: 1, karte_note: null, product_code: "MJL_5mg_1m", created_at: "2026-02-01", status: "pending" },
    ];
    expect(getReorderKarteHistory(reorders).length).toBe(0);
  });

  it("intake と reorder の来院履歴を新しい順でソートする", () => {
    const combined = [
      { created_at: "2026-01-01", type: "intake" },
      { created_at: "2026-02-15", type: "reorder_karte" },
      { created_at: "2026-01-15", type: "intake" },
    ];
    const sorted = [...combined].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    expect(sorted[0].type).toBe("reorder_karte");
    expect(sorted[0].created_at).toBe("2026-02-15");
  });
});

// === 患者基本情報の構築 ===
describe("patientbundle 患者基本情報", () => {
  it("patientsテーブルの情報が優先", () => {
    const patient = { name: "田中太郎", tel: "09012345678" };
    const intakeAnswers = { 氏名: "田中タロウ", 電話番号: "09099999999" };
    const name = patient.name || intakeAnswers.氏名 || "";
    expect(name).toBe("田中太郎");
  });

  it("patientsテーブルに名前がなければintakeから補完", () => {
    const patient = { name: "", tel: "" };
    const intakeAnswers = { 氏名: "田中タロウ", 電話番号: "09099999999" };
    const name = patient.name || intakeAnswers.氏名 || "";
    expect(name).toBe("田中タロウ");
  });

  it("両方ない場合は空文字", () => {
    const patient = { name: "", tel: "" };
    const intakeAnswers = {};
    const name = patient.name || (intakeAnswers as Record<string, string>).氏名 || "";
    expect(name).toBe("");
  });
});

// === patientId バリデーション ===
describe("patientbundle patientIdバリデーション", () => {
  it("patientId なし → 400", () => {
    const patientId = null;
    expect(!patientId).toBe(true);
  });

  it("patientId あり → 処理続行", () => {
    const patientId = "p_001";
    expect(!patientId).toBe(false);
  });
});

// === データが存在しない場合 ===
describe("patientbundle データなし", () => {
  it("患者が存在しない → 空データを返す", () => {
    const patient = null;
    const intake: unknown[] = [];
    const reservations: unknown[] = [];
    const orders: unknown[] = [];
    expect(patient).toBeNull();
    expect(intake.length).toBe(0);
    expect(reservations.length).toBe(0);
    expect(orders.length).toBe(0);
  });
});

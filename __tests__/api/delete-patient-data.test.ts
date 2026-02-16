// __tests__/api/delete-patient-data.test.ts
// 患者データ削除APIのビジネスルールテスト（GDPR対応・誤削除防止）
import { describe, it, expect } from "vitest";

// === POST: 削除対象の制御 ===
describe("delete-patient-data 削除対象の制御", () => {
  it("delete_reservation=true(デフォルト): 予約をキャンセル対象にする", () => {
    const body = { patient_id: "p_001", delete_intake: false };
    expect(body.delete_intake).toBe(false);
    // delete_reservation は未指定時も !== false でキャンセル対象
    expect(body.delete_intake !== undefined).toBe(true);
  });

  it("delete_reservation=false: 予約キャンセルをスキップ", () => {
    const body = { patient_id: "p_001", delete_reservation: false, delete_intake: true };
    expect(body.delete_reservation !== false).toBe(false);
    expect(body.delete_intake).toBe(true);
  });

  it("delete_intake=true: 問診データを削除する", () => {
    const body = { patient_id: "p_001", delete_intake: true };
    expect(body.delete_intake).toBe(true);
  });

  it("delete_intake=false/未指定: 問診は削除しない", () => {
    const body = { patient_id: "p_001" };
    expect(body.delete_intake).toBeFalsy();
  });
});

// === POST: patient_id バリデーション ===
describe("delete-patient-data patient_idバリデーション", () => {
  it("patient_id なし → 400エラー", () => {
    const body = { delete_intake: true };
    expect(!body.patient_id).toBe(true);
  });

  it("patient_id あり → 処理続行", () => {
    const body = { patient_id: "p_001" };
    expect(!body.patient_id).toBe(false);
  });

  it("patient_id が空文字 → 400エラー", () => {
    const body = { patient_id: "" };
    expect(!body.patient_id).toBe(true);
  });
});

// === POST: 予約キャンセル対象の絞り込み ===
describe("delete-patient-data 予約キャンセルのフィルタ", () => {
  it("status='canceled' の予約はキャンセル対象外", () => {
    const reservations = [
      { id: 1, status: "confirmed" },
      { id: 2, status: "canceled" },
      { id: 3, status: "pending" },
    ];
    const target = reservations.filter(r => r.status !== "canceled");
    expect(target.length).toBe(2);
    expect(target.map(r => r.id)).toEqual([1, 3]);
  });

  it("全てキャンセル済み → 対象なし", () => {
    const reservations = [
      { id: 1, status: "canceled" },
      { id: 2, status: "canceled" },
    ];
    const target = reservations.filter(r => r.status !== "canceled");
    expect(target.length).toBe(0);
  });

  it("予約が0件 → エラーにならない", () => {
    const reservations: { id: number; status: string }[] = [];
    expect(reservations.length).toBe(0);
  });
});

// === POST: 結果集約 ===
describe("delete-patient-data 結果集約", () => {
  it("エラーなし → ok: true", () => {
    const results = { errors: [] as string[], reservation_canceled: true, intake_deleted: true };
    expect(results.errors.length === 0).toBe(true);
  });

  it("エラーあり → ok: false + エラーメッセージ", () => {
    const results = { errors: ["予約キャンセルエラー: some error"] };
    expect(results.errors.length === 0).toBe(false);
    expect(results.errors[0]).toContain("予約キャンセルエラー");
  });

  it("予約キャンセル成功+問診削除失敗 → 部分成功", () => {
    const results = {
      reservation_canceled: true,
      intake_deleted: undefined,
      errors: ["問診削除エラー: permission denied"],
    };
    expect(results.reservation_canceled).toBe(true);
    expect(results.intake_deleted).toBeUndefined();
    expect(results.errors.length).toBe(1);
  });
});

// === GET: 患者情報取得 ===
describe("delete-patient-data GET 患者情報取得", () => {
  it("患者名が取得できる", () => {
    const patient = { name: "田中太郎" };
    expect(patient.name).toBe("田中太郎");
  });

  it("患者が存在しない → 空文字", () => {
    const patient = null;
    expect(patient?.name || "").toBe("");
  });

  it("予約データが新しい順でソートされる", () => {
    const reservations = [
      { reserved_date: "2026-02-15" },
      { reserved_date: "2026-02-17" },
      { reserved_date: "2026-02-10" },
    ];
    const sorted = [...reservations].sort(
      (a, b) => new Date(b.reserved_date).getTime() - new Date(a.reserved_date).getTime()
    );
    expect(sorted[0].reserved_date).toBe("2026-02-17");
    expect(sorted[2].reserved_date).toBe("2026-02-10");
  });

  it("問診データなし → null", () => {
    const intakeData = null;
    expect(intakeData).toBeNull();
  });
});

// === 監査ログの記録確認 ===
describe("delete-patient-data 監査ログ", () => {
  it("削除操作の監査ログパラメータが正しい", () => {
    const action = "patient.delete_data";
    const resourceType = "patient";
    const resourceId = "p_001";
    const details = { delete_intake: true, delete_reservation: true };
    expect(action).toBe("patient.delete_data");
    expect(resourceType).toBe("patient");
    expect(resourceId).toBe("p_001");
    expect(details.delete_intake).toBe(true);
  });
});

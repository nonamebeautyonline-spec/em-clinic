// __tests__/api/waitlist.test.ts
// キャンセル待ちAPI のビジネスロジックテスト
import { describe, it, expect } from "vitest";

// === キャンセル待ちステータス管理 ===
describe("キャンセル待ち ステータス遷移", () => {
  const VALID_STATUSES = ["waiting", "notified", "booked", "expired", "cancelled"];

  it("有効なステータス一覧", () => {
    expect(VALID_STATUSES).toHaveLength(5);
  });

  it("waiting は有効なステータス", () => {
    expect(VALID_STATUSES.includes("waiting")).toBe(true);
  });

  it("notified は有効なステータス", () => {
    expect(VALID_STATUSES.includes("notified")).toBe(true);
  });

  it("booked は有効なステータス", () => {
    expect(VALID_STATUSES.includes("booked")).toBe(true);
  });

  it("expired は有効なステータス", () => {
    expect(VALID_STATUSES.includes("expired")).toBe(true);
  });

  it("cancelled は有効なステータス", () => {
    expect(VALID_STATUSES.includes("cancelled")).toBe(true);
  });

  it("unknown は無効なステータス", () => {
    expect(VALID_STATUSES.includes("unknown")).toBe(false);
  });
});

// === 日付形式バリデーション ===
describe("キャンセル待ち 日付バリデーション", () => {
  const isValidDate = (date: string): boolean =>
    /^\d{4}-\d{2}-\d{2}$/.test(date);

  it("正しい日付形式 YYYY-MM-DD", () => {
    expect(isValidDate("2026-03-15")).toBe(true);
  });

  it("スラッシュ区切りは無効", () => {
    expect(isValidDate("2026/03/15")).toBe(false);
  });

  it("日付なしは無効", () => {
    expect(isValidDate("")).toBe(false);
  });

  it("部分的な日付は無効", () => {
    expect(isValidDate("2026-03")).toBe(false);
  });

  it("日付以外の文字列は無効", () => {
    expect(isValidDate("not-a-date")).toBe(false);
  });
});

// === キャンセル待ち通知メッセージ生成 ===
describe("キャンセル待ち 通知メッセージ", () => {
  function buildWaitlistMessage(date: string, time?: string | null): string {
    const timeStr = time ? ` ${time}` : "";
    return `ご希望の日時（${date}${timeStr}）に空きが出ました。お早めにご予約ください。`;
  }

  it("日時ありのメッセージ", () => {
    const msg = buildWaitlistMessage("2026-03-20", "10:00");
    expect(msg).toBe(
      "ご希望の日時（2026-03-20 10:00）に空きが出ました。お早めにご予約ください。"
    );
  });

  it("日付のみのメッセージ（時刻なし）", () => {
    const msg = buildWaitlistMessage("2026-03-20");
    expect(msg).toBe(
      "ご希望の日時（2026-03-20）に空きが出ました。お早めにご予約ください。"
    );
  });

  it("時刻がnullの場合", () => {
    const msg = buildWaitlistMessage("2026-03-20", null);
    expect(msg).toBe(
      "ご希望の日時（2026-03-20）に空きが出ました。お早めにご予約ください。"
    );
  });
});

// === キャンセル待ち重複チェック（UNIQUE制約の想定動作） ===
describe("キャンセル待ち 重複検出", () => {
  // tenant_id + patient_id + target_date + target_time でユニーク
  type WaitlistKey = {
    tenant_id: string;
    patient_id: string;
    target_date: string;
    target_time: string | null;
  };

  function makeKey(entry: WaitlistKey): string {
    return `${entry.tenant_id}:${entry.patient_id}:${entry.target_date}:${entry.target_time ?? ""}`;
  }

  it("同一患者・同一日時は重複", () => {
    const a = makeKey({
      tenant_id: "t1",
      patient_id: "p1",
      target_date: "2026-03-20",
      target_time: "10:00",
    });
    const b = makeKey({
      tenant_id: "t1",
      patient_id: "p1",
      target_date: "2026-03-20",
      target_time: "10:00",
    });
    expect(a).toBe(b);
  });

  it("異なる日付は重複しない", () => {
    const a = makeKey({
      tenant_id: "t1",
      patient_id: "p1",
      target_date: "2026-03-20",
      target_time: "10:00",
    });
    const b = makeKey({
      tenant_id: "t1",
      patient_id: "p1",
      target_date: "2026-03-21",
      target_time: "10:00",
    });
    expect(a).not.toBe(b);
  });

  it("異なる患者は重複しない", () => {
    const a = makeKey({
      tenant_id: "t1",
      patient_id: "p1",
      target_date: "2026-03-20",
      target_time: "10:00",
    });
    const b = makeKey({
      tenant_id: "t1",
      patient_id: "p2",
      target_date: "2026-03-20",
      target_time: "10:00",
    });
    expect(a).not.toBe(b);
  });

  it("異なるテナントは重複しない", () => {
    const a = makeKey({
      tenant_id: "t1",
      patient_id: "p1",
      target_date: "2026-03-20",
      target_time: "10:00",
    });
    const b = makeKey({
      tenant_id: "t2",
      patient_id: "p1",
      target_date: "2026-03-20",
      target_time: "10:00",
    });
    expect(a).not.toBe(b);
  });
});

// === キャンセル待ち通知対象の選択ロジック ===
describe("キャンセル待ち 通知対象選択", () => {
  type WaitlistEntry = {
    id: string;
    patient_id: string;
    line_uid: string | null;
    status: string;
    created_at: string;
  };

  function selectNotifyTargets(
    entries: WaitlistEntry[],
    limit: number
  ): WaitlistEntry[] {
    return entries
      .filter((e) => e.status === "waiting" && e.line_uid)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(0, limit);
  }

  it("waiting状態でline_uidありのエントリのみ通知対象", () => {
    const entries: WaitlistEntry[] = [
      { id: "1", patient_id: "p1", line_uid: "U001", status: "waiting", created_at: "2026-03-10T10:00:00Z" },
      { id: "2", patient_id: "p2", line_uid: null, status: "waiting", created_at: "2026-03-10T11:00:00Z" },
      { id: "3", patient_id: "p3", line_uid: "U003", status: "notified", created_at: "2026-03-10T09:00:00Z" },
      { id: "4", patient_id: "p4", line_uid: "U004", status: "waiting", created_at: "2026-03-10T12:00:00Z" },
    ];
    const targets = selectNotifyTargets(entries, 3);
    expect(targets).toHaveLength(2);
    expect(targets[0].id).toBe("1");
    expect(targets[1].id).toBe("4");
  });

  it("上限を超える場合は古い順から制限数分のみ", () => {
    const entries: WaitlistEntry[] = [
      { id: "1", patient_id: "p1", line_uid: "U001", status: "waiting", created_at: "2026-03-10T10:00:00Z" },
      { id: "2", patient_id: "p2", line_uid: "U002", status: "waiting", created_at: "2026-03-10T11:00:00Z" },
      { id: "3", patient_id: "p3", line_uid: "U003", status: "waiting", created_at: "2026-03-10T12:00:00Z" },
      { id: "4", patient_id: "p4", line_uid: "U004", status: "waiting", created_at: "2026-03-10T13:00:00Z" },
    ];
    const targets = selectNotifyTargets(entries, 3);
    expect(targets).toHaveLength(3);
    expect(targets.map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("対象なしの場合は空配列", () => {
    const entries: WaitlistEntry[] = [
      { id: "1", patient_id: "p1", line_uid: null, status: "waiting", created_at: "2026-03-10T10:00:00Z" },
    ];
    const targets = selectNotifyTargets(entries, 3);
    expect(targets).toHaveLength(0);
  });
});

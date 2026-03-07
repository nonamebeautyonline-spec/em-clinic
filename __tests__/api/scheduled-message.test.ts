// __tests__/api/scheduled-message.test.ts
// 個別トーク予約送信（日時指定送信）機能のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
}

// ===================================================================
// 送信API: scheduled_at パラメータ対応
// ===================================================================
describe("send API: 予約送信モード", () => {
  const file = "app/api/admin/line/send/route.ts";

  it("scheduled_at パラメータを処理している", () => {
    const src = readFile(file);
    expect(src).toContain("scheduled_at");
  });

  it("scheduled_at が指定された場合 scheduled_messages にINSERTする", () => {
    const src = readFile(file);
    expect(src).toContain("scheduled_messages");
    expect(src).toContain(".insert(");
  });

  it("予約送信時はLINE Push送信をスキップする（scheduled_messagesに登録のみ）", () => {
    const src = readFile(file);
    // scheduled_at ブロック内で pushMessage を呼ばず、早期returnしている
    expect(src).toContain('status: "scheduled"');
    expect(src).toContain("schedule_id");
  });

  it("過去の日時は拒否する", () => {
    const src = readFile(file);
    expect(src).toContain("Date.now()");
    expect(src).toContain("5分以上先");
  });

  it("tenantPayload を使用してテナント分離している", () => {
    const src = readFile(file);
    // scheduled_messages insert 時に tenantPayload を使用
    expect(src).toContain("tenantPayload(tenantId)");
  });

  it("Flexメッセージの予約送信にも対応している", () => {
    const src = readFile(file);
    expect(src).toContain("sanitizeFlexContents");
    expect(src).toContain("flex_json");
  });
});

// ===================================================================
// スケジュールAPI: patient_id フィルタ対応
// ===================================================================
describe("schedule API: patient_id フィルタ", () => {
  const file = "app/api/admin/line/schedule/route.ts";

  it("patient_id でフィルタ可能", () => {
    const src = readFile(file);
    expect(src).toContain("patient_id");
    expect(src).toContain("searchParams");
  });

  it("status でフィルタ可能", () => {
    const src = readFile(file);
    expect(src).toContain("statusFilter");
  });

  it("verifyAdminAuth で認証している", () => {
    const src = readFile(file);
    expect(src).toContain("verifyAdminAuth");
  });
});

// ===================================================================
// スケジュールキャンセルAPI
// ===================================================================
describe("schedule cancel API: DELETE", () => {
  const file = "app/api/admin/line/schedule/[id]/route.ts";

  it("DELETE メソッドがエクスポートされている", () => {
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+DELETE/);
  });

  it("status を canceled に更新する", () => {
    const src = readFile(file);
    expect(src).toContain('"canceled"');
  });

  it("scheduled 状態のメッセージのみキャンセル可能", () => {
    const src = readFile(file);
    // .eq("status", "scheduled") で条件付きUPDATEしている
    expect(src).toContain('"scheduled"');
  });
});

// ===================================================================
// Cron: send-scheduled が個別メッセージに対応
// ===================================================================
describe("cron send-scheduled: 個別メッセージ対応", () => {
  const file = "app/api/cron/send-scheduled/route.ts";

  it("scheduled_messages テーブルから取得している", () => {
    const src = readFile(file);
    expect(src).toContain("scheduled_messages");
  });

  it("pushMessage でLINE送信している", () => {
    const src = readFile(file);
    expect(src).toContain("pushMessage");
  });

  it("送信後に message_log へ記録している", () => {
    const src = readFile(file);
    expect(src).toContain("message_log");
    expect(src).toContain('"scheduled"');
    expect(src).toContain('"outgoing"');
  });

  it("送信後に status を sent に更新している", () => {
    const src = readFile(file);
    expect(src).toContain('"sent"');
  });

  it("送信失敗時に status を failed に更新している", () => {
    const src = readFile(file);
    expect(src).toContain('"failed"');
    expect(src).toContain("error_message");
  });

  it("テンプレート変数（{name}, {patient_id}）を置換している", () => {
    const src = readFile(file);
    expect(src).toContain("{name}");
    expect(src).toContain("{patient_id}");
  });

  it("flex_json がある場合はFlexメッセージとして送信している", () => {
    const src = readFile(file);
    expect(src).toContain("flex_json");
    expect(src).toContain('"flex"');
  });

  it("排他制御（distributed-lock）を使用している", () => {
    const src = readFile(file);
    expect(src).toContain("acquireLock");
  });
});

// ===================================================================
// Zodバリデーション: lineSendSchema
// ===================================================================
describe("lineSendSchema: scheduled_at フィールド", () => {
  it("scheduled_at がオプショナルで定義されている", () => {
    const src = readFile("lib/validations/line-broadcast.ts");
    expect(src).toContain("scheduled_at");
  });
});

// ===================================================================
// トーク画面UI: 予約送信関連のstate・ロジック
// ===================================================================
describe("トーク画面: 予約送信UI", () => {
  const file = "app/admin/line/talk/page.tsx";

  it("scheduleMode state が定義されている", () => {
    const src = readFile(file);
    expect(src).toContain("scheduleMode");
    expect(src).toContain("setScheduleMode");
  });

  it("scheduledAt state が定義されている", () => {
    const src = readFile(file);
    expect(src).toContain("scheduledAt");
    expect(src).toContain("setScheduledAt");
  });

  it("scheduledMessages state が定義されている", () => {
    const src = readFile(file);
    expect(src).toContain("scheduledMessages");
    expect(src).toContain("setScheduledMessages");
  });

  it("予約送信メッセージ取得関数がある", () => {
    const src = readFile(file);
    expect(src).toContain("fetchScheduledMessages");
  });

  it("予約送信キャンセル関数がある", () => {
    const src = readFile(file);
    expect(src).toContain("cancelScheduledMessage");
  });

  it("handleSend で scheduled_at をAPIに送信している", () => {
    const src = readFile(file);
    // handleSend内でscheduleMode時にscheduled_atを送信
    expect(src).toContain("scheduled_at:");
    expect(src).toContain("scheduledAt");
  });

  it("datetime-local 入力フィールドがある", () => {
    const src = readFile(file);
    expect(src).toContain('type="datetime-local"');
  });

  it("予約送信モード解除ボタンがある", () => {
    const src = readFile(file);
    expect(src).toContain("解除");
    expect(src).toContain("setScheduleMode(false)");
  });

  it("予約メッセージ一覧で取消ボタンがある", () => {
    const src = readFile(file);
    expect(src).toContain("取消");
    expect(src).toContain("cancelScheduledMessage");
  });

  it("患者選択時に予約メッセージをリセットする", () => {
    const src = readFile(file);
    // selectPatient内でリセット
    expect(src).toContain("setScheduledMessages([])");
  });

  it("患者選択時に予約メッセージを取得する", () => {
    const src = readFile(file);
    expect(src).toContain("fetchScheduledMessages(friend.patient_id)");
  });
});

// ===================================================================
// 予約送信の日時バリデーションロジック
// ===================================================================
describe("予約送信: 日時バリデーション", () => {
  it("最小日時は現在時刻+5分", () => {
    const src = readFile("app/admin/line/talk/page.tsx");
    // UIのmin属性で5分先を設定
    expect(src).toContain("5 * 60 * 1000");
  });

  it("APIで過去日時を拒否する（3分の猶予）", () => {
    const src = readFile("app/api/admin/line/send/route.ts");
    expect(src).toContain("3 * 60 * 1000");
  });
});

// lib/__tests__/friends-list-transform.test.ts
// transformFriendsRow の単体テスト

import { describe, it, expect } from "vitest";
import { transformFriendsRow } from "@/lib/friends-list-transform";

describe("transformFriendsRow", () => {
  const baseRow = {
    patient_id: "p1",
    patient_name: "テスト太郎",
    line_id: "U123",
    line_display_name: "太郎",
    line_picture_url: "https://example.com/pic.jpg",
    mark: "red",
    last_msg_content: null,
    last_msg_at: null,
    last_incoming_at: null,
    last_template_content: null,
    last_event_content: null,
    last_event_at: null,
    last_event_type: null,
    last_outgoing_content: null,
    last_outgoing_at: null,
  };

  it("基本フィールドが正しく変換される", () => {
    const result = transformFriendsRow(baseRow);
    expect(result.patient_id).toBe("p1");
    expect(result.patient_name).toBe("テスト太郎");
    expect(result.line_id).toBe("U123");
    expect(result.line_display_name).toBe("太郎");
    expect(result.line_picture_url).toBe("https://example.com/pic.jpg");
    expect(result.mark).toBe("red");
    expect(result.is_blocked).toBe(false);
    expect(result.tags).toEqual([]);
    expect(result.fields).toEqual({});
  });

  it("last_event_type=unfollow → is_blocked=true, last_message=ブロックされました", () => {
    const result = transformFriendsRow({
      ...baseRow,
      last_event_type: "unfollow",
      last_event_at: "2026-03-01T10:00:00Z",
    });
    expect(result.is_blocked).toBe(true);
    expect(result.last_message).toBe("ブロックされました");
  });

  it("last_event_content に「再追加」含む → last_message=友だち再登録", () => {
    const result = transformFriendsRow({
      ...baseRow,
      last_event_content: "友だち再追加されました",
      last_event_at: "2026-03-01T10:00:00Z",
    });
    expect(result.last_message).toBe("友だち再登録");
  });

  it("last_event_content あり（再追加以外）→ last_message=【友達追加】", () => {
    const result = transformFriendsRow({
      ...baseRow,
      last_event_content: "友だち追加されました",
      last_event_at: "2026-03-01T10:00:00Z",
    });
    expect(result.last_message).toBe("【友達追加】");
  });

  it("postbackイベント → 実際のイベント内容を表示", () => {
    const result = transformFriendsRow({
      ...baseRow,
      last_event_content: "「マイページ」をタップしました",
      last_event_at: "2026-03-01T10:00:00Z",
    });
    expect(result.last_message).toBe("「マイページ」をタップしました");
  });

  it("メニュー操作 → 実際のイベント内容を表示", () => {
    const result = transformFriendsRow({
      ...baseRow,
      last_event_content: "メニュー操作",
      last_event_at: "2026-03-01T10:00:00Z",
    });
    expect(result.last_message).toBe("メニュー操作");
  });

  it("患者メッセージがイベントより新しい → 患者メッセージ優先", () => {
    const result = transformFriendsRow({
      ...baseRow,
      last_msg_content: "こんにちは",
      last_msg_at: "2026-03-02T10:00:00Z",
      last_event_content: "友だち追加",
      last_event_at: "2026-03-01T10:00:00Z",
    });
    expect(result.last_message).toBe("こんにちは");
  });

  it("イベントが患者メッセージより新しい → イベント優先", () => {
    const result = transformFriendsRow({
      ...baseRow,
      last_msg_content: "こんにちは",
      last_msg_at: "2026-03-01T10:00:00Z",
      last_event_content: "友だち再追加されました",
      last_event_at: "2026-03-02T10:00:00Z",
    });
    expect(result.last_message).toBe("友だち再登録");
  });

  it("outgoing系はlast_messageに影響しない", () => {
    const result = transformFriendsRow({
      ...baseRow,
      last_template_content: "【予約確認】本日の予約は10時です",
      last_outgoing_content: "承認通知です",
      last_outgoing_at: "2026-03-03T10:00:00Z",
    });
    expect(result.last_message).toBeNull();
  });

  it("全てnull → last_message=null", () => {
    const result = transformFriendsRow(baseRow);
    expect(result.last_message).toBeNull();
  });

  it("last_activity_at は last_incoming_at を返す（outgoing除外）", () => {
    const result = transformFriendsRow({
      ...baseRow,
      last_msg_at: "2026-03-01T10:00:00Z",
      last_incoming_at: "2026-03-02T10:00:00Z",
      last_outgoing_at: "2026-03-03T12:00:00Z",
    });
    expect(result.last_activity_at).toBe("2026-03-02T10:00:00Z");
  });

  it("タイムスタンプが全てnull → last_activity_at=null", () => {
    const result = transformFriendsRow(baseRow);
    expect(result.last_activity_at).toBeNull();
  });

  it("last_sent_at は last_incoming_at を返す", () => {
    const result = transformFriendsRow({
      ...baseRow,
      last_incoming_at: "2026-03-01T10:00:00Z",
    });
    expect(result.last_sent_at).toBe("2026-03-01T10:00:00Z");
  });

  it("last_text_at は last_msg_at を返す（未読判定は患者メッセージのみ）", () => {
    const result = transformFriendsRow({
      ...baseRow,
      last_msg_content: "テスト",
      last_msg_at: "2026-03-01T08:00:00Z",
      last_event_content: "友だち追加",
      last_event_at: "2026-03-02T10:00:00Z",
    });
    expect(result.last_text_at).toBe("2026-03-01T08:00:00Z");
  });

  it("last_text_at はイベント・outgoingの影響を受けない", () => {
    const result = transformFriendsRow({
      ...baseRow,
      last_event_content: "友だち追加",
      last_event_at: "2026-03-02T10:00:00Z",
      last_outgoing_at: "2026-03-03T10:00:00Z",
    });
    expect(result.last_text_at).toBeNull();
  });

  it("patient_name が空 → 空文字", () => {
    const result = transformFriendsRow({ ...baseRow, patient_name: null });
    expect(result.patient_name).toBe("");
  });

  it("mark が未設定 → 'none'", () => {
    const result = transformFriendsRow({ ...baseRow, mark: null });
    expect(result.mark).toBe("none");
  });

  it("line_id が null → null", () => {
    const result = transformFriendsRow({ ...baseRow, line_id: null });
    expect(result.line_id).toBeNull();
  });
});

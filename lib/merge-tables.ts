// LINE_仮レコード統合時にpatient_idを付け替える対象テーブル
// webhook, intake/route.ts, register/personal-info, register/complete で共通使用
//
// ※ intake は各箇所で個別処理するため含めない:
//   - webhook / intake/route.ts: 仮レコードの intake を DELETE
//   - register/personal-info: intake の patient_id を UPDATE
//   - register/complete: intake の patient_id を UPDATE
export const MERGE_TABLES = [
  "reservations",
  "orders",
  "reorders",
  "message_log",
  "patient_tags",
  "patient_marks",
  "friend_field_values",
] as const;

import { supabaseAdmin } from "@/lib/supabase";

// LINE_仮レコード統合時にpatient_idを付け替える対象テーブル
// webhook, intake/route.ts, register/personal-info, register/complete で共通使用
//
// ※ intake は各箇所で個別処理するため含めない:
//   - webhook / intake/route.ts: 仮レコードの intake を DELETE
//   - register/personal-info: intake の patient_id を UPDATE
//   - register/complete: intake の patient_id を UPDATE
//
// ※ friend_summaries は PK が patient_id のため MERGE_TABLES に含めず
//   migrateFriendSummary() で個別処理する
export const MERGE_TABLES = [
  "reservations",
  "orders",
  "reorders",
  "message_log",
  "patient_tags",
  "patient_marks",
  "friend_field_values",
] as const;

/**
 * friend_summaries の patient_id を移行（PK競合時は旧エントリを削除）
 * 全マージ箇所から呼び出すこと
 */
export async function migrateFriendSummary(oldPatientId: string, newPatientId: string) {
  // 旧IDのエントリを新IDに更新（新IDが未存在なら成功する）
  const { error } = await supabaseAdmin
    .from("friend_summaries")
    .update({ patient_id: newPatientId })
    .eq("patient_id", oldPatientId);

  if (error) {
    // PK競合（新IDのエントリが既に存在）→ 旧エントリを削除
    await supabaseAdmin
      .from("friend_summaries")
      .delete()
      .eq("patient_id", oldPatientId);
  }
}

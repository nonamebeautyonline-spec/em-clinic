// lib/karte-history.ts — カルテ編集履歴記録ヘルパー
import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";

interface RecordKarteChangeParams {
  intakeId: number | string;
  noteBefore: string | null;
  noteAfter: string | null;
  karteStatusBefore: string | null;
  karteStatusAfter: string | null;
  changeReason?: string | null;
  changedBy: string;
  changedById?: string | null;
  tenantId: string | null;
}

/**
 * カルテ変更履歴を karte_history テーブルに記録
 * fire-and-forget ではなくエラーを返す（監査要件のため）
 */
export async function recordKarteChange(params: RecordKarteChangeParams): Promise<{ error: string | null }> {
  const {
    intakeId,
    noteBefore,
    noteAfter,
    karteStatusBefore,
    karteStatusAfter,
    changeReason,
    changedBy,
    changedById,
    tenantId,
  } = params;

  // note が変わっていない + ステータスも変わっていない場合はスキップ
  if (noteBefore === noteAfter && karteStatusBefore === karteStatusAfter) {
    return { error: null };
  }

  const { error } = await supabaseAdmin.from("karte_history").insert({
    ...tenantPayload(tenantId),
    intake_id: Number(intakeId),
    note_before: noteBefore,
    note_after: noteAfter,
    karte_status_before: karteStatusBefore,
    karte_status_after: karteStatusAfter,
    change_reason: changeReason || null,
    changed_by: changedBy,
    changed_by_id: changedById || null,
  });

  if (error) {
    console.error("[karte-history] 履歴記録エラー:", error);
    return { error: error.message };
  }

  return { error: null };
}

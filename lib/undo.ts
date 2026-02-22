// lib/undo.ts — 操作の取り消し（Undo）コアロジック
//
// 使用例: カルテ編集APIでの組み込み
// const { data: prevData } = await supabaseAdmin
//   .from("intake").select("*").eq("id", id).single();
// await supabaseAdmin.from("intake").update(newData).eq("id", id);
// await recordUndoableAction({
//   tenantId, actionType: "update", resourceType: "intake",
//   resourceId: String(id), previousData: prevData,
//   currentData: newData, description: "カルテ編集",
// });

import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";

/** Undo操作の型定義 */
export type UndoAction = {
  id: number;
  tenant_id: string | null;
  action_type: "update" | "delete" | "insert";
  resource_type: "intake" | "reorder" | "patient" | "reservation";
  resource_id: string;
  previous_data: Record<string, unknown>;
  current_data: Record<string, unknown> | null;
  admin_user_id: string | null;
  description: string | null;
  undone: boolean;
  expires_at: string;
  created_at: string;
};

/** リソースタイプからテーブル名への変換 */
const RESOURCE_TABLE_MAP: Record<string, string> = {
  intake: "intake",
  reorder: "reorders",
  patient: "patients",
  reservation: "reservations",
};

/** Undo有効期限（24時間） */
const UNDO_EXPIRY_HOURS = 24;

/**
 * 取り消し可能な操作を記録する
 * @returns undo_history.id（記録失敗時は null）
 */
export async function recordUndoableAction(params: {
  tenantId: string | null;
  actionType: "update" | "delete" | "insert";
  resourceType: "intake" | "reorder" | "patient" | "reservation";
  resourceId: string;
  previousData: Record<string, unknown>;
  currentData?: Record<string, unknown>;
  adminUserId?: string;
  description: string;
}): Promise<number | null> {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + UNDO_EXPIRY_HOURS);

    const { data, error } = await supabaseAdmin
      .from("undo_history")
      .insert({
        ...tenantPayload(params.tenantId),
        action_type: params.actionType,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        previous_data: params.previousData,
        current_data: params.currentData || null,
        admin_user_id: params.adminUserId || null,
        description: params.description,
        undone: false,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[undo] 操作履歴の記録に失敗:", error.message);
      return null;
    }

    return data?.id ?? null;
  } catch (err) {
    // Undo記録の失敗で業務処理を止めない（fire-and-forget）
    console.error("[undo] 操作履歴の記録に失敗:", err);
    return null;
  }
}

/**
 * 取り消しを実行する
 * - undone=true のものは拒否
 * - expires_at を過ぎたものは拒否
 * - resource_type に応じて previous_data で UPDATE / INSERT / DELETE
 * - undone=true に更新
 */
export async function executeUndo(
  undoId: number,
  tenantId: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Undo履歴を取得
    const { data: undoRecord, error: fetchErr } = await withTenant(
      supabaseAdmin
        .from("undo_history")
        .select("*")
        .eq("id", undoId),
      tenantId,
    ).single();

    if (fetchErr || !undoRecord) {
      return { success: false, error: "Undo履歴が見つかりません" };
    }

    // 2. 取り消し済みチェック
    if (undoRecord.undone) {
      return { success: false, error: "この操作は既に取り消し済みです" };
    }

    // 3. 有効期限チェック
    const now = new Date();
    const expiresAt = new Date(undoRecord.expires_at);
    if (now > expiresAt) {
      return { success: false, error: "取り消しの有効期限が切れています（24時間以内のみ）" };
    }

    // 4. リソースタイプに応じて復元
    const tableName = RESOURCE_TABLE_MAP[undoRecord.resource_type];
    if (!tableName) {
      return { success: false, error: `未対応のリソースタイプ: ${undoRecord.resource_type}` };
    }

    const previousData = undoRecord.previous_data as Record<string, unknown>;
    const actionType = undoRecord.action_type as string;

    if (actionType === "update") {
      // UPDATE操作の取り消し: previous_data で上書き
      // id/created_at/tenant_id は復元対象から除外
      const restoreData = { ...previousData };
      delete restoreData.id;
      delete restoreData.created_at;
      delete restoreData.tenant_id;
      restoreData.updated_at = new Date().toISOString();

      const { error: updateErr } = await withTenant(
        supabaseAdmin
          .from(tableName)
          .update(restoreData)
          .eq("id", undoRecord.resource_id),
        tenantId,
      );

      if (updateErr) {
        return { success: false, error: `復元に失敗: ${updateErr.message}` };
      }
    } else if (actionType === "delete") {
      // DELETE操作の取り消し: previous_data を再INSERT
      const { error: insertErr } = await supabaseAdmin
        .from(tableName)
        .insert(previousData);

      if (insertErr) {
        return { success: false, error: `復元に失敗: ${insertErr.message}` };
      }
    } else if (actionType === "insert") {
      // INSERT操作の取り消し: 挿入されたレコードを削除
      const { error: deleteErr } = await withTenant(
        supabaseAdmin
          .from(tableName)
          .delete()
          .eq("id", undoRecord.resource_id),
        tenantId,
      );

      if (deleteErr) {
        return { success: false, error: `復元に失敗: ${deleteErr.message}` };
      }
    } else {
      return { success: false, error: `未対応のアクションタイプ: ${actionType}` };
    }

    // 5. undone=true に更新
    await supabaseAdmin
      .from("undo_history")
      .update({ undone: true })
      .eq("id", undoId);

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[undo] 取り消し実行に失敗:", msg);
    return { success: false, error: `取り消しに失敗しました: ${msg}` };
  }
}

/**
 * 直近の取り消し可能な操作一覧を取得
 * - undone=false かつ expires_at > now のもの
 * - 作成日時の降順でソート
 */
export async function getRecentUndoActions(
  tenantId: string | null,
  limit: number = 20,
): Promise<UndoAction[]> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await withTenant(
      supabaseAdmin
        .from("undo_history")
        .select("*")
        .eq("undone", false)
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(limit),
      tenantId,
    );

    if (error) {
      console.error("[undo] 操作履歴の取得に失敗:", error.message);
      return [];
    }

    return (data as UndoAction[]) || [];
  } catch (err) {
    console.error("[undo] 操作履歴の取得に失敗:", err);
    return [];
  }
}

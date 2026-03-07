// lib/tenant-backup.ts — テナントバックアップ/リストア機能
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { encrypt, decrypt } from "@/lib/crypto";
import { v4 as uuidv4 } from "uuid";

/** バックアップ対象テーブル一覧（tenant_id カラムを持つテーブル） */
export const BACKUP_TABLES = [
  "patients",
  "intake",
  "reservations",
  "products",
  "orders",
  "message_templates",
  "tags",
  "patient_tags",
  "workflows",
  "workflow_steps",
  "rich_menus",
  "broadcasts",
  "tenant_settings",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

/** バックアップレコード型 */
export interface TenantBackup {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  file_url: string | null;
  file_size: number | null;
  tables_included: string[] | null;
  record_counts: Record<string, number> | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

/** エクスポートデータ形式 */
export interface ExportData {
  version: string;
  exported_at: string;
  tenant_id: string;
  tables: Record<string, Record<string, unknown>[]>;
  record_counts: Record<string, number>;
}

/**
 * テナントデータをJSON形式でエクスポート
 * @param tenantId テナントID
 * @param tables エクスポート対象テーブル（省略時は全テーブル）
 */
export async function exportTenantData(
  tenantId: string,
  tables?: string[],
): Promise<ExportData> {
  const targetTables = tables ?? [...BACKUP_TABLES];
  const exportData: ExportData = {
    version: "1.0",
    exported_at: new Date().toISOString(),
    tenant_id: tenantId,
    tables: {},
    record_counts: {},
  };

  for (const table of targetTables) {
    const { data, error } = await withTenant(
      supabaseAdmin.from(table).select("*"),
      tenantId,
    );

    if (error) {
      console.error(`テーブル ${table} のエクスポートエラー:`, error.message);
      continue;
    }

    exportData.tables[table] = data ?? [];
    exportData.record_counts[table] = data?.length ?? 0;
  }

  return exportData;
}

/**
 * IDリマッピングマップを構築
 * 元のID → 新しいUUIDのマッピング
 */
function buildIdRemapping(
  tables: Record<string, Record<string, unknown>[]>,
): Map<string, string> {
  const idMap = new Map<string, string>();

  for (const [, rows] of Object.entries(tables)) {
    for (const row of rows) {
      // UUIDフォーマットのIDのみリマッピング
      const id = row.id;
      if (typeof id === "string" && isUUID(id)) {
        idMap.set(id, uuidv4());
      }
    }
  }

  return idMap;
}

/** UUID判定 */
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * レコード内のUUID参照を再マッピング
 */
function remapRecord(
  record: Record<string, unknown>,
  idMap: Map<string, string>,
  tenantId: string,
): Record<string, unknown> {
  const remapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === "tenant_id") {
      // テナントIDはインポート先に置換
      remapped[key] = tenantId;
    } else if (typeof value === "string" && isUUID(value) && idMap.has(value)) {
      // IDリマッピング
      remapped[key] = idMap.get(value);
    } else {
      remapped[key] = value;
    }
  }

  return remapped;
}

/**
 * JSONデータからテナントデータをインポート（リストア）
 * @param tenantId インポート先テナントID
 * @param data エクスポートデータ
 */
export async function importTenantData(
  tenantId: string,
  data: ExportData,
): Promise<{ success: boolean; error?: string; record_counts?: Record<string, number> }> {
  const idMap = buildIdRemapping(data.tables);
  const importedCounts: Record<string, number> = {};
  const insertedTables: string[] = [];

  try {
    // インポート順序（外部キー依存を考慮）
    const orderedTables = [
      "patients",
      "products",
      "tags",
      "message_templates",
      "rich_menus",
      "intake",
      "reservations",
      "orders",
      "patient_tags",
      "workflows",
      "workflow_steps",
      "broadcasts",
      "tenant_settings",
    ];

    for (const table of orderedTables) {
      const rows = data.tables[table];
      if (!rows || rows.length === 0) continue;

      // 既存データを削除（上書きリストア）
      const { error: deleteError } = await withTenant(
        supabaseAdmin.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        tenantId,
      );

      if (deleteError) {
        console.error(`テーブル ${table} の削除エラー:`, deleteError.message);
      }

      // レコードをリマッピングしてインサート
      const remappedRows = rows.map((row) =>
        remapRecord(row as Record<string, unknown>, idMap, tenantId),
      );

      // バッチインサート（1000件ずつ）
      const batchSize = 1000;
      let insertedCount = 0;

      for (let i = 0; i < remappedRows.length; i += batchSize) {
        const batch = remappedRows.slice(i, i + batchSize);
        const { error: insertError } = await supabaseAdmin.from(table).insert(batch);

        if (insertError) {
          throw new Error(`テーブル ${table} のインポートエラー: ${insertError.message}`);
        }
        insertedCount += batch.length;
      }

      importedCounts[table] = insertedCount;
      insertedTables.push(table);
    }

    return { success: true, record_counts: importedCounts };
  } catch (error) {
    // ロールバック: インポート済みテーブルのデータを削除
    for (const table of insertedTables) {
      try {
        await withTenant(
          supabaseAdmin.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000"),
          tenantId,
        );
      } catch {
        console.error(`ロールバック中のエラー: テーブル ${table}`);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}

/**
 * バックアップ一覧取得
 */
export async function listBackups(tenantId: string): Promise<TenantBackup[]> {
  const { data, error } = await withTenant(
    supabaseAdmin
      .from("tenant_backups")
      .select("*")
      .order("created_at", { ascending: false }),
    tenantId,
  );

  if (error) {
    console.error("バックアップ一覧取得エラー:", error.message);
    return [];
  }

  return (data as TenantBackup[]) ?? [];
}

/**
 * バックアップステータス取得
 */
export async function getBackupStatus(
  backupId: string,
): Promise<TenantBackup | null> {
  const { data, error } = await supabaseAdmin
    .from("tenant_backups")
    .select("*")
    .eq("id", backupId)
    .maybeSingle();

  if (error) {
    console.error("バックアップステータス取得エラー:", error.message);
    return null;
  }

  return data as TenantBackup | null;
}

/**
 * バックアップを作成し、エクスポートデータを暗号化して保存
 */
export async function createBackup(
  tenantId: string,
  name: string,
  description?: string,
  createdBy?: string,
  tables?: string[],
): Promise<TenantBackup> {
  // バックアップレコード作成
  const { data: backup, error: createError } = await supabaseAdmin
    .from("tenant_backups")
    .insert({
      ...tenantPayload(tenantId),
      name,
      description: description ?? null,
      status: "processing",
      tables_included: tables ?? [...BACKUP_TABLES],
      created_by: createdBy ?? null,
    })
    .select()
    .single();

  if (createError || !backup) {
    throw new Error(`バックアップ作成エラー: ${createError?.message}`);
  }

  try {
    // データエクスポート
    const exportData = await exportTenantData(tenantId, tables);

    // JSON化して暗号化
    const jsonData = JSON.stringify(exportData);
    const encrypted = encrypt(jsonData);
    const fileSize = Buffer.byteLength(encrypted, "utf-8");

    // バックアップレコード更新
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("tenant_backups")
      .update({
        status: "completed",
        file_url: encrypted,
        file_size: fileSize,
        record_counts: exportData.record_counts,
        completed_at: new Date().toISOString(),
      })
      .eq("id", backup.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`バックアップ更新エラー: ${updateError.message}`);
    }

    return updated as TenantBackup;
  } catch (error) {
    // 失敗時のステータス更新
    await supabaseAdmin
      .from("tenant_backups")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "不明なエラー",
      })
      .eq("id", backup.id);

    throw error;
  }
}

/**
 * バックアップデータを復号してExportDataを返す
 */
export function decryptBackupData(encryptedData: string): ExportData {
  const decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted) as ExportData;
}

/**
 * バックアップ削除
 */
export async function deleteBackup(
  backupId: string,
  tenantId: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("tenant_backups")
    .delete()
    .eq("id", backupId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("バックアップ削除エラー:", error.message);
    return false;
  }

  return true;
}

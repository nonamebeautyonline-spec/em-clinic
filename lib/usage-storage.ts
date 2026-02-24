// lib/usage-storage.ts — テナント別ストレージ使用量の集計
//
// Supabase Storage APIでテナント別バケットの容量を集計する。

import { supabaseAdmin } from "@/lib/supabase";

/** ストレージ使用量 */
export interface StorageUsage {
  totalBytes: number;
  fileCount: number;
}

/**
 * テナントのストレージ使用量を取得
 * テナント別バケット（tenant-{tenantId}）のファイルリストからサイズを合計
 */
export async function getStorageUsage(
  tenantId: string,
): Promise<StorageUsage> {
  const bucketName = `tenant-${tenantId}`;

  try {
    // バケット内の全ファイルを取得（再帰的にリスト）
    const { data: files, error } = await supabaseAdmin.storage
      .from(bucketName)
      .list("", { limit: 10000 });

    if (error) {
      // バケットが存在しない場合は0を返す
      console.warn(
        `[usage-storage] バケット "${bucketName}" の読み取りエラー:`,
        error.message,
      );
      return { totalBytes: 0, fileCount: 0 };
    }

    if (!files || files.length === 0) {
      return { totalBytes: 0, fileCount: 0 };
    }

    // ファイルサイズを合計（フォルダはmetadata.sizeがないのでスキップ）
    let totalBytes = 0;
    let fileCount = 0;

    for (const file of files) {
      if (file.metadata?.size) {
        totalBytes += Number(file.metadata.size);
        fileCount++;
      }
    }

    return { totalBytes, fileCount };
  } catch (err) {
    console.error("[usage-storage] ストレージ使用量取得エラー:", err);
    return { totalBytes: 0, fileCount: 0 };
  }
}

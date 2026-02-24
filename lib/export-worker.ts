// lib/export-worker.ts — テナント全データエクスポートワーカー
import { supabaseAdmin } from "@/lib/supabase";

/** BOM付きUTF-8 CSVを生成（Excel対応） */
const BOM = "\uFEFF";

/** エクスポート対象テーブル定義 */
const EXPORT_TABLES = [
  {
    name: "patients",
    select: "patient_id, name, name_kana, tel, sex, birthday, line_id, created_at, updated_at",
    headers: ["患者ID", "氏名", "カナ", "電話番号", "性別", "生年月日", "LINE ID", "作成日時", "更新日時"],
  },
  {
    name: "intake",
    select: "id, reserve_id, patient_id, answerer_id, line_id, patient_name, reserved_date, reserved_time, status, note, prescription_menu, created_at, updated_at",
    headers: ["ID", "予約ID", "患者ID", "回答者ID", "LINE ID", "患者名", "予約日", "予約時間", "ステータス", "ノート", "処方メニュー", "作成日時", "更新日時"],
  },
  {
    name: "reservations",
    select: "id, reserve_id, patient_id, patient_name, reserved_date, reserved_time, status, note, prescription_menu, created_at, updated_at",
    headers: ["ID", "予約ID", "患者ID", "患者名", "予約日", "予約時間", "ステータス", "ノート", "処方メニュー", "作成日時", "更新日時"],
  },
  {
    name: "orders",
    select: "id, patient_id, product_code, amount, payment_method, status, paid_at, refund_status, refunded_amount, shipping_date, tracking_number, created_at",
    headers: ["ID", "患者ID", "商品コード", "金額", "決済方法", "ステータス", "決済日時", "返金ステータス", "返金額", "配送日", "追跡番号", "作成日時"],
  },
  {
    name: "reorders",
    select: "id, patient_id, status, product_code, amount, paid_at, created_at, updated_at",
    headers: ["ID", "患者ID", "ステータス", "商品コード", "金額", "決済日時", "作成日時", "更新日時"],
  },
  {
    name: "message_log",
    select: "id, line_id, direction, message_type, content, created_at",
    headers: ["ID", "LINE ID", "方向", "メッセージ種別", "内容", "作成日時"],
  },
  {
    name: "tags",
    select: "id, name, color, created_at",
    headers: ["ID", "名前", "色", "作成日時"],
  },
  {
    name: "patient_tags",
    select: "id, patient_id, tag_id, created_at",
    headers: ["ID", "患者ID", "タグID", "作成日時"],
  },
];

/** セルのエスケープ処理（ダブルクォート対応） */
function escapeCSVCell(value: unknown): string {
  const str = value == null ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/** データ行をCSV文字列に変換 */
function toCSV(headers: readonly string[], rows: Record<string, unknown>[], selectCols: string[]): string {
  const headerLine = headers.map(escapeCSVCell).join(",");
  const dataLines = rows.map((row) =>
    selectCols.map((col) => escapeCSVCell(row[col.trim()])).join(",")
  );
  return BOM + [headerLine, ...dataLines].join("\r\n");
}

/** テナント全データエクスポートを実行 */
export async function executeFullExport(
  jobId: string,
  tenantId: string
): Promise<void> {
  try {
    // ステータスを processing に更新
    await supabaseAdmin
      .from("export_jobs")
      .update({ status: "processing" })
      .eq("id", jobId);

    const files: { name: string; content: string }[] = [];
    const recordCounts: Record<string, number> = {};
    const tablesIncluded: string[] = [];

    for (const table of EXPORT_TABLES) {
      try {
        let query = supabaseAdmin
          .from(table.name)
          .select(table.select)
          .order("created_at", { ascending: false })
          .limit(50000); // 安全上限

        // tenant_id カラムがあるテーブルのみフィルタ
        if (tenantId) {
          query = query.eq("tenant_id", tenantId);
        }

        const { data, error } = await query;

        if (error) {
          // tenant_id カラムがない場合はフィルタなしで再試行
          const { data: retryData } = await supabaseAdmin
            .from(table.name)
            .select(table.select)
            .order("created_at", { ascending: false })
            .limit(50000);

          const rows = (retryData || []) as unknown as Record<string, unknown>[];
          const selectCols = table.select.split(",");
          const csv = toCSV(table.headers, rows, selectCols);
          files.push({ name: `${table.name}.csv`, content: csv });
          recordCounts[table.name] = rows.length;
          tablesIncluded.push(table.name);
          continue;
        }

        const rows = (data || []) as unknown as Record<string, unknown>[];
        const selectCols = table.select.split(",");
        const csv = toCSV(table.headers, rows, selectCols);
        files.push({ name: `${table.name}.csv`, content: csv });
        recordCounts[table.name] = rows.length;
        tablesIncluded.push(table.name);
      } catch {
        // テーブルが存在しない場合はスキップ
        recordCounts[table.name] = 0;
      }
    }

    // 完了更新
    await supabaseAdmin
      .from("export_jobs")
      .update({
        status: "completed",
        record_counts: recordCounts,
        tables_included: tablesIncluded,
        // file_url にJSON形式でCSVデータを保存
        file_url: JSON.stringify({ files }),
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (err) {
    // エラー時はステータスをfailedに更新
    await supabaseAdmin
      .from("export_jobs")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "不明なエラー",
      })
      .eq("id", jobId);
  }
}

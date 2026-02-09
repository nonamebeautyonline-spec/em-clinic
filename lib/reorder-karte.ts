// 再処方決済時のカルテ自動作成ヘルパー
// カルテは reorders テーブルの karte_note カラムに保存（intake テーブルは汚さない）
import { supabaseAdmin } from "@/lib/supabase";
import { formatProductCode } from "@/lib/patient-utils";

/**
 * product_code から用量(mg)を抽出
 * 例: "MJL_2.5mg_1m" → 2.5, "MJL_10mg_3m" → 10
 */
export function extractDose(productCode: string): number | null {
  const m = productCode.match(/(\d+\.?\d*)mg/);
  return m ? parseFloat(m[1]) : null;
}

/**
 * 前回と今回の用量を比較してカルテ本文を生成
 */
export function buildKarteNote(
  productCode: string,
  prevDose: number | null,
  currentDose: number | null,
): string {
  const productName = formatProductCode(productCode);
  let reason: string;

  if (prevDose == null || currentDose == null) {
    reason = "副作用がなく、継続使用のため処方";
  } else if (currentDose > prevDose) {
    reason = "副作用がなく、効果を感じづらくなり増量処方";
  } else if (currentDose < prevDose) {
    reason = "副作用がなく、効果も十分にあったため減量処方";
  } else {
    reason = "副作用がなく、継続使用のため処方";
  }

  return `再処方希望\n商品: ${productName}\n${reason}`;
}

/**
 * 再処方決済時に reorders.karte_note を更新
 *
 * @param patientId    患者ID
 * @param productCode  今回の商品コード (例: "MJL_5mg_1m")
 * @param paidAt       決済日時 ISO文字列 (未使用だが互換性のため残す)
 * @param reorderGasRow 今回のreorderのgas_row_number (特定用、省略可)
 */
export async function createReorderPaymentKarte(
  patientId: string,
  productCode: string,
  paidAt: string,
  reorderGasRow?: number,
): Promise<void> {
  if (!patientId || !productCode) {
    console.log("[reorder-karte] skipped: missing patientId or productCode");
    return;
  }

  // 前回の決済済みreorderを取得して用量を比較
  const currentDose = extractDose(productCode);
  let prevDose: number | null = null;

  try {
    const { data: prevReorders } = await supabaseAdmin
      .from("reorders")
      .select("product_code, paid_at")
      .eq("patient_id", patientId)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(2);

    if (prevReorders && prevReorders.length > 0) {
      const prev = prevReorders.find(r => r.product_code !== productCode) || prevReorders[1];
      if (prev) {
        prevDose = extractDose(prev.product_code || "");
      }
    }
  } catch (err) {
    console.error("[reorder-karte] Error fetching previous reorder:", err);
  }

  // カルテ本文を生成
  const note = buildKarteNote(productCode, prevDose, currentDose);

  // reorders テーブルの karte_note を更新
  // 対象: 同じ patient_id + product_code で status=paid の最新レコード
  let query = supabaseAdmin
    .from("reorders")
    .update({ karte_note: note })
    .eq("patient_id", patientId)
    .eq("product_code", productCode)
    .eq("status", "paid")
    .is("karte_note", null); // まだカルテ未作成のもののみ

  const { data: updated, error } = await query.select("id");

  if (error) {
    console.error(`[reorder-karte] reorders update error for patient=${patientId}:`, error);
  } else if (updated && updated.length > 0) {
    console.log(`[reorder-karte] karte saved to reorders: patient=${patientId}, product=${productCode}, dose=${currentDose}mg, prevDose=${prevDose}mg, rows=${updated.length}`);
  } else {
    console.log(`[reorder-karte] no matching reorder to update: patient=${patientId}, product=${productCode}`);
  }
}

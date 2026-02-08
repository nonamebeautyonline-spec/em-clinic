// 再処方決済時のカルテ自動作成ヘルパー
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
function buildKarteNote(
  productCode: string,
  prevDose: number | null,
  currentDose: number | null,
): string {
  const productName = formatProductCode(productCode);
  let reason: string;

  if (prevDose == null || currentDose == null) {
    // 前回なし or 用量不明 → 初回扱い
    reason = "副作用がなく、継続使用のため処方";
  } else if (currentDose > prevDose) {
    reason = "副作用がなく、効果を感じづらくなり増量処方";
  } else if (currentDose < prevDose) {
    reason = "副作用がなく、効果も十分にあったため減量処方";
  } else {
    reason = "副作用がなく、継続使用のため処方";
  }

  return `再処方決済\n商品: ${productName}\n${reason}`;
}

/**
 * 再処方決済時にカルテ（intakeレコード）を自動作成
 *
 * @param patientId    患者ID
 * @param productCode  今回の商品コード (例: "MJL_5mg_1m")
 * @param paidAt       決済日時 ISO文字列 (この時刻 - 15分をカルテのcreated_atにする)
 * @param reorderGasRow 今回のreorderのgas_row_number (重複チェック用、省略可)
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

  // 重複チェック: 同じreorderに対してすでにカルテがあるかチェック
  // noteに「再処方決済」+同じ商品名が含まれ、created_atが近いものがあればスキップ
  const productName = formatProductCode(productCode);
  const paidDate = new Date(paidAt);
  const karteTime = new Date(paidDate.getTime() - 15 * 60 * 1000); // -15分

  // ±30分以内に同じ商品の決済カルテがあればスキップ
  const checkFrom = new Date(karteTime.getTime() - 30 * 60 * 1000).toISOString();
  const checkTo = new Date(karteTime.getTime() + 30 * 60 * 1000).toISOString();

  const { data: existing } = await supabaseAdmin
    .from("intake")
    .select("id")
    .eq("patient_id", patientId)
    .gte("created_at", checkFrom)
    .lte("created_at", checkTo)
    .ilike("note", `%再処方決済%${productName}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`[reorder-karte] skipped: duplicate karte exists for patient=${patientId}, product=${productCode}`);
    return;
  }

  // 前回の決済済みreorderを取得して用量を比較
  const currentDose = extractDose(productCode);
  let prevDose: number | null = null;

  try {
    let prevQuery = supabaseAdmin
      .from("reorders")
      .select("product_code, paid_at")
      .eq("patient_id", patientId)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(2); // 今回分を除外するため2件取得

    const { data: prevReorders } = await prevQuery;

    if (prevReorders && prevReorders.length > 0) {
      // 今回のreorderを除外（gas_row_numberがある場合はそれで、なければ直近を除外）
      const prev = prevReorders.find(r => r.product_code !== productCode) || prevReorders[1];
      if (prev) {
        prevDose = extractDose(prev.product_code || "");
      }
    }
  } catch (err) {
    console.error("[reorder-karte] Error fetching previous reorder:", err);
  }

  // 患者名を取得
  let patientName = "";
  try {
    const { data: answerer } = await supabaseAdmin
      .from("answerers")
      .select("name")
      .eq("patient_id", patientId)
      .limit(1)
      .maybeSingle();
    patientName = answerer?.name || "";
  } catch (_) {}

  // カルテ本文を生成
  const note = buildKarteNote(productCode, prevDose, currentDose);

  // intakeレコード作成 (created_at = 決済時刻 - 15分)
  const { error } = await supabaseAdmin.from("intake").insert({
    patient_id: patientId,
    patient_name: patientName,
    note,
    created_at: karteTime.toISOString(),
  });

  if (error) {
    console.error(`[reorder-karte] intake insert error for patient=${patientId}:`, error);
  } else {
    console.log(`[reorder-karte] karte created: patient=${patientId}, product=${productCode}, dose=${currentDose}mg, prevDose=${prevDose}mg`);
  }
}

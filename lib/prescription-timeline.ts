// 処方歴タイムライン構築ロジック
// orders + reorders から時系列の処方変更履歴を生成する

import { extractDose } from "@/lib/reorder-karte";
import { formatProductCode } from "@/lib/patient-utils";

export type PrescriptionChange = "increase" | "decrease" | "same" | "initial";

export type TimelineEntry = {
  date: string; // ISO日付
  productCode: string;
  productName: string;
  dose: number | null;
  prevDose: number | null;
  change: PrescriptionChange;
  source: "order" | "reorder";
  karteNote?: string;
};

type OrderRow = {
  product_code: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type ReorderRow = {
  product_code: string | null;
  paid_at: string | null;
  created_at: string | null;
  karte_note: string | null;
};

/**
 * orders と reorders から処方歴タイムラインを構築する
 * 日付降順でソート済みの配列を返す
 */
export function buildPrescriptionTimeline(
  orders: OrderRow[],
  reorders: ReorderRow[],
): TimelineEntry[] {
  // orders と reorders を統合して日付順にソート
  const merged: { date: string; productCode: string; source: "order" | "reorder"; karteNote?: string }[] = [];

  for (const o of orders) {
    if (!o.product_code) continue;
    merged.push({
      date: o.paid_at || o.created_at || "",
      productCode: o.product_code,
      source: "order",
    });
  }

  for (const r of reorders) {
    if (!r.product_code) continue;
    // paid 済みの再処方のみタイムラインに含める
    if (!r.paid_at) continue;
    merged.push({
      date: r.paid_at || r.created_at || "",
      productCode: r.product_code,
      source: "reorder",
      karteNote: r.karte_note || undefined,
    });
  }

  // 日付昇順（古い順）でソートして用量変化を計算
  merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let prevDose: number | null = null;
  const entries: TimelineEntry[] = [];

  for (const item of merged) {
    const dose = extractDose(item.productCode);
    let change: PrescriptionChange;

    if (prevDose === null) {
      change = "initial";
    } else if (dose === null) {
      change = "same";
    } else if (dose > prevDose) {
      change = "increase";
    } else if (dose < prevDose) {
      change = "decrease";
    } else {
      change = "same";
    }

    entries.push({
      date: item.date,
      productCode: item.productCode,
      productName: formatProductCode(item.productCode),
      dose,
      prevDose,
      change,
      source: item.source,
      karteNote: item.karteNote,
    });

    if (dose !== null) {
      prevDose = dose;
    }
  }

  // 日付降順（新しい順）で返す
  return entries.reverse();
}

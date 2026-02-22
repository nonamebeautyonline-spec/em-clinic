// lib/patient-segments.ts — 患者セグメント自動分類（RFM分析）
// behavior-filters.ts の来院回数・購入金額・最終来院日を使用し、
// VIP / アクティブ / 離脱リスク / 休眠 / 新規 の5セグメントに自動分類する

import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import {
  getVisitCounts,
  getPurchaseAmounts,
  getLastVisitDates,
} from "@/lib/behavior-filters";

// ── セグメント定義 ──────────────────────────────────────────

export type SegmentType = "vip" | "active" | "churn_risk" | "dormant" | "new";

export const SEGMENT_LABELS: Record<SegmentType, string> = {
  vip: "VIP",
  active: "アクティブ",
  churn_risk: "離脱リスク",
  dormant: "休眠",
  new: "新規",
};

export const SEGMENT_COLORS: Record<SegmentType, string> = {
  vip: "#FFD700",
  active: "#22C55E",
  churn_risk: "#F97316",
  dormant: "#94A3B8",
  new: "#3B82F6",
};

// 全セグメント種別の配列（表示順）
export const ALL_SEGMENTS: SegmentType[] = [
  "vip",
  "active",
  "churn_risk",
  "dormant",
  "new",
];

// ── RFMスコア型 ──────────────────────────────────────────

export interface RFMScore {
  recency: number; // 1-5
  frequency: number; // 1-5
  monetary: number; // 1-5
}

// ── RFMスコア計算 ──────────────────────────────────────────
// recencyDays: 最終来院からの経過日数（null = 来院なし）
// frequency: 来院回数
// monetary: 購入金額（円）

export function calculateRFMScore(
  recencyDays: number | null,
  frequency: number,
  monetary: number,
): RFMScore {
  // Recency: 30日以内=5, 60日以内=4, 90日以内=3, 180日以内=2, それ以上=1, null=1
  let recency: number;
  if (recencyDays === null) {
    recency = 1;
  } else if (recencyDays <= 30) {
    recency = 5;
  } else if (recencyDays <= 60) {
    recency = 4;
  } else if (recencyDays <= 90) {
    recency = 3;
  } else if (recencyDays <= 180) {
    recency = 2;
  } else {
    recency = 1;
  }

  // Frequency: 5回以上=5, 3-4回=4, 2回=3, 1回=2, 0回=1
  let freq: number;
  if (frequency >= 5) {
    freq = 5;
  } else if (frequency >= 3) {
    freq = 4;
  } else if (frequency === 2) {
    freq = 3;
  } else if (frequency === 1) {
    freq = 2;
  } else {
    freq = 1;
  }

  // Monetary: 10万以上=5, 5-10万=4, 3-5万=3, 1-3万=2, 1万未満=1
  let mon: number;
  if (monetary >= 100000) {
    mon = 5;
  } else if (monetary >= 50000) {
    mon = 4;
  } else if (monetary >= 30000) {
    mon = 3;
  } else if (monetary >= 10000) {
    mon = 2;
  } else {
    mon = 1;
  }

  return { recency, frequency: freq, monetary: mon };
}

// ── セグメント判定 ──────────────────────────────────────────
// 判定順序が重要: VIP → 離脱リスク → アクティブ → 新規 → 休眠

export function determineSegment(rfm: RFMScore): SegmentType {
  const { recency, frequency, monetary } = rfm;

  // VIP: recency >= 4 AND frequency >= 4 AND monetary >= 4
  if (recency >= 4 && frequency >= 4 && monetary >= 4) {
    return "vip";
  }

  // 離脱リスク: recency <= 2 AND (frequency >= 3 OR monetary >= 3)
  // 過去は優良だったが最近来ていない
  if (recency <= 2 && (frequency >= 3 || monetary >= 3)) {
    return "churn_risk";
  }

  // アクティブ: recency >= 3 AND (frequency >= 2 OR monetary >= 2)
  if (recency >= 3 && (frequency >= 2 || monetary >= 2)) {
    return "active";
  }

  // 新規: frequency <= 1 AND monetary <= 1
  if (frequency <= 1 && monetary <= 1) {
    return "new";
  }

  // 休眠: それ以外（recency <= 1 AND frequency <= 2 等）
  return "dormant";
}

// ── セグメント分類結果 ──────────────────────────────────────

export interface SegmentResult {
  patientId: string;
  segment: SegmentType;
  rfmScore: RFMScore;
}

// ── 患者一括分類 ──────────────────────────────────────────

export async function classifyPatients(
  tenantId: string | null,
): Promise<SegmentResult[]> {
  // 全患者IDを取得
  const { data: patients } = await withTenant(
    supabaseAdmin.from("patients").select("patient_id"),
    tenantId,
  );

  if (!patients || patients.length === 0) return [];

  const patientIds = patients.map((p: { patient_id: string }) => p.patient_id);

  // バッチサイズで分割して行動データを取得（大量患者対応）
  const BATCH_SIZE = 500;
  const results: SegmentResult[] = [];

  for (let i = 0; i < patientIds.length; i += BATCH_SIZE) {
    const batch = patientIds.slice(i, i + BATCH_SIZE);

    // 行動データを並列取得
    const [visitCounts, purchaseAmounts, lastVisitDates] = await Promise.all([
      getVisitCounts(batch, "all", tenantId),
      getPurchaseAmounts(batch, "all", tenantId),
      getLastVisitDates(batch, tenantId),
    ]);

    const now = new Date();

    for (const pid of batch) {
      const frequency = visitCounts.get(pid) || 0;
      const monetary = purchaseAmounts.get(pid) || 0;
      const lastVisit = lastVisitDates.get(pid) || null;

      // 最終来院日からの経過日数を計算
      let recencyDays: number | null = null;
      if (lastVisit) {
        const visitDate = new Date(lastVisit);
        recencyDays = Math.floor(
          (now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      const rfmScore = calculateRFMScore(recencyDays, frequency, monetary);
      const segment = determineSegment(rfmScore);

      results.push({ patientId: pid, segment, rfmScore });
    }
  }

  return results;
}

// ── DB保存（upsert） ──────────────────────────────────────────

export async function saveSegments(
  results: SegmentResult[],
  tenantId: string | null,
): Promise<void> {
  if (results.length === 0) return;

  // バッチでupsert（Supabaseの制限考慮: 1000件ずつ）
  const UPSERT_BATCH = 1000;

  for (let i = 0; i < results.length; i += UPSERT_BATCH) {
    const batch = results.slice(i, i + UPSERT_BATCH);

    const rows = batch.map((r) => ({
      patient_id: r.patientId,
      segment: r.segment,
      rfm_score: r.rfmScore,
      calculated_at: new Date().toISOString(),
      ...tenantPayload(tenantId),
    }));

    // patient_id + tenant_id の複合主キーでupsert
    const { error } = await supabaseAdmin
      .from("patient_segments")
      .upsert(rows, { onConflict: "patient_id,tenant_id" });

    if (error) {
      console.error("[patient-segments] upsert エラー:", error);
      throw new Error(`セグメント保存エラー: ${error.message}`);
    }
  }
}

// lib/patient-dedup.ts — 患者名寄せ（重複候補検出＋統合）コアロジック

import { supabaseAdmin } from "@/lib/supabase";
import { normalizeJPPhone } from "@/lib/phone";
import { withTenant } from "@/lib/tenant";
import { MERGE_TABLES } from "@/lib/merge-tables";

// --- 型定義 ---

/** DB患者レコード（検出に必要なカラムのみ） */
export interface PatientRecord {
  id: number;
  patient_id: string;
  name: string | null;
  name_kana: string | null;
  tel: string | null;
  email: string | null;
  sex: string | null;
  birthday: string | null;
  line_id: string | null;
  created_at: string;
  tenant_id: string | null;
}

/** 一致理由 */
export interface MatchReason {
  type: "phone_exact" | "phone_normalized" | "name_birthday" | "name_kana_sex";
  description: string;
  score: number;
}

/** 重複候補ペア */
export interface DuplicateCandidate {
  patientA: PatientRecord & { reservationCount: number; orderCount: number };
  patientB: PatientRecord & { reservationCount: number; orderCount: number };
  similarity: number;
  matchReasons: MatchReason[];
  suggestedKeepId: string;
}

// --- レーベンシュタイン距離 ---

/**
 * 2文字列間のレーベンシュタイン距離を算出
 */
export function levenshteinDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // DP配列（メモリ節約のため1行ずつ）
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array<number>(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // 削除
        curr[j - 1] + 1,   // 挿入
        prev[j - 1] + cost, // 置換
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}

// --- 類似度計算 ---

/**
 * 2患者間の類似度スコア（0-100）と一致理由を算出
 */
export function calculateSimilarity(
  a: PatientRecord,
  b: PatientRecord,
): { similarity: number; matchReasons: MatchReason[] } {
  const reasons: MatchReason[] = [];

  // 1. 電話番号完全一致（確度95%）
  if (a.tel && b.tel && a.tel === b.tel) {
    reasons.push({
      type: "phone_exact",
      description: `電話番号完全一致: ${a.tel}`,
      score: 95,
    });
  }
  // 2. 電話番号 normalizeJPPhone() 後一致（確度90%）
  else if (a.tel && b.tel) {
    const normA = normalizeJPPhone(a.tel);
    const normB = normalizeJPPhone(b.tel);
    if (normA && normB && normA === normB) {
      reasons.push({
        type: "phone_normalized",
        description: `電話番号正規化後一致: ${normA}`,
        score: 90,
      });
    }
  }

  // 3. 名前レーベンシュタイン距離 ≤ 2 + 生年月日一致（確度80%）
  if (a.name && b.name && a.birthday && b.birthday && a.birthday === b.birthday) {
    const dist = levenshteinDistance(a.name, b.name);
    if (dist <= 2) {
      reasons.push({
        type: "name_birthday",
        description: `名前類似（距離${dist}）+ 生年月日一致: ${a.birthday}`,
        score: 80,
      });
    }
  }

  // 4. 名前カナ読み一致 + 性別一致（確度70%）
  if (a.name_kana && b.name_kana && a.sex && b.sex) {
    if (a.name_kana === b.name_kana && a.sex === b.sex) {
      reasons.push({
        type: "name_kana_sex",
        description: `カナ読み一致: ${a.name_kana} + 性別一致: ${a.sex}`,
        score: 70,
      });
    }
  }

  // 最も高いスコアを採用
  const similarity = reasons.length > 0
    ? Math.max(...reasons.map((r) => r.score))
    : 0;

  return { similarity, matchReasons: reasons };
}

// --- 重複候補検出 ---

/**
 * テナント内の患者から重複候補ペアを検出
 *
 * パフォーマンス最適化:
 * 1. まず電話番号の重複グループを検出（SQLで高速に絞り込み）
 * 2. 名前+生年月日/カナ+性別の候補をアプリ側で検出
 */
export async function findDuplicateCandidates(
  tenantId: string | null,
  minScore: number = 70,
): Promise<DuplicateCandidate[]> {
  // 全患者を取得（名前・電話番号・生年月日があるレコードのみ）
  let query = supabaseAdmin
    .from("patients")
    .select("id, patient_id, name, name_kana, tel, email, sex, birthday, line_id, created_at, tenant_id")
    .order("created_at", { ascending: true });
  query = withTenant(query, tenantId);

  const { data: patients, error } = await query;
  if (error) throw new Error(`患者データ取得エラー: ${error.message}`);
  if (!patients || patients.length === 0) return [];

  // 各患者の予約数・注文数を事前取得
  const patientIds = patients.map((p) => p.patient_id);

  // 予約数カウント
  let resQuery = supabaseAdmin
    .from("reservations")
    .select("patient_id", { count: "exact", head: false })
    .in("patient_id", patientIds);
  resQuery = withTenant(resQuery, tenantId);
  const { data: reservations } = await resQuery;

  // 注文数カウント
  let ordQuery = supabaseAdmin
    .from("orders")
    .select("patient_id", { count: "exact", head: false })
    .in("patient_id", patientIds);
  ordQuery = withTenant(ordQuery, tenantId);
  const { data: orders } = await ordQuery;

  // カウント集計
  const reservationCounts: Record<string, number> = {};
  const orderCounts: Record<string, number> = {};
  reservations?.forEach((r) => {
    reservationCounts[r.patient_id] = (reservationCounts[r.patient_id] || 0) + 1;
  });
  orders?.forEach((o) => {
    orderCounts[o.patient_id] = (orderCounts[o.patient_id] || 0) + 1;
  });

  // 無視リストを取得
  let ignQuery = supabaseAdmin
    .from("dedup_ignored")
    .select("patient_id_a, patient_id_b");
  ignQuery = withTenant(ignQuery, tenantId);
  const { data: ignoredPairs } = await ignQuery;

  const ignoredSet = new Set<string>();
  ignoredPairs?.forEach((p) => {
    // 双方向でキーを作成
    ignoredSet.add(`${p.patient_id_a}::${p.patient_id_b}`);
    ignoredSet.add(`${p.patient_id_b}::${p.patient_id_a}`);
  });

  const candidates: DuplicateCandidate[] = [];
  const seen = new Set<string>();

  // --- フェーズ1: 電話番号重複グループ ---
  const phoneMap = new Map<string, PatientRecord[]>();
  for (const p of patients) {
    if (!p.tel) continue;
    const normalized = normalizeJPPhone(p.tel);
    if (!normalized) continue;
    const group = phoneMap.get(normalized) || [];
    group.push(p as PatientRecord);
    phoneMap.set(normalized, group);
  }

  for (const group of phoneMap.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const key = [a.patient_id, b.patient_id].sort().join("::");
        if (seen.has(key)) continue;
        if (ignoredSet.has(`${a.patient_id}::${b.patient_id}`)) continue;
        seen.add(key);

        const { similarity, matchReasons } = calculateSimilarity(a, b);
        if (similarity >= minScore) {
          candidates.push({
            patientA: {
              ...a,
              reservationCount: reservationCounts[a.patient_id] || 0,
              orderCount: orderCounts[a.patient_id] || 0,
            },
            patientB: {
              ...b,
              reservationCount: reservationCounts[b.patient_id] || 0,
              orderCount: orderCounts[b.patient_id] || 0,
            },
            similarity,
            matchReasons,
            suggestedKeepId: suggestKeep(
              a,
              b,
              reservationCounts[a.patient_id] || 0,
              orderCounts[a.patient_id] || 0,
              reservationCounts[b.patient_id] || 0,
              orderCounts[b.patient_id] || 0,
            ),
          });
        }
      }
    }
  }

  // --- フェーズ2: 名前+生年月日 / カナ+性別 ---
  // 生年月日が同じ患者のグループ
  const birthdayMap = new Map<string, PatientRecord[]>();
  for (const p of patients) {
    if (!p.birthday || !p.name) continue;
    const group = birthdayMap.get(p.birthday) || [];
    group.push(p as PatientRecord);
    birthdayMap.set(p.birthday, group);
  }

  for (const group of birthdayMap.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const key = [a.patient_id, b.patient_id].sort().join("::");
        if (seen.has(key)) continue;
        if (ignoredSet.has(`${a.patient_id}::${b.patient_id}`)) continue;

        const { similarity, matchReasons } = calculateSimilarity(a, b);
        if (similarity >= minScore) {
          seen.add(key);
          candidates.push({
            patientA: {
              ...a,
              reservationCount: reservationCounts[a.patient_id] || 0,
              orderCount: orderCounts[a.patient_id] || 0,
            },
            patientB: {
              ...b,
              reservationCount: reservationCounts[b.patient_id] || 0,
              orderCount: orderCounts[b.patient_id] || 0,
            },
            similarity,
            matchReasons,
            suggestedKeepId: suggestKeep(
              a,
              b,
              reservationCounts[a.patient_id] || 0,
              orderCounts[a.patient_id] || 0,
              reservationCounts[b.patient_id] || 0,
              orderCounts[b.patient_id] || 0,
            ),
          });
        }
      }
    }
  }

  // カナ+性別グループ
  const kanaMap = new Map<string, PatientRecord[]>();
  for (const p of patients) {
    if (!p.name_kana || !p.sex) continue;
    const key = `${p.name_kana}::${p.sex}`;
    const group = kanaMap.get(key) || [];
    group.push(p as PatientRecord);
    kanaMap.set(key, group);
  }

  for (const group of kanaMap.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const key = [a.patient_id, b.patient_id].sort().join("::");
        if (seen.has(key)) continue;
        if (ignoredSet.has(`${a.patient_id}::${b.patient_id}`)) continue;

        const { similarity, matchReasons } = calculateSimilarity(a, b);
        if (similarity >= minScore) {
          seen.add(key);
          candidates.push({
            patientA: {
              ...a,
              reservationCount: reservationCounts[a.patient_id] || 0,
              orderCount: orderCounts[a.patient_id] || 0,
            },
            patientB: {
              ...b,
              reservationCount: reservationCounts[b.patient_id] || 0,
              orderCount: orderCounts[b.patient_id] || 0,
            },
            similarity,
            matchReasons,
            suggestedKeepId: suggestKeep(
              a,
              b,
              reservationCounts[a.patient_id] || 0,
              orderCounts[a.patient_id] || 0,
              reservationCounts[b.patient_id] || 0,
              orderCounts[b.patient_id] || 0,
            ),
          });
        }
      }
    }
  }

  // 確度順にソート（降順）
  candidates.sort((a, b) => b.similarity - a.similarity);

  return candidates;
}

// --- 保持推奨ロジック ---

/**
 * どちらの患者を残すべきか推奨
 * 優先順位: LINE連携あり > 予約数が多い > 注文数が多い > 作成日が古い
 */
function suggestKeep(
  a: PatientRecord,
  b: PatientRecord,
  aRes: number,
  aOrd: number,
  bRes: number,
  bOrd: number,
): string {
  // LINE連携優先
  if (a.line_id && !b.line_id) return a.patient_id;
  if (!a.line_id && b.line_id) return b.patient_id;

  // 予約数
  if (aRes !== bRes) return aRes > bRes ? a.patient_id : b.patient_id;

  // 注文数
  if (aOrd !== bOrd) return aOrd > bOrd ? a.patient_id : b.patient_id;

  // 作成日が古い方を優先
  return new Date(a.created_at) <= new Date(b.created_at) ? a.patient_id : b.patient_id;
}

// --- 患者統合実行 ---

/**
 * 患者統合: removeId のデータを keepId に移し、removeId を削除
 *
 * 処理内容:
 * 1. MERGE_TABLES（reservations, orders, reorders, message_log, patient_tags, patient_marks, friend_field_values）
 *    の patient_id を keepId に UPDATE
 * 2. intake テーブルの patient_id を keepId に UPDATE
 * 3. removeId の patients レコードを soft delete（merged_into に keepId を設定）
 */
export async function mergePatients(
  keepId: string,
  removeId: string,
  tenantId: string | null,
): Promise<{ ok: boolean; error?: string; details?: Record<string, number> }> {
  const details: Record<string, number> = {};

  try {
    // 統合元・統合先の存在確認
    const { data: keepPatient } = await supabaseAdmin
      .from("patients")
      .select("patient_id")
      .eq("patient_id", keepId)
      .single();

    if (!keepPatient) {
      return { ok: false, error: `保持先患者（${keepId}）が見つかりません` };
    }

    const { data: removePatient } = await supabaseAdmin
      .from("patients")
      .select("patient_id")
      .eq("patient_id", removeId)
      .single();

    if (!removePatient) {
      return { ok: false, error: `統合元患者（${removeId}）が見つかりません` };
    }

    // 1. MERGE_TABLES の各テーブルで patient_id を更新
    for (const table of MERGE_TABLES) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .update({ patient_id: keepId })
        .eq("patient_id", removeId)
        .select("id");

      if (error) {
        console.error(`[dedup] ${table} UPDATE エラー:`, error);
        // patient_tags や patient_marks で重複キー制約に当たる可能性がある
        // その場合は重複レコードを削除してからリトライ
        if (error.code === "23505") {
          // 重複分を削除
          await supabaseAdmin
            .from(table)
            .delete()
            .eq("patient_id", removeId);
          details[table] = 0;
          continue;
        }
        return { ok: false, error: `${table} の更新に失敗: ${error.message}` };
      }

      details[table] = data?.length || 0;
    }

    // 2. intake テーブルの patient_id を更新
    const { data: intakeData, error: intakeError } = await supabaseAdmin
      .from("intake")
      .update({ patient_id: keepId })
      .eq("patient_id", removeId)
      .select("id");

    if (intakeError) {
      console.error("[dedup] intake UPDATE エラー:", intakeError);
      return { ok: false, error: `intake の更新に失敗: ${intakeError.message}` };
    }
    details["intake"] = intakeData?.length || 0;

    // 3. 統合元患者を soft delete（merged_into カラム設定）
    const { error: deleteError } = await supabaseAdmin
      .from("patients")
      .update({ merged_into: keepId })
      .eq("patient_id", removeId);

    if (deleteError) {
      console.error("[dedup] patients soft-delete エラー:", deleteError);
      // merged_into カラムが存在しない場合は物理削除
      if (deleteError.code === "PGRST204" || deleteError.message.includes("merged_into")) {
        const { error: hardDeleteError } = await supabaseAdmin
          .from("patients")
          .delete()
          .eq("patient_id", removeId);

        if (hardDeleteError) {
          return { ok: false, error: `患者削除に失敗: ${hardDeleteError.message}` };
        }
        details["patients_deleted"] = 1;
      } else {
        return { ok: false, error: `患者ソフト削除に失敗: ${deleteError.message}` };
      }
    } else {
      details["patients_soft_deleted"] = 1;
    }

    return { ok: true, details };
  } catch (err) {
    console.error("[dedup] mergePatients 予期せぬエラー:", err);
    return { ok: false, error: `予期せぬエラー: ${err}` };
  }
}

// --- 無視リスト管理 ---

/**
 * 重複候補を無視リストに追加
 */
export async function ignoreDuplicatePair(
  patientIdA: string,
  patientIdB: string,
  tenantId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  // 常にソート済みで保存（重複防止）
  const [idA, idB] = [patientIdA, patientIdB].sort();

  const { error } = await supabaseAdmin
    .from("dedup_ignored")
    .upsert(
      {
        patient_id_a: idA,
        patient_id_b: idB,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
      { onConflict: "patient_id_a,patient_id_b" },
    );

  if (error) {
    console.error("[dedup] 無視リスト追加エラー:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

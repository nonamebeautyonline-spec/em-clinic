"use client";

import { useState, useEffect, useCallback } from "react";

// --- 型定義 ---

interface PatientInfo {
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
  reservationCount: number;
  orderCount: number;
}

interface MatchReason {
  type: string;
  description: string;
  score: number;
}

interface DuplicateCandidate {
  patientA: PatientInfo;
  patientB: PatientInfo;
  similarity: number;
  matchReasons: MatchReason[];
  suggestedKeepId: string;
}

// --- 確度バッジの色設定 ---

function getSimilarityBadge(score: number) {
  if (score >= 95) return { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" };
  if (score >= 90) return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" };
  if (score >= 80) return { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" };
  return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };
}

function formatDate(s: string | null): string {
  if (!s) return "-";
  // YYYY-MM-DD 形式
  if (s.includes("T")) {
    const d = new Date(s);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }
  return s.replace(/-/g, "/");
}

// --- メインページ ---

export default function DedupPatientsPage() {
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(70);
  const [error, setError] = useState<string | null>(null);

  // 統合確認モーダル
  const [mergeModal, setMergeModal] = useState<{
    candidate: DuplicateCandidate;
    keepId: string;
    removeId: string;
  } | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<{ ok: boolean; message: string } | null>(null);

  // 無視処理中
  const [ignoringPair, setIgnoringPair] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/dedup-patients?min_score=${minScore}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.ok) {
        setCandidates(data.candidates);
      } else {
        setError(data.error || "取得に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    }
    setLoading(false);
  }, [minScore]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // 統合実行
  const handleMerge = async () => {
    if (!mergeModal) return;
    setMerging(true);
    setMergeResult(null);

    try {
      const res = await fetch("/api/admin/dedup-patients/merge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keep_id: mergeModal.keepId,
          remove_id: mergeModal.removeId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMergeResult({ ok: true, message: data.message });
        // 候補一覧から統合済みペアを除去
        setCandidates((prev) =>
          prev.filter(
            (c) =>
              !(c.patientA.patient_id === mergeModal.candidate.patientA.patient_id &&
                c.patientB.patient_id === mergeModal.candidate.patientB.patient_id),
          ),
        );
        // モーダルを閉じる
        setTimeout(() => {
          setMergeModal(null);
          setMergeResult(null);
        }, 1500);
      } else {
        setMergeResult({ ok: false, message: data.error || "統合に失敗しました" });
      }
    } catch {
      setMergeResult({ ok: false, message: "通信エラーが発生しました" });
    }
    setMerging(false);
  };

  // 無視
  const handleIgnore = async (candidate: DuplicateCandidate) => {
    const pairKey = `${candidate.patientA.patient_id}::${candidate.patientB.patient_id}`;
    setIgnoringPair(pairKey);

    try {
      const res = await fetch("/api/admin/dedup-patients", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id_a: candidate.patientA.patient_id,
          patient_id_b: candidate.patientB.patient_id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        // 候補一覧から除去
        setCandidates((prev) =>
          prev.filter(
            (c) =>
              !(c.patientA.patient_id === candidate.patientA.patient_id &&
                c.patientB.patient_id === candidate.patientB.patient_id),
          ),
        );
      }
    } catch {
      // エラーは無視
    }
    setIgnoringPair(null);
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                患者名寄せ
              </h1>
              <p className="text-sm text-gray-400 mt-1">同一患者の可能性があるレコードを検出</p>
            </div>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
          <label className="text-sm font-medium text-gray-600">最低確度:</label>
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          >
            <option value={95}>95%</option>
            <option value={90}>90%</option>
            <option value={80}>80%</option>
            <option value={70}>70%</option>
          </select>
          <button
            onClick={fetchCandidates}
            disabled={loading}
            className="ml-2 px-4 py-1.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "検索中..." : "検索"}
          </button>
          {!loading && (
            <span className="ml-auto text-sm text-gray-400">
              {candidates.length}件の候補
            </span>
          )}
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-violet-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">重複候補を検出中...</p>
        </div>
      )}

      {/* 候補なし */}
      {!loading && !error && candidates.length === 0 && (
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">重複候補はありません</p>
          <p className="text-sm text-gray-400 mt-1">確度{minScore}%以上の重複候補は検出されませんでした</p>
        </div>
      )}

      {/* 候補一覧 */}
      {!loading && candidates.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-8 space-y-4">
          {candidates.map((candidate, idx) => {
            const badge = getSimilarityBadge(candidate.similarity);
            const pairKey = `${candidate.patientA.patient_id}::${candidate.patientB.patient_id}`;

            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* 確度ヘッダー */}
                <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      確度 {candidate.similarity}%
                    </span>
                    <span className="text-xs text-gray-400">
                      {candidate.matchReasons.map((r) => r.description).join(" / ")}
                    </span>
                  </div>
                </div>

                {/* 患者情報の比較表示 */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  <PatientCard
                    patient={candidate.patientA}
                    isSuggested={candidate.suggestedKeepId === candidate.patientA.patient_id}
                    onKeep={() =>
                      setMergeModal({
                        candidate,
                        keepId: candidate.patientA.patient_id,
                        removeId: candidate.patientB.patient_id,
                      })
                    }
                  />
                  <PatientCard
                    patient={candidate.patientB}
                    isSuggested={candidate.suggestedKeepId === candidate.patientB.patient_id}
                    onKeep={() =>
                      setMergeModal({
                        candidate,
                        keepId: candidate.patientB.patient_id,
                        removeId: candidate.patientA.patient_id,
                      })
                    }
                  />
                </div>

                {/* アクション */}
                <div className="px-4 py-2.5 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => handleIgnore(candidate)}
                    disabled={ignoringPair === pairKey}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    {ignoringPair === pairKey ? "処理中..." : "この候補を無視する"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 統合確認モーダル */}
      {mergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !merging && setMergeModal(null)}
          />

          {/* モーダル本体 */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">患者統合の確認</h3>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800 font-medium">
                この操作は取り消せません
              </p>
              <p className="text-xs text-amber-600 mt-1">
                統合元の患者データ（予約・注文・メッセージ等）はすべて保持先に移動されます。
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs text-emerald-600 font-medium mb-1">保持する患者</p>
                <p className="text-sm font-bold text-gray-900">
                  {(() => {
                    const p = mergeModal.keepId === mergeModal.candidate.patientA.patient_id
                      ? mergeModal.candidate.patientA
                      : mergeModal.candidate.patientB;
                    return `${p.name || "名前なし"} (${p.patient_id})`;
                  })()}
                </p>
              </div>
              <div className="flex justify-center">
                <svg className="w-5 h-5 text-gray-400 rotate-90 md:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-600 font-medium mb-1">統合される患者（削除）</p>
                <p className="text-sm font-bold text-gray-900">
                  {(() => {
                    const p = mergeModal.removeId === mergeModal.candidate.patientA.patient_id
                      ? mergeModal.candidate.patientA
                      : mergeModal.candidate.patientB;
                    return `${p.name || "名前なし"} (${p.patient_id})`;
                  })()}
                </p>
              </div>
            </div>

            {/* 結果表示 */}
            {mergeResult && (
              <div
                className={`mb-4 rounded-lg p-3 text-sm ${
                  mergeResult.ok
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {mergeResult.message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMergeModal(null);
                  setMergeResult(null);
                }}
                disabled={merging}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleMerge}
                disabled={merging || mergeResult?.ok === true}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {merging ? "統合中..." : "統合を実行"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 患者カード ---

function PatientCard({
  patient,
  isSuggested,
  onKeep,
}: {
  patient: PatientInfo;
  isSuggested: boolean;
  onKeep: () => void;
}) {
  return (
    <div className="p-4 space-y-2">
      {/* 名前・ID */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-gray-900">
          {patient.name || "名前なし"}
        </span>
        <span className="text-xs text-gray-400 font-mono">{patient.patient_id}</span>
        {isSuggested && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">
            推奨
          </span>
        )}
      </div>

      {/* 詳細情報 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="text-gray-500">
          電話番号: <span className="text-gray-800">{patient.tel || "-"}</span>
        </div>
        <div className="text-gray-500">
          メール: <span className="text-gray-800">{patient.email || "-"}</span>
        </div>
        <div className="text-gray-500">
          生年月日: <span className="text-gray-800">{formatDate(patient.birthday)}</span>
        </div>
        <div className="text-gray-500">
          性別: <span className="text-gray-800">{patient.sex || "-"}</span>
        </div>
        <div className="text-gray-500">
          LINE: <span className={patient.line_id ? "text-emerald-600 font-medium" : "text-gray-400"}>
            {patient.line_id ? "連携済み" : "未連携"}
          </span>
        </div>
        <div className="text-gray-500">
          登録日: <span className="text-gray-800">{formatDate(patient.created_at)}</span>
        </div>
      </div>

      {/* 予約数・注文数 */}
      <div className="flex gap-3 pt-1">
        <span className="inline-flex items-center gap-1 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          <span className="text-gray-500">予約</span>
          <span className="font-medium text-gray-800">{patient.reservationCount}件</span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-gray-500">注文</span>
          <span className="font-medium text-gray-800">{patient.orderCount}件</span>
        </span>
      </div>

      {/* 保持ボタン */}
      <button
        onClick={onKeep}
        className={`w-full mt-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
          isSuggested
            ? "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
        }`}
      >
        {isSuggested ? "こちらを保持（推奨）" : "こちらを保持"}
      </button>
    </div>
  );
}

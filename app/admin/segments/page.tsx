"use client";

import { useState, useEffect, useCallback } from "react";

// ── セグメント型定義 ──────────────────────────────────────────

type SegmentType = "vip" | "active" | "churn_risk" | "dormant" | "new";

interface PatientSegment {
  patientId: string;
  name: string | null;
  nameKana: string | null;
  tel: string | null;
  lineId: string | null;
  rfmScore: { recency: number; frequency: number; monetary: number };
  calculatedAt: string;
}

interface SegmentData {
  segments: Record<SegmentType, PatientSegment[]>;
  summary: Record<SegmentType, number>;
  total: number;
}

// ── セグメント表示設定 ──────────────────────────────────────────

const SEGMENT_CONFIG: {
  key: SegmentType;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
}[] = [
  {
    key: "vip",
    label: "VIP",
    color: "#FFD700",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-800",
    description: "高頻度・高額・最近来院",
  },
  {
    key: "active",
    label: "アクティブ",
    color: "#22C55E",
    bgColor: "bg-green-50",
    textColor: "text-green-800",
    description: "定期的に来院中",
  },
  {
    key: "churn_risk",
    label: "離脱リスク",
    color: "#F97316",
    bgColor: "bg-orange-50",
    textColor: "text-orange-800",
    description: "過去は優良だが最近来院なし",
  },
  {
    key: "dormant",
    label: "休眠",
    color: "#94A3B8",
    bgColor: "bg-slate-50",
    textColor: "text-slate-600",
    description: "長期間来院なし",
  },
  {
    key: "new",
    label: "新規",
    color: "#3B82F6",
    bgColor: "bg-blue-50",
    textColor: "text-blue-800",
    description: "初回来院または未来院",
  },
];

export default function SegmentsPage() {
  const [data, setData] = useState<SegmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<SegmentType>("vip");
  const [recalculating, setRecalculating] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState("");

  // ── データ取得 ──────────────────────────────────────────

  const loadSegments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/segments");
      if (!res.ok) {
        if (res.status === 401) {
          setError("認証が必要です。ログインしてください。");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError("セグメントデータの取得に失敗しました");
      console.error("[segments] 取得エラー:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  // ── 再計算 ──────────────────────────────────────────

  const handleRecalculate = async () => {
    if (recalculating) return;
    setRecalculating(true);
    setRecalcMessage("");
    try {
      const res = await fetch("/api/admin/segments/recalculate", {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRecalcMessage(
        `再計算完了: ${json.processed}名を処理しました`,
      );
      // データを再読み込み
      await loadSegments();
    } catch (err) {
      setRecalcMessage("再計算に失敗しました");
      console.error("[segments] 再計算エラー:", err);
    } finally {
      setRecalculating(false);
    }
  };

  // ── RFMスコアバッジ ──────────────────────────────────────

  const RFMBadge = ({ label, value }: { label: string; value: number }) => {
    const colors = [
      "",
      "bg-red-100 text-red-700",
      "bg-orange-100 text-orange-700",
      "bg-yellow-100 text-yellow-700",
      "bg-green-100 text-green-700",
      "bg-emerald-100 text-emerald-700",
    ];
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colors[value] || ""}`}
      >
        {label}:{value}
      </span>
    );
  };

  // ── レンダリング ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  const activeConfig = SEGMENT_CONFIG.find((c) => c.key === activeTab)!;
  const activePatients = data?.segments[activeTab] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              患者セグメント
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              RFM分析に基づく患者の自動分類（合計: {data?.total || 0}名）
            </p>
          </div>
          <div className="flex items-center gap-3">
            {recalcMessage && (
              <span className="text-sm text-gray-600">{recalcMessage}</span>
            )}
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {recalculating ? "再計算中..." : "再計算"}
            </button>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {SEGMENT_CONFIG.map((config) => {
            const count = data?.summary[config.key] || 0;
            const percentage =
              data?.total && data.total > 0
                ? Math.round((count / data.total) * 100)
                : 0;
            return (
              <button
                key={config.key}
                onClick={() => setActiveTab(config.key)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  activeTab === config.key
                    ? "border-indigo-500 shadow-md"
                    : "border-transparent hover:border-gray-300"
                } ${config.bgColor}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className={`font-semibold text-sm ${config.textColor}`}>
                    {config.label}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500">
                  {percentage}% / {config.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* セグメント別患者一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeConfig.color }}
              />
              <h2 className="text-lg font-semibold text-gray-900">
                {activeConfig.label}
              </h2>
              <span className="text-sm text-gray-500">
                ({activePatients.length}名)
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {activeConfig.description}
            </p>
          </div>

          {activePatients.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p>該当する患者がいません</p>
              <p className="text-sm mt-1">
                「再計算」ボタンでセグメントを更新してください
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      患者ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      氏名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      電話番号
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RFMスコア
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      計算日時
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activePatients.map((patient) => (
                    <tr key={patient.patientId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {patient.patientId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.name || "未登録"}
                        {patient.nameKana && (
                          <span className="ml-2 text-xs text-gray-400">
                            {patient.nameKana}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.tel || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          <RFMBadge label="R" value={patient.rfmScore.recency} />
                          <RFMBadge
                            label="F"
                            value={patient.rfmScore.frequency}
                          />
                          <RFMBadge
                            label="M"
                            value={patient.rfmScore.monetary}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.calculatedAt
                          ? new Date(patient.calculatedAt).toLocaleString(
                              "ja-JP",
                            )
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

// ── AIセグメント型定義 ──────────────────────────────────────────

interface AIQueryPatient {
  patient_id: string;
  name: string;
}

export default function SegmentsPage() {
  const [data, setData] = useState<SegmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<SegmentType>("vip");
  const [recalculating, setRecalculating] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState("");

  // ── AIセグメント状態 ──────────────────────────────────────────
  const [aiQuery, setAiQuery] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiExecuting, setAiExecuting] = useState(false);
  const [aiSQL, setAiSQL] = useState<string | null>(null);
  const [aiPatients, setAiPatients] = useState<AIQueryPatient[] | null>(null);
  const [aiCount, setAiCount] = useState<number | null>(null);
  const [aiError, setAiError] = useState("");
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

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

  // ── AIセグメント: SQL生成 ──────────────────────────────────

  const handleAiGenerate = async () => {
    if (!aiQuery.trim() || aiGenerating) return;
    setAiGenerating(true);
    setAiError("");
    setAiSQL(null);
    setAiPatients(null);
    setAiCount(null);
    try {
      const res = await fetch("/api/admin/line/segments/ai-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery.trim(), execute: false }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setAiError(json.error || "SQL生成に失敗しました");
        if (json.sql) setAiSQL(json.sql);
        return;
      }
      setAiSQL(json.sql);
    } catch (err) {
      setAiError("AIクエリの送信に失敗しました");
      console.error("[ai-query] 生成エラー:", err);
    } finally {
      setAiGenerating(false);
    }
  };

  // ── AIセグメント: SQL実行 ──────────────────────────────────

  const handleAiExecute = async () => {
    if (!aiSQL || aiExecuting) return;
    setAiExecuting(true);
    setAiError("");
    setAiPatients(null);
    setAiCount(null);
    try {
      const res = await fetch("/api/admin/line/segments/ai-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery.trim(), execute: true, sql: aiSQL }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setAiError(json.error || "クエリ実行に失敗しました");
        return;
      }
      setAiPatients(json.patients || []);
      setAiCount(json.count ?? 0);
    } catch (err) {
      setAiError("クエリ実行に失敗しました");
      console.error("[ai-query] 実行エラー:", err);
    } finally {
      setAiExecuting(false);
    }
  };

  // ── AIセグメント: リセット ──────────────────────────────────

  const handleAiReset = () => {
    setAiQuery("");
    setAiSQL(null);
    setAiPatients(null);
    setAiCount(null);
    setAiError("");
    aiInputRef.current?.focus();
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

        {/* AIセグメント */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">
                AIセグメント
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              自然言語で患者の検索条件を入力し、AIがSQLクエリに変換します
            </p>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* 入力エリア */}
            <div>
              <label htmlFor="ai-query" className="block text-sm font-medium text-gray-700 mb-1">
                検索条件（自然言語）
              </label>
              <textarea
                ref={aiInputRef}
                id="ai-query"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="例: 3ヶ月以内に2回以上来院し、平均単価5000円以上の患者"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleAiGenerate();
                  }
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">
                  Cmd+Enter でSQL生成
                </span>
                <div className="flex gap-2">
                  {(aiSQL || aiPatients) && (
                    <button
                      onClick={handleAiReset}
                      className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      リセット
                    </button>
                  )}
                  <button
                    onClick={handleAiGenerate}
                    disabled={!aiQuery.trim() || aiGenerating}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiGenerating ? "生成中..." : "SQL生成"}
                  </button>
                </div>
              </div>
            </div>

            {/* エラー表示 */}
            {aiError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{aiError}</p>
              </div>
            )}

            {/* SQLプレビュー */}
            {aiSQL && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      生成されたSQL
                    </span>
                    <span className="text-xs text-gray-400">
                      実行前にSQLを確認してください
                    </span>
                  </div>
                  <pre className="p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto font-mono whitespace-pre-wrap">
                    {aiSQL}
                  </pre>
                </div>
                {!aiPatients && (
                  <button
                    onClick={handleAiExecute}
                    disabled={aiExecuting}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiExecuting ? "実行中..." : "実行"}
                  </button>
                )}
              </div>
            )}

            {/* 結果表示 */}
            {aiPatients !== null && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      該当患者
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {aiCount}名
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      // 患者IDリストをクリップボードにコピー
                      const ids = aiPatients.map(p => p.patient_id).join("\n");
                      navigator.clipboard.writeText(ids);
                    }}
                    className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    IDをコピー
                  </button>
                </div>
                {aiPatients.length === 0 ? (
                  <div className="py-6 text-center text-gray-500 text-sm">
                    該当する患者がいません
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            #
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            患者ID
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            氏名
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {aiPatients.map((patient, idx) => (
                          <tr key={patient.patient_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-xs text-gray-400">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-2 text-sm font-mono text-gray-900">
                              {patient.patient_id}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {patient.name}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
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

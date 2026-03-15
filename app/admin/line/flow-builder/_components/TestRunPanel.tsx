"use client";

import { useState } from "react";

interface TestRunStep {
  nodeId: string;
  stepOrder: number;
  stepType: string;
  action: string;
  result: "executed" | "skipped" | "branched" | "exited" | "completed";
  detail: string;
  branchLabel?: string;
}

interface TestRunPanelProps {
  scenarioId: number;
  onHighlightNode: (nodeId: string) => void;
  onClose: () => void;
}

const RESULT_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  executed: { color: "#22c55e", bg: "#f0fdf4", icon: "M9 12l2 2 4-4" },
  skipped: { color: "#9ca3af", bg: "#f9fafb", icon: "M13 7l5 5m0 0l-5 5m5-5H6" },
  branched: { color: "#3b82f6", bg: "#eff6ff", icon: "M8 9l4-4 4 4m0 6l-4 4-4-4" },
  exited: { color: "#ef4444", bg: "#fef2f2", icon: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" },
  completed: { color: "#10b981", bg: "#ecfdf5", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
};

export default function TestRunPanel({ scenarioId, onHighlightNode, onClose }: TestRunPanelProps) {
  const [patientId, setPatientId] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestRunStep[] | null>(null);
  const [patientInfo, setPatientInfo] = useState<{ patient_id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!patientId.trim()) return;
    setRunning(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/admin/line/flow-builder/test-run", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_id: scenarioId, patient_id: patientId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "テスト実行に失敗しました");
        return;
      }
      setResults(data.results || []);
      setPatientInfo(data.patient || null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-emerald-50">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-bold text-emerald-800">テスト実行</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 患者ID入力 */}
      <div className="px-4 py-3 border-b border-gray-100">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">テスト対象の患者ID</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="患者IDを入力..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onKeyDown={(e) => e.key === "Enter" && handleRun()}
          />
          <button
            onClick={handleRun}
            disabled={running || !patientId.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-40"
          >
            {running ? "..." : "実行"}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          ドライラン: 実際のLINE送信は行いません
        </p>
      </div>

      {/* エラー */}
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* 結果 */}
      <div className="flex-1 overflow-y-auto">
        {patientInfo && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-500">
              患者: <span className="font-medium text-gray-700">{patientInfo.name || patientInfo.patient_id}</span>
            </p>
          </div>
        )}

        {results && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-300">
            <p className="text-sm">実行するステップがありません</p>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="py-2">
            {results.map((step, i) => {
              const config = RESULT_CONFIG[step.result] || RESULT_CONFIG.executed;
              return (
                <button
                  key={i}
                  onClick={() => step.nodeId !== "overflow" && step.nodeId !== "node-end" && onHighlightNode(step.nodeId)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
                >
                  <div className="flex items-start gap-2">
                    {/* タイムラインライン */}
                    <div className="flex flex-col items-center mt-1">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: config.bg, border: `1.5px solid ${config.color}` }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke={config.color} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={config.icon} />
                        </svg>
                      </div>
                      {i < results.length - 1 && (
                        <div className="w-0.5 h-4 bg-gray-200 mt-0.5" />
                      )}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-gray-700">{step.action}</span>
                        {step.branchLabel && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ color: config.color, backgroundColor: config.bg }}
                          >
                            {step.branchLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

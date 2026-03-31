"use client";

import { useState } from "react";
import useSWR from "swr";

interface TraceEntry {
  id: number;
  draft_id: number;
  patient_id: string;
  rewritten_query: string | null;
  classification_result: Record<string, unknown>;
  policy_decision: Record<string, unknown>;
  candidate_examples: Array<Record<string, unknown>>;
  reranked_examples: Array<Record<string, unknown>>;
  candidate_chunks: Array<Record<string, unknown>>;
  tool_calls: Array<Record<string, unknown>>;
  patient_state_snapshot: Record<string, unknown>;
  prompt_hash: string | null;
  model_name: string | null;
  created_at: string;
  draft: {
    id: number;
    status: string;
    ai_category: string;
    confidence: number;
    original_message: string;
    draft_reply: string;
    model_used: string;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  pending: "bg-yellow-50 text-yellow-700",
  expired: "bg-gray-50 text-gray-500",
};

export default function AiReplyEvalsPage() {
  const { data, isLoading } = useSWR("/api/admin/line/ai-reply-evals?limit=50");
  const traces: TraceEntry[] = data?.traces || [];
  const [expanded, setExpanded] = useState<number | null>(null);

  if (isLoading) return <div className="p-6 text-gray-500">読み込み中...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">AI返信 トレース / Eval</h1>
        <p className="text-sm text-gray-500 mt-1">
          各AI返信のパイプライン全ステップを可視化。分類→ポリシー→検索→生成の全プロセスを確認できます。
        </p>
      </div>

      {traces.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">
          トレースデータはまだありません。AI返信が実行されると自動的に蓄積されます。
        </div>
      ) : (
        <div className="space-y-2">
          {traces.map(trace => (
            <div key={trace.id} className="bg-white rounded-lg border">
              <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === trace.id ? null : trace.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-gray-400">{new Date(trace.created_at).toLocaleString("ja-JP")}</span>
                  {trace.draft && (
                    <>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[trace.draft.status] || "bg-gray-100"}`}>
                        {trace.draft.status}
                      </span>
                      <span className="text-xs text-gray-500">{trace.draft.ai_category}</span>
                      <span className="text-sm text-gray-700 truncate max-w-xs">
                        {trace.draft.original_message?.slice(0, 50)}
                      </span>
                    </>
                  )}
                  <span className="text-xs text-gray-400">患者: {trace.patient_id}</span>
                </div>
                <span className="text-gray-400 text-sm">{expanded === trace.id ? "▲" : "▼"}</span>
              </div>

              {expanded === trace.id && (
                <div className="border-t p-4 space-y-4 text-sm">
                  {/* 分類結果 */}
                  <div>
                    <h3 className="font-medium text-gray-600 mb-1">分類結果</h3>
                    <pre className="bg-gray-50 rounded p-2 text-xs overflow-x-auto">
                      {JSON.stringify(trace.classification_result, null, 2)}
                    </pre>
                  </div>

                  {/* ポリシー判定 */}
                  {trace.policy_decision && Object.keys(trace.policy_decision).length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-600 mb-1">ポリシー判定</h3>
                      <pre className="bg-gray-50 rounded p-2 text-xs overflow-x-auto">
                        {JSON.stringify(trace.policy_decision, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* リライトクエリ */}
                  {trace.rewritten_query && (
                    <div>
                      <h3 className="font-medium text-gray-600 mb-1">リライトクエリ</h3>
                      <p className="text-gray-700 bg-blue-50 rounded px-2 py-1">{trace.rewritten_query}</p>
                    </div>
                  )}

                  {/* 検索結果 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-600 mb-1">候補例 ({trace.reranked_examples.length}件)</h3>
                      <div className="space-y-1">
                        {trace.reranked_examples.slice(0, 5).map((ex, i) => (
                          <div key={i} className="text-xs bg-gray-50 rounded p-1.5">
                            Q: {String(ex.question || "").slice(0, 60)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-600 mb-1">KBチャンク ({trace.candidate_chunks.length}件)</h3>
                      <div className="space-y-1">
                        {trace.candidate_chunks.slice(0, 5).map((c, i) => (
                          <div key={i} className="text-xs bg-gray-50 rounded p-1.5">
                            {String(c.title || "").slice(0, 60)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ツール呼び出し */}
                  {trace.tool_calls.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-600 mb-1">ツール呼び出し ({trace.tool_calls.length}件)</h3>
                      <pre className="bg-gray-50 rounded p-2 text-xs overflow-x-auto">
                        {JSON.stringify(trace.tool_calls, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* 生成結果 */}
                  {trace.draft && (
                    <div>
                      <h3 className="font-medium text-gray-600 mb-1">生成結果</h3>
                      <div className="bg-gray-50 rounded p-2 space-y-1">
                        <p className="text-xs text-gray-400">モデル: {trace.model_name} | 信頼度: {trace.draft.confidence}</p>
                        <p className="text-gray-700">{trace.draft.draft_reply}</p>
                      </div>
                    </div>
                  )}

                  {/* メタ情報 */}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>プロンプトHash: {trace.prompt_hash || "N/A"}</span>
                    <span>患者状態: {JSON.stringify(trace.patient_state_snapshot).slice(0, 80)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

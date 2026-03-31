"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useConfirmModal } from "@/hooks/useConfirmModal";

interface VariantStats {
  total: number;
  sent: number;
  rejected: number;
  approvalRate: number;
  avgConfidence: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}

interface ExperimentEntry {
  id: number;
  experiment_name: string;
  config: { control: Record<string, unknown>; variant: Record<string, unknown> };
  traffic_ratio: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  results: { control: VariantStats; variant: VariantStats } | null;
  suggestion: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "下書き", color: "bg-gray-100 text-gray-600" },
  running: { label: "実行中", color: "bg-green-50 text-green-700" },
  completed: { label: "完了", color: "bg-blue-50 text-blue-700" },
};

export default function AiReplyExperimentsPage() {
  const apiKey = "/api/admin/line/ai-reply-experiments";
  const { data, isLoading } = useSWR(apiKey);
  const experiments: ExperimentEntry[] = data?.experiments || [];
  const { confirm, ConfirmDialog } = useConfirmModal();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    traffic_ratio: 0.5,
    control_threshold: 0.35,
    variant_threshold: 0.25,
    control_max_examples: 5,
    variant_max_examples: 8,
  });

  const handleCreate = async () => {
    await fetch(apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experiment_name: form.name,
        traffic_ratio: form.traffic_ratio,
        config: {
          control: { rag_similarity_threshold: form.control_threshold, rag_max_examples: form.control_max_examples },
          variant: { rag_similarity_threshold: form.variant_threshold, rag_max_examples: form.variant_max_examples },
        },
      }),
    });
    mutate(apiKey);
    setShowForm(false);
  };

  const handleAction = async (id: number, action: string) => {
    if (action === "start") {
      const ok = await confirm({ title: "実験開始", message: "この実験を開始しますか？トラフィックの一部がvariant設定で処理されます。" });
      if (!ok) return;
    }
    await fetch(apiKey, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    mutate(apiKey);
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({ title: "実験削除", message: "この実験を削除しますか？", variant: "danger", confirmLabel: "削除" });
    if (!ok) return;
    await fetch(apiKey, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    mutate(apiKey);
  };

  if (isLoading) return <div className="p-6 text-gray-500">読み込み中...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">AI返信 A/Bテスト実験</h1>
        <p className="text-sm text-gray-500 mt-1">
          RAGパラメータやモデルをA/Bテストし、KPI比較で最適設定を発見します。
        </p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
          + 新規実験
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500">実験名</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="例: RAG閾値テスト" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600">Control（現行）</h3>
              <div>
                <label className="text-xs text-gray-500">類似度閾値</label>
                <input type="number" step="0.05" value={form.control_threshold} onChange={e => setForm(f => ({ ...f, control_threshold: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">最大例数</label>
                <input type="number" value={form.control_max_examples} onChange={e => setForm(f => ({ ...f, control_max_examples: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600">Variant（テスト）</h3>
              <div>
                <label className="text-xs text-gray-500">類似度閾値</label>
                <input type="number" step="0.05" value={form.variant_threshold} onChange={e => setForm(f => ({ ...f, variant_threshold: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">最大例数</label>
                <input type="number" value={form.variant_max_examples} onChange={e => setForm(f => ({ ...f, variant_max_examples: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Variant比率 (0.0-1.0)</label>
            <input type="number" step="0.1" min="0" max="1" value={form.traffic_ratio} onChange={e => setForm(f => ({ ...f, traffic_ratio: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-500">キャンセル</button>
            <button onClick={handleCreate} disabled={!form.name} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50">作成</button>
          </div>
        </div>
      )}

      {experiments.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400 text-sm">
          まだ実験はありません。
        </div>
      ) : (
        <div className="space-y-4">
          {experiments.map(exp => (
            <div key={exp.id} className="bg-white rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-gray-700">{exp.experiment_name}</h3>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_LABELS[exp.status]?.color || "bg-gray-100"}`}>
                    {STATUS_LABELS[exp.status]?.label || exp.status}
                  </span>
                  <span className="text-xs text-gray-400">比率: {exp.traffic_ratio * 100}%</span>
                </div>
                <div className="flex items-center gap-2">
                  {exp.status === "draft" && (
                    <button onClick={() => handleAction(exp.id, "start")} className="text-xs text-green-600 hover:text-green-800">開始</button>
                  )}
                  {exp.status === "running" && (
                    <button onClick={() => handleAction(exp.id, "stop")} className="text-xs text-orange-600 hover:text-orange-800">停止</button>
                  )}
                  <button onClick={() => handleDelete(exp.id)} className="text-xs text-red-400 hover:text-red-600">削除</button>
                </div>
              </div>

              {/* 設定比較 */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-50 rounded p-2">
                  <span className="font-medium text-gray-500">Control:</span>
                  <span className="ml-2 text-gray-600">{JSON.stringify(exp.config.control)}</span>
                </div>
                <div className="bg-blue-50 rounded p-2">
                  <span className="font-medium text-blue-500">Variant:</span>
                  <span className="ml-2 text-gray-600">{JSON.stringify(exp.config.variant)}</span>
                </div>
              </div>

              {/* 結果 */}
              {exp.results && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard label="Control" stats={exp.results.control} />
                    <StatCard label="Variant" stats={exp.results.variant} />
                  </div>
                  {exp.suggestion && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm text-yellow-800">
                      💡 {exp.suggestion}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}

function StatCard({ label, stats }: { label: string; stats: { total: number; sent: number; rejected: number; approvalRate: number; avgConfidence: number; avgInputTokens: number; avgOutputTokens: number } }) {
  return (
    <div className="bg-gray-50 rounded p-3 text-xs space-y-1">
      <div className="font-medium text-gray-600">{label} ({stats.total}件)</div>
      <div className="grid grid-cols-2 gap-1">
        <span>承認率: <b>{stats.approvalRate}%</b></span>
        <span>信頼度: <b>{stats.avgConfidence}</b></span>
        <span>送信: {stats.sent}件</span>
        <span>却下: {stats.rejected}件</span>
        <span>入力トークン: {stats.avgInputTokens}</span>
        <span>出力トークン: {stats.avgOutputTokens}</span>
      </div>
    </div>
  );
}

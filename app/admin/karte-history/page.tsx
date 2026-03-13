"use client";

import { useSearchParams } from "next/navigation";
import useSWR from "swr";

interface HistoryEntry {
  id: number;
  intake_id: number;
  note_before: string | null;
  note_after: string | null;
  karte_status_before: string | null;
  karte_status_after: string | null;
  change_reason: string | null;
  changed_by: string;
  changed_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  confirmed: "確定済",
};

export default function KarteHistoryPage() {
  const searchParams = useSearchParams();
  const intakeId = searchParams.get("intakeId");

  const { data, isLoading: loading } = useSWR<{ history: HistoryEntry[] }>(
    intakeId ? `/api/admin/karte-history?intakeId=${intakeId}` : null
  );
  const history = data?.history || [];

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    } catch {
      return iso;
    }
  };

  if (!intakeId) {
    return <div className="p-8 text-center text-gray-500">intakeIdが指定されていません</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-lg font-bold mb-4">カルテ変更履歴</h1>
      <p className="text-sm text-gray-500 mb-4">Intake ID: {intakeId}</p>

      {loading ? (
        <div className="text-center text-gray-400 py-8">読み込み中...</div>
      ) : history.length === 0 ? (
        <div className="text-center text-gray-400 py-8">変更履歴がありません</div>
      ) : (
        <div className="space-y-4">
          {history.map((h) => (
            <div key={h.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{h.changed_by}</span>
                  {h.karte_status_before !== h.karte_status_after && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {STATUS_LABELS[h.karte_status_before || "draft"] || h.karte_status_before}
                      {" → "}
                      {STATUS_LABELS[h.karte_status_after || "draft"] || h.karte_status_after}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{formatDate(h.changed_at)}</span>
              </div>

              {h.change_reason && (
                <div className="mb-2 text-xs bg-amber-50 border border-amber-200 rounded px-3 py-1.5 text-amber-700">
                  理由: {h.change_reason}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-medium text-gray-500 mb-1">変更前</div>
                  <pre className="whitespace-pre-wrap bg-red-50 rounded p-2 text-gray-700 max-h-40 overflow-auto">
                    {h.note_before || "(空)"}
                  </pre>
                </div>
                <div>
                  <div className="font-medium text-gray-500 mb-1">変更後</div>
                  <pre className="whitespace-pre-wrap bg-green-50 rounded p-2 text-gray-700 max-h-40 overflow-auto">
                    {h.note_after || "(空)"}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Reorder {
  id: string;
  timestamp: string;
  patient_id: string;
  patient_name: string;
  product_code: string;
  status: string;
  note: string;
  line_uid?: string;
  lstep_uid?: string;
  line_notify_result?: "sent" | "no_uid" | "failed" | null;
  history?: Array<{
    date: string;
    mg: string;
    months: string;
  }>;
}

export default function ReordersPage() {
  const router = useRouter();
  const [reorders, setReorders] = useState<Reorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    // 認証はlayout.tsxで行うため、ここではデータ取得のみ
    loadReorders();
  }, [filter]);

  const loadReorders = async () => {
    setLoading(true);
    setError("");

    try {
      const includeAll = filter === "all" ? "true" : "false";
      const res = await fetch(`/api/admin/reorders?include_all=${includeAll}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("再処方データ取得失敗");
      }

      const data = await res.json();
      setReorders(data.reorders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const [lineNotifyResult, setLineNotifyResult] = useState<{ id: string; status: "sent" | "no_uid" | "failed" } | null>(null);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    setLineNotifyResult(null);
    try {
      const res = await fetch("/api/admin/reorders/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error("承認処理に失敗しました");
      }

      const data = await res.json();

      // LINE通知結果を表示
      if (data.lineNotify) {
        setLineNotifyResult({ id, status: data.lineNotify });
      }

      // リロード
      await loadReorders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("本当に却下しますか？")) return;

    setProcessing(id);
    try {
      const res = await fetch("/api/admin/reorders/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error("却下処理に失敗しました");
      }

      // リロード
      await loadReorders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setProcessing(null);
    }
  };

  const getLStepUrl = (lstepUid?: string) => {
    if (!lstepUid) return null;
    return `https://manager.linestep.net/line/visual?member=${encodeURIComponent(lstepUid)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">再処方リスト</h1>
          <p className="text-slate-600 text-sm mt-1">再処方申請の承認・却下</p>
        </div>

        {/* フィルター */}
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "pending" | "all")}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">承認待ちのみ</option>
            <option value="all">すべて表示</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {lineNotifyResult && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          lineNotifyResult.status === "sent"
            ? "bg-green-50 border border-green-200 text-green-800"
            : lineNotifyResult.status === "no_uid"
            ? "bg-yellow-50 border border-yellow-200 text-yellow-800"
            : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {lineNotifyResult.status === "sent"
            ? "LINE通知を送信しました"
            : lineNotifyResult.status === "no_uid"
            ? "LINE通知未送信（LINE UID未取得の患者です）"
            : "LINE通知の送信に失敗しました"}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  申請日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  PID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  患者名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  商品コード
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  LINE通知
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Lステップ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reorders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    {filter === "pending"
                      ? "承認待ちの再処方申請はありません"
                      : "再処方申請はありません"}
                  </td>
                </tr>
              ) : (
                reorders.map((reorder) => (
                  <tr key={reorder.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {reorder.timestamp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900">
                      <button
                        onClick={() => window.open(`/admin/line/talk?patient_id=${reorder.patient_id}`, '_blank')}
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {reorder.patient_id}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {reorder.patient_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {reorder.product_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          reorder.status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : reorder.status === "canceled" || reorder.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : reorder.status === "paid"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {reorder.status === "confirmed"
                          ? "承認済み"
                          : reorder.status === "canceled"
                          ? "キャンセル"
                          : reorder.status === "rejected"
                          ? "却下"
                          : reorder.status === "paid"
                          ? "決済済み"
                          : "承認待ち"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {reorder.line_notify_result === "sent" ? (
                        <span className="text-green-600 font-medium">送信済</span>
                      ) : reorder.line_notify_result === "no_uid" ? (
                        <span className="text-yellow-600 font-medium">UID無</span>
                      ) : reorder.line_notify_result === "failed" ? (
                        <span className="text-red-600 font-medium">失敗</span>
                      ) : reorder.status === "pending" ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getLStepUrl(reorder.lstep_uid) ? (
                        <a
                          href={getLStepUrl(reorder.lstep_uid)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 hover:underline"
                        >
                          開く
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {reorder.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(reorder.id)}
                            disabled={processing === reorder.id}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                          >
                            {processing === reorder.id ? "処理中..." : "許可"}
                          </button>
                          <button
                            onClick={() => handleReject(reorder.id)}
                            disabled={processing === reorder.id}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                          >
                            {processing === reorder.id ? "処理中..." : "却下"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

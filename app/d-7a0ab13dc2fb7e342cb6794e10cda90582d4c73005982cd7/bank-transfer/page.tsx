"use client";

import { useState, useMemo } from "react";
import {
  DEMO_BANK_TRANSFERS,
  DEMO_PATIENTS,
  type DemoBankTransfer,
} from "../_data/mock";

// ステータスフィルタ
const STATUS_FILTERS = ["全て", "未照合", "照合済み", "不一致"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// ステータス色定義
const statusColors: Record<DemoBankTransfer["status"], string> = {
  "未照合": "bg-yellow-100 text-yellow-700",
  "照合済み": "bg-green-100 text-green-700",
  "不一致": "bg-red-100 text-red-700",
};

// 金額フォーマット
function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export default function DemoBankTransferPage() {
  // データ（ローカルstate）
  const [transfers, setTransfers] =
    useState<DemoBankTransfer[]>(DEMO_BANK_TRANSFERS);

  // フィルタ
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("全て");

  // モーダル
  const [modalTransferId, setModalTransferId] = useState<string | null>(null);
  const [modalPatientId, setModalPatientId] = useState<string>("");
  const [modalSearch, setModalSearch] = useState("");

  // トースト
  const [toast, setToast] = useState<string | null>(null);

  // フィルタリング
  const filteredTransfers = useMemo(() => {
    if (statusFilter === "全て") return transfers;
    return transfers.filter((t) => t.status === statusFilter);
  }, [statusFilter, transfers]);

  // ステータス件数
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { "全て": transfers.length };
    for (const t of transfers) {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    return counts;
  }, [transfers]);

  // モーダル対象の振込データ
  const modalTransfer = useMemo(() => {
    if (!modalTransferId) return null;
    return transfers.find((t) => t.id === modalTransferId) ?? null;
  }, [modalTransferId, transfers]);

  // モーダル内の患者検索
  const filteredPatients = useMemo(() => {
    if (!modalSearch.trim()) return DEMO_PATIENTS;
    const query = modalSearch.trim().toLowerCase();
    return DEMO_PATIENTS.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.kana.toLowerCase().includes(query)
    );
  }, [modalSearch]);

  // トースト表示
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // 照合ボタン押下
  const openMatchModal = (transferId: string) => {
    setModalTransferId(transferId);
    setModalPatientId("");
    setModalSearch("");
  };

  // モーダルを閉じる
  const closeModal = () => {
    setModalTransferId(null);
    setModalPatientId("");
    setModalSearch("");
  };

  // マッチング確定
  const confirmMatch = () => {
    if (!modalTransferId || !modalPatientId) return;

    const patient = DEMO_PATIENTS.find((p) => p.id === modalPatientId);
    if (!patient) return;

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === modalTransferId
          ? {
              ...t,
              status: "照合済み" as const,
              matchedPatient: patient.name,
              matchedPaymentId: `PAY-${t.id}`,
            }
          : t
      )
    );

    showToast(
      `${modalTransfer?.senderName} → ${patient.name} の照合が完了しました`
    );
    closeModal();
  };

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* トースト通知 */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">銀行振込照合</h1>
        <p className="text-sm text-slate-500 mt-1">
          銀行振込の入金データと患者をマッチングします
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs font-medium text-yellow-600 mb-1">未照合</p>
          <p className="text-lg font-bold text-yellow-700">
            {statusCounts["未照合"] ?? 0}件
          </p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-medium text-green-600 mb-1">照合済み</p>
          <p className="text-lg font-bold text-green-700">
            {statusCounts["照合済み"] ?? 0}件
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-600 mb-1">不一致</p>
          <p className="text-lg font-bold text-red-700">
            {statusCounts["不一致"] ?? 0}件
          </p>
        </div>
      </div>

      {/* フィルタ */}
      <div className="flex gap-2 flex-wrap mb-6">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              statusFilter === filter
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {filter}
            <span className="ml-1 text-xs opacity-70">
              ({statusCounts[filter] ?? 0})
            </span>
          </button>
        ))}
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  振込日
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  振込名義
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  銀行名
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  マッチング先
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.length > 0 ? (
                filteredTransfers.map((transfer, idx) => (
                  <tr
                    key={transfer.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      idx % 2 === 0 ? "" : "bg-slate-50/30"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {transfer.transferDate}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                      {transfer.senderName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 font-medium text-right tabular-nums">
                      {formatYen(transfer.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {transfer.bankName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusColors[transfer.status]
                        }`}
                      >
                        {transfer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {transfer.matchedPatient ? (
                        <span className="text-green-700 font-medium">
                          {transfer.matchedPatient}
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {transfer.status === "未照合" ? (
                        <button
                          onClick={() => openMatchModal(transfer.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          照合
                        </button>
                      ) : transfer.status === "不一致" ? (
                        <button
                          onClick={() => openMatchModal(transfer.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                        >
                          再照合
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">--</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    該当する振込データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* フッター */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex justify-between items-center">
          <p className="text-sm text-slate-500">
            {filteredTransfers.length}件表示中
          </p>
          <p className="text-sm">
            <span className="text-slate-500">合計金額: </span>
            <span className="font-bold text-slate-800 tabular-nums">
              {formatYen(
                filteredTransfers.reduce((sum, t) => sum + t.amount, 0)
              )}
            </span>
          </p>
        </div>
      </div>

      {/* 照合モーダル */}
      {modalTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
          />

          {/* モーダル本体 */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                振込照合
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <svg
                  className="w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 振込情報 */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">振込名義</p>
                  <p className="text-slate-800 font-medium">
                    {modalTransfer.senderName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">金額</p>
                  <p className="text-slate-800 font-medium tabular-nums">
                    {formatYen(modalTransfer.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">振込日</p>
                  <p className="text-slate-800">
                    {modalTransfer.transferDate}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">銀行名</p>
                  <p className="text-slate-800">{modalTransfer.bankName}</p>
                </div>
              </div>
            </div>

            {/* 患者検索 */}
            <div className="px-6 pt-4 pb-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                患者を選択
              </label>
              <input
                type="text"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="患者名・カナで検索..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 患者リスト */}
            <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0 max-h-60">
              <div className="space-y-1">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setModalPatientId(patient.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      modalPatientId === patient.id
                        ? "bg-blue-50 border border-blue-300"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {patient.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {patient.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {patient.kana}
                      </p>
                    </div>
                    {modalPatientId === patient.id && (
                      <svg
                        className="w-5 h-5 text-blue-600 shrink-0 ml-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                ))}
                {filteredPatients.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">
                    該当する患者がいません
                  </p>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={confirmMatch}
                disabled={!modalPatientId}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                照合を確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

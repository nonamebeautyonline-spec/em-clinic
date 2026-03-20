// 手動照合モーダル（手動確認 + 手動紐づけの2種類を統合）
"use client";

import type { PendingOrder, BankStatement, UnlinkedOrder } from "./types";

// --- 手動確認モーダル ---
interface ManualConfirmModalProps {
  order: PendingOrder;
  memo: string;
  confirming: boolean;
  onMemoChange: (memo: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function ManualConfirmModal({
  order,
  memo,
  confirming,
  onMemoChange,
  onConfirm,
  onClose,
}: ManualConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">銀行振込を手動確認</h3>
          <p className="text-sm text-slate-600 mt-1">
            この注文を振込確認済みとして処理します
          </p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="bg-slate-50 rounded p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">患者ID:</span>
              <button onClick={() => window.open(`/admin/line/talk?pid=${order.patient_id}`, '_blank')} className="font-mono text-blue-600 hover:text-blue-900 hover:underline">
                {order.patient_id}
              </button>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">氏名:</span>
              <span className="text-slate-900">
                {order.patient_name || "-"}
                {order.account_name && (
                  <span className="text-slate-500">（{order.account_name}）</span>
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">商品:</span>
              <span className="text-slate-900">{order.product_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">金額:</span>
              <span className="font-medium text-slate-900">¥{order.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">申請日時:</span>
              <span className="text-slate-900">
                {new Date(order.created_at).toLocaleString("ja-JP")}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              メモ（任意）
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => onMemoChange(e.target.value)}
              placeholder="例: 振込名義違いのため手動確認"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-sm text-yellow-800">
              <strong>注意:</strong> この操作を実行すると、注文のステータスが「confirmed」に変更され、発送可能な状態になります。
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
            disabled={confirming}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${
              confirming
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {confirming ? "処理中..." : "確認済みにする"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 手動紐づけモーダル（単体 or 合算） ---
interface LinkModalProps {
  linkTarget: BankStatement | null;
  linkTargets: BankStatement[];
  linkOrderId: string;
  linking: boolean;
  loadingUnlinked: boolean;
  unlinkedOrders: UnlinkedOrder[];
  onLinkOrderIdChange: (id: string) => void;
  onLink: () => void;
  onClose: () => void;
}

export function LinkModal({
  linkTarget,
  linkTargets,
  linkOrderId,
  linking,
  loadingUnlinked,
  unlinkedOrders,
  onLinkOrderIdChange,
  onLink,
  onClose,
}: LinkModalProps) {
  const isMulti = linkTargets.length > 0;
  const targets = isMulti ? linkTargets : (linkTarget ? [linkTarget] : []);
  const totalDeposit = targets.reduce((sum, t) => sum + t.deposit, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            {isMulti ? `入金を合算して注文に紐づけ（${targets.length}件）` : "入金を注文に紐づけ"}
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            {isMulti ? "選択した入金の合算額に対応する注文を選択してください" : "この入金に対応する注文を選択してください"}
          </p>
        </div>
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <div className={`rounded p-4 space-y-2 ${isMulti ? "bg-purple-50" : "bg-blue-50"}`}>
            {targets.map((t, ti) => (
              <div key={t.id} className={`${ti > 0 ? "pt-2 border-t border-purple-200" : ""}`}>
                <div className="flex justify-between text-sm">
                  <span className={isMulti ? "text-purple-700" : "text-blue-700"}>取引日:</span>
                  <span className={`font-medium ${isMulti ? "text-purple-900" : "text-blue-900"}`}>{t.transaction_date}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isMulti ? "text-purple-700" : "text-blue-700"}>摘要:</span>
                  <span className={`font-medium ${isMulti ? "text-purple-900" : "text-blue-900"}`}>{t.description}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isMulti ? "text-purple-700" : "text-blue-700"}>入金額:</span>
                  <span className="font-bold text-green-700">¥{t.deposit.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {isMulti && (
              <div className="pt-2 border-t border-purple-300 flex justify-between text-sm">
                <span className="text-purple-700 font-semibold">合計:</span>
                <span className="font-bold text-purple-700">¥{totalDeposit.toLocaleString()}</span>
              </div>
            )}
          </div>

          {loadingUnlinked ? (
            <div className="text-center py-4 text-slate-500">注文一覧を読み込み中...</div>
          ) : unlinkedOrders.length === 0 ? (
            <div className="text-center py-4 text-slate-500">紐づけ可能な注文がありません</div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                未照合の注文（{unlinkedOrders.length}件）
              </p>
              {unlinkedOrders.map((order) => {
                const isSelected = linkOrderId === order.id;
                const amountMatch = order.amount === totalDeposit;
                return (
                  <button
                    key={order.id}
                    onClick={() => onLinkOrderIdChange(order.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : amountMatch
                        ? "border-green-300 bg-green-50 hover:border-green-400"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-blue-500 bg-blue-500" : "border-slate-300"
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {order.id}
                            {amountMatch && <span className="ml-2 text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded">金額一致</span>}
                          </div>
                          <div className="text-xs text-slate-500">
                            {order.shipping_name || order.account_name || order.patient_id}
                            {order.account_name && <span className="ml-1">（{order.account_name}）</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${amountMatch ? "text-green-700" : "text-slate-900"}`}>
                          ¥{order.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(order.created_at).toLocaleDateString("ja-JP")}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
            disabled={linking}
          >
            キャンセル
          </button>
          <button
            onClick={onLink}
            disabled={linking || !linkOrderId.trim()}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${
              linking || !linkOrderId.trim()
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : isMulti ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {linking ? "処理中..." : isMulti ? `${targets.length}件を合算紐づけ` : "紐づけて照合済みにする"}
          </button>
        </div>
      </div>
    </div>
  );
}

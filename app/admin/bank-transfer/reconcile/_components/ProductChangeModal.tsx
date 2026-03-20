// 商品変更モーダル
"use client";

import type { PendingOrder, Product } from "./types";

interface ProductChangeModalProps {
  order: PendingOrder;
  products: Product[];
  newProductCode: string;
  memo: string;
  changing: boolean;
  onNewProductCodeChange: (code: string) => void;
  onMemoChange: (memo: string) => void;
  onChangeProduct: () => void;
  onClose: () => void;
}

export default function ProductChangeModal({
  order,
  products,
  newProductCode,
  memo,
  changing,
  onNewProductCodeChange,
  onMemoChange,
  onChangeProduct,
  onClose,
}: ProductChangeModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={() => !changing && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">商品変更</h3>
          <p className="text-sm text-slate-600 mt-1">
            この注文の商品を変更します（金額も自動更新されます）
          </p>
        </div>
        <div className="px-6 py-4 space-y-4">
          {/* 注文情報 */}
          <div className="bg-slate-50 rounded p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">患者ID:</span>
              <button
                onClick={() => window.open(`/admin/line/talk?pid=${order.patient_id}`, "_blank")}
                className="font-mono text-blue-600 hover:text-blue-900 hover:underline"
              >
                {order.patient_id}
              </button>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">氏名:</span>
              <span className="text-slate-900">{order.patient_name || order.shipping_name || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">現在の商品:</span>
              <span className="text-slate-900">{order.product_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">現在の金額:</span>
              <span className="font-medium text-slate-900">¥{order.amount.toLocaleString()}</span>
            </div>
          </div>

          {/* 新商品選択 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">変更先の商品</label>
            <select
              value={newProductCode}
              onChange={(e) => onNewProductCodeChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">選択してください</option>
              {products
                .filter((p) => p.code !== order.product_code)
                .map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.title} (¥{p.price.toLocaleString()})
                  </option>
                ))}
            </select>
          </div>

          {/* 変更後の金額・差額表示 */}
          {newProductCode && (() => {
            const newPrice = products.find((p) => p.code === newProductCode)?.price || 0;
            const diff = newPrice - order.amount;
            return (
              <div className="bg-orange-50 border border-orange-200 rounded p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-orange-800">変更後の金額:</span>
                  <span className="font-bold text-orange-900">¥{newPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-800">差額:</span>
                  <span className={`font-bold ${diff >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    {diff >= 0 ? "+" : ""}¥{diff.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">メモ（任意）</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => onMemoChange(e.target.value)}
              placeholder="例: 患者から電話で2.5mg→5mgに変更依頼"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-sm text-yellow-800">
              <strong>注意:</strong> 商品コード・商品名・金額が一括変更されます。振込金額との差額がある場合は別途確認してください。
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
            disabled={changing}
          >
            閉じる
          </button>
          <button
            onClick={onChangeProduct}
            disabled={changing || !newProductCode}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${
              changing || !newProductCode
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-orange-500 text-white hover:bg-orange-600"
            }`}
          >
            {changing ? "処理中..." : "商品を変更する"}
          </button>
        </div>
      </div>
    </div>
  );
}

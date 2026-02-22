"use client";

// 商品管理ページ（デモ用）
// モックデータを使用して商品の一覧表示・追加・編集・有効/無効切替を提供する

import { useState } from "react";
import { DEMO_PRODUCTS, type DemoProduct } from "../_data/mock";

// 新規追加時の初期値
const EMPTY_PRODUCT: Omit<DemoProduct, "sortOrder"> = {
  code: "",
  name: "",
  drugName: "",
  dosage: "",
  duration: "1ヶ月",
  quantity: 4,
  price: 0,
  category: "注射",
  isActive: true,
};

export default function DemoProductsPage() {
  // 商品一覧の状態管理
  const [products, setProducts] = useState<DemoProduct[]>([...DEMO_PRODUCTS]);
  // モーダルで編集中の商品
  const [modalProduct, setModalProduct] = useState<DemoProduct | null>(null);
  // 新規追加モードかどうか
  const [isNewModal, setIsNewModal] = useState(false);
  // トースト通知メッセージ
  const [toast, setToast] = useState<string | null>(null);

  // トースト表示（3秒で自動非表示）
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 表示順でソート
  const sorted = [...products].sort((a, b) => a.sortOrder - b.sortOrder);

  // 有効/無効トグル
  const toggleActive = (code: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.code !== code) return p;
        const updated = { ...p, isActive: !p.isActive };
        showToast(updated.isActive ? "商品を有効にしました" : "商品を無効にしました");
        return updated;
      })
    );
  };

  // 編集モーダルを開く
  const openEdit = (product: DemoProduct) => {
    setModalProduct({ ...product });
    setIsNewModal(false);
  };

  // 新規追加モーダルを開く
  const openNew = () => {
    const maxSort = Math.max(...products.map((p) => p.sortOrder), 0);
    setModalProduct({ ...EMPTY_PRODUCT, sortOrder: maxSort + 1 });
    setIsNewModal(true);
  };

  // 保存処理
  const handleSave = () => {
    if (!modalProduct) return;
    if (!modalProduct.code || !modalProduct.name) {
      showToast("商品コードと商品名は必須です");
      return;
    }
    if (isNewModal) {
      // 重複コードチェック
      if (products.some((p) => p.code === modalProduct.code)) {
        showToast("この商品コードは既に使用されています");
        return;
      }
      setProducts((prev) => [...prev, modalProduct]);
      showToast("商品を追加しました");
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.code === modalProduct.code ? modalProduct : p))
      );
      showToast("商品を更新しました");
    }
    setModalProduct(null);
  };

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto">
      {/* トースト通知 */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-6">商品管理</h1>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          + 新規追加
        </button>
      </div>

      {/* 商品テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">商品コード</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">商品名</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">用量</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">期間</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">本数</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">価格</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">ステータス</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((p) => (
                <tr
                  key={p.code}
                  className={`hover:bg-slate-50 transition-colors ${
                    !p.isActive ? "opacity-60" : ""
                  }`}
                >
                  {/* 商品コード */}
                  <td className="px-4 py-3 text-sm font-mono text-slate-600">
                    {p.code}
                  </td>
                  {/* 商品名 */}
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {p.name}
                  </td>
                  {/* 用量 */}
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {p.dosage}
                  </td>
                  {/* 期間 */}
                  <td className="px-4 py-3 text-sm text-slate-600 text-center">
                    {p.duration}
                  </td>
                  {/* 本数 */}
                  <td className="px-4 py-3 text-sm text-slate-600 text-center">
                    {p.quantity}本
                  </td>
                  {/* 価格（¥表記） */}
                  <td className="px-4 py-3 text-sm text-slate-800 text-right font-medium">
                    ¥{p.price.toLocaleString()}
                  </td>
                  {/* ステータスバッジ（有効=緑 / 無効=灰色）+ クリックでトグル */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(p.code)}
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        p.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {p.isActive ? "有効" : "無効"}
                    </button>
                  </td>
                  {/* 操作 */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openEdit(p)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-medium transition-colors"
                    >
                      編集
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新規追加/編集モーダル */}
      {modalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setModalProduct(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* モーダルヘッダー */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800">
                {isNewModal ? "商品を追加" : "商品を編集"}
              </h2>
              <button
                onClick={() => setModalProduct(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg
                  className="w-5 h-5 text-slate-500"
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

            {/* モーダル本体 */}
            <div className="p-6 space-y-4">
              {/* 商品コード */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  商品コード
                </label>
                <input
                  type="text"
                  value={modalProduct.code}
                  onChange={(e) =>
                    setModalProduct({ ...modalProduct, code: e.target.value })
                  }
                  disabled={!isNewModal}
                  placeholder="例: MJL_2.5mg_1m"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>

              {/* 商品名 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  商品名
                </label>
                <input
                  type="text"
                  value={modalProduct.name}
                  onChange={(e) =>
                    setModalProduct({ ...modalProduct, name: e.target.value })
                  }
                  placeholder="例: マンジャロ 2.5mg（1ヶ月）"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 薬品名・用量 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    薬品名
                  </label>
                  <input
                    type="text"
                    value={modalProduct.drugName}
                    onChange={(e) =>
                      setModalProduct({
                        ...modalProduct,
                        drugName: e.target.value,
                      })
                    }
                    placeholder="例: チルゼパチド"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    用量
                  </label>
                  <input
                    type="text"
                    value={modalProduct.dosage}
                    onChange={(e) =>
                      setModalProduct({
                        ...modalProduct,
                        dosage: e.target.value,
                      })
                    }
                    placeholder="例: 2.5mg"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 期間・本数・価格 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    期間
                  </label>
                  <input
                    type="text"
                    value={modalProduct.duration}
                    onChange={(e) =>
                      setModalProduct({
                        ...modalProduct,
                        duration: e.target.value,
                      })
                    }
                    placeholder="例: 1ヶ月"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    本数
                  </label>
                  <input
                    type="number"
                    value={modalProduct.quantity}
                    onChange={(e) =>
                      setModalProduct({
                        ...modalProduct,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    価格
                  </label>
                  <input
                    type="number"
                    value={modalProduct.price}
                    onChange={(e) =>
                      setModalProduct({
                        ...modalProduct,
                        price: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* カテゴリ・表示順 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={modalProduct.category}
                    onChange={(e) =>
                      setModalProduct({
                        ...modalProduct,
                        category: e.target.value as "注射" | "内服",
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="注射">注射</option>
                    <option value="内服">内服</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    表示順
                  </label>
                  <input
                    type="number"
                    value={modalProduct.sortOrder}
                    onChange={(e) =>
                      setModalProduct({
                        ...modalProduct,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 有効チェックボックス */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={modalProduct.isActive}
                  onChange={(e) =>
                    setModalProduct({
                      ...modalProduct,
                      isActive: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300"
                />
                <label className="text-sm text-slate-600">有効にする</label>
              </div>

              {/* 保存・キャンセルボタン */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => setModalProduct(null)}
                  className="py-2.5 px-6 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

// Step 3: 商品登録
import { useState, useEffect } from "react";
import { StepNavigation } from "./Step1Line";

interface Product {
  id?: string;
  code: string;
  title: string;
  drug_name: string;
  dosage?: string;
  price: number;
  category: string;
}

interface Props {
  completed: boolean;
  onNext: () => void;
  onBack: () => void;
}

// デフォルト商品（マンジャロ全用量）
const DEFAULT_PRODUCTS: Omit<Product, "id">[] = [
  { code: "MJ-2.5-1M", title: "マンジャロ 2.5mg 1ヶ月分", drug_name: "マンジャロ", dosage: "2.5mg", price: 39800, category: "injection" },
  { code: "MJ-5.0-1M", title: "マンジャロ 5mg 1ヶ月分", drug_name: "マンジャロ", dosage: "5mg", price: 49800, category: "injection" },
  { code: "MJ-7.5-1M", title: "マンジャロ 7.5mg 1ヶ月分", drug_name: "マンジャロ", dosage: "7.5mg", price: 59800, category: "injection" },
  { code: "MJ-10-1M", title: "マンジャロ 10mg 1ヶ月分", drug_name: "マンジャロ", dosage: "10mg", price: 69800, category: "injection" },
  { code: "MJ-12.5-1M", title: "マンジャロ 12.5mg 1ヶ月分", drug_name: "マンジャロ", dosage: "12.5mg", price: 79800, category: "injection" },
  { code: "MJ-15-1M", title: "マンジャロ 15mg 1ヶ月分", drug_name: "マンジャロ", dosage: "15mg", price: 89800, category: "injection" },
];

export default function Step3Products({ completed, onNext, onBack }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  // 手動追加フォーム
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDrugName, setNewDrugName] = useState("");
  const [newCategory, setNewCategory] = useState("injection");
  const [addingSingle, setAddingSingle] = useState(false);

  // 商品一覧を取得
  useEffect(() => {
    fetch("/api/admin/products", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((data) => setProducts(data.products || []))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  // デフォルト商品をインポート
  const handleImport = async () => {
    setImporting(true);
    setError("");

    try {
      const results: Product[] = [];
      for (const p of DEFAULT_PRODUCTS) {
        // 同じコードの商品が既にあればスキップ
        if (products.some((existing) => existing.code === p.code)) continue;

        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(p),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.product) results.push(data.product);
        }
      }
      setProducts((prev) => [...prev, ...results]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "インポートに失敗しました");
    } finally {
      setImporting(false);
    }
  };

  // 手動で1件追加
  const handleAddSingle = async () => {
    if (!newTitle.trim() || !newPrice) {
      setError("商品名と価格は必須です");
      return;
    }
    const price = parseInt(newPrice, 10);
    if (isNaN(price) || price <= 0) {
      setError("有効な価格を入力してください");
      return;
    }

    setAddingSingle(true);
    setError("");

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: `CUSTOM-${Date.now()}`,
          title: newTitle.trim(),
          drug_name: newDrugName.trim() || undefined,
          price,
          category: newCategory,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "商品の追加に失敗しました");
      }

      const data = await res.json();
      if (data.product) {
        setProducts((prev) => [...prev, data.product]);
      }
      // フォームリセット
      setNewTitle("");
      setNewPrice("");
      setNewDrugName("");
      setNewCategory("injection");
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setAddingSingle(false);
    }
  };

  const hasProducts = products.length > 0;
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(price);

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-lg font-bold text-slate-900 mb-1">商品登録</h2>
      <p className="text-sm text-slate-500 mb-6">
        処方商品を登録してください。デフォルト商品をインポートすることもできます。
      </p>

      {/* エラー */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 完了済みバナー */}
      {completed && hasProducts && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-800">{products.length}件の商品が登録済みです</p>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      {!loadingProducts && (
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleImport}
            disabled={importing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                インポート中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                デフォルト商品をインポート
              </>
            )}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            手動で追加
          </button>
        </div>
      )}

      {/* 手動追加フォーム */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                商品名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例: リベルサス 3mg"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                価格 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="例: 29800"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">薬品名</label>
              <input
                type="text"
                value={newDrugName}
                onChange={(e) => setNewDrugName(e.target.value)}
                placeholder="例: リベルサス"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">カテゴリ</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="injection">注射</option>
                <option value="oral">内服</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleAddSingle}
              disabled={addingSingle}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {addingSingle ? "追加中..." : "追加"}
            </button>
          </div>
        </div>
      )}

      {/* 登録済み商品一覧 */}
      {loadingProducts ? (
        <div className="py-8 text-center text-sm text-slate-400">読み込み中...</div>
      ) : hasProducts ? (
        <div className="mb-6 border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">商品名</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">価格</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.slice(0, 10).map((p, i) => (
                <tr key={p.id || i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-900">{p.title}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700 font-medium">{formatPrice(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length > 10 && (
            <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500 text-center">
              他 {products.length - 10}件
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 py-8 text-center text-sm text-slate-400 border border-dashed border-slate-300 rounded-lg">
          商品がまだ登録されていません
        </div>
      )}

      <StepNavigation
        onBack={onBack}
        onNext={onNext}
        nextLabel="次へ"
        nextDisabled={!hasProducts}
        showSkip={!hasProducts}
        onSkip={onNext}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";

type Product = {
  id: string;
  code: string;
  title: string;
  drug_name: string;
  dosage: string | null;
  duration_months: number | null;
  quantity: number | null;
  price: number;
  is_active: boolean;
  sort_order: number;
  category: string;
  image_url: string | null;
  stock_quantity: number | null;
  discount_price: number | null;
  discount_until: string | null;
  description: string | null;
  parent_id: string | null;
};

type FormData = {
  code: string;
  title: string;
  drug_name: string;
  dosage: string;
  duration_months: string;
  quantity: string;
  price: string;
  category: string;
  sort_order: string;
  image_url: string;
  stock_quantity: string;
  discount_price: string;
  discount_until: string;
  description: string;
  parent_id: string;
};

const EMPTY_FORM: FormData = {
  code: "",
  title: "",
  drug_name: "マンジャロ",
  dosage: "",
  duration_months: "",
  quantity: "",
  price: "",
  category: "injection",
  sort_order: "0",
  image_url: "",
  stock_quantity: "",
  discount_price: "",
  discount_until: "",
  description: "",
  parent_id: "",
};

const CATEGORY_LABELS: Record<string, string> = {
  injection: "注射",
  oral: "内服",
  other: "その他",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Sort order editing
  const [editingSortOrder, setEditingSortOrder] = useState<Record<string, string>>({});
  const [savingSortOrder, setSavingSortOrder] = useState<Record<string, boolean>>({});

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/products", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`データ取得失敗 (${res.status})`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setSaveError("");
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      code: product.code,
      title: product.title,
      drug_name: product.drug_name,
      dosage: product.dosage || "",
      duration_months: product.duration_months?.toString() || "",
      quantity: product.quantity?.toString() || "",
      price: product.price.toString(),
      category: product.category,
      sort_order: product.sort_order.toString(),
      image_url: product.image_url || "",
      stock_quantity: product.stock_quantity?.toString() || "",
      discount_price: product.discount_price?.toString() || "",
      discount_until: product.discount_until ? product.discount_until.slice(0, 10) : "",
      description: product.description || "",
      parent_id: product.parent_id || "",
    });
    setSaveError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setSaveError("");
  };

  const handleFormChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.title.trim() || !form.price.trim()) {
      setSaveError("商品コード、商品名、価格は必須です");
      return;
    }

    setSaving(true);
    setSaveError("");

    const body: Record<string, unknown> = {
      code: form.code.trim(),
      title: form.title.trim(),
      drug_name: form.drug_name.trim(),
      dosage: form.dosage.trim() || null,
      duration_months: form.duration_months ? Number(form.duration_months) : null,
      quantity: form.quantity ? Number(form.quantity) : null,
      price: Number(form.price),
      category: form.category,
      sort_order: Number(form.sort_order) || 0,
      image_url: form.image_url.trim() || null,
      stock_quantity: form.stock_quantity ? Number(form.stock_quantity) : null,
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      discount_until: form.discount_until || null,
      description: form.description.trim() || null,
      parent_id: form.parent_id || null,
    };

    try {
      let res: Response;
      if (editingProduct) {
        res = await fetch("/api/admin/products", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingProduct.id, ...body }),
        });
      } else {
        res = await fetch("/api/admin/products", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存に失敗しました");
      }

      await fetchProducts();
      closeModal();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (product: Product) => {
    if (product.is_active) {
      // Deactivate via DELETE
      try {
        const res = await fetch(`/api/admin/products?id=${product.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "無効化に失敗しました");
        }
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, is_active: false } : p))
        );
      } catch (err) {
        alert(err instanceof Error ? err.message : "無効化に失敗しました");
      }
    } else {
      // Reactivate via PUT
      try {
        const res = await fetch("/api/admin/products", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: product.id, is_active: true }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "有効化に失敗しました");
        }
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, is_active: true } : p))
        );
      } catch (err) {
        alert(err instanceof Error ? err.message : "有効化に失敗しました");
      }
    }
  };

  const handleSortOrderChange = (productId: string, value: string) => {
    setEditingSortOrder((prev) => ({ ...prev, [productId]: value }));
  };

  const handleSortOrderSave = async (product: Product) => {
    const newValue = editingSortOrder[product.id];
    if (newValue === undefined || newValue === product.sort_order.toString()) {
      setEditingSortOrder((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      return;
    }

    setSavingSortOrder((prev) => ({ ...prev, [product.id]: true }));

    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, sort_order: Number(newValue) || 0 }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失敗");
      }

      await fetchProducts();
      setEditingSortOrder((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSavingSortOrder((prev) => ({ ...prev, [product.id]: false }));
    }
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
          <h1 className="text-2xl font-bold text-slate-900">商品管理</h1>
          <p className="text-slate-600 text-sm mt-1">
            商品マスタの管理（{products.length}件）
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          商品追加
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  商品コード
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  商品名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  薬品名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  用量
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  期間(月)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  本数
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  価格
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  在庫
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  カテゴリ
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  表示順
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    商品データがありません
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-slate-50 ${
                      !product.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-slate-900">
                      {product.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                      {product.title}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                      {product.drug_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                      {product.dosage || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-slate-600">
                      {product.duration_months ?? "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-slate-600">
                      {product.quantity ?? "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                      <div>¥{product.price.toLocaleString()}</div>
                      {product.discount_price != null && (
                        <div className="text-xs text-red-600">
                          割引: ¥{product.discount_price.toLocaleString()}
                          {product.discount_until && (
                            <span className="text-slate-400 ml-1">
                              (~{new Date(product.discount_until).toLocaleDateString("ja-JP")})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {product.stock_quantity != null ? (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          product.stock_quantity === 0
                            ? "bg-red-100 text-red-700"
                            : product.stock_quantity <= 5
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {product.stock_quantity}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">無制限</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.category === "injection"
                            ? "bg-blue-100 text-blue-700"
                            : product.category === "oral"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {CATEGORY_LABELS[product.category] || product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {product.is_active ? "有効" : "無効"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={
                            editingSortOrder[product.id] !== undefined
                              ? editingSortOrder[product.id]
                              : product.sort_order.toString()
                          }
                          onChange={(e) =>
                            handleSortOrderChange(product.id, e.target.value)
                          }
                          onBlur={() => handleSortOrderSave(product)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSortOrderSave(product);
                          }}
                          disabled={savingSortOrder[product.id]}
                          className="w-16 px-2 py-1 text-xs text-center border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`px-3 py-1 text-xs rounded transition-colors ${
                            product.is_active
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          }`}
                        >
                          {product.is_active ? "無効化" : "有効化"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 追加/編集モーダル */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 text-lg">
                  {editingProduct ? "商品を編集" : "商品を追加"}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <svg
                    className="w-5 h-5"
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
            </div>

            {/* フォーム */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {saveError}
                </div>
              )}

              {/* 商品コード */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  商品コード <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => handleFormChange("code", e.target.value)}
                  placeholder="例: MJ-2.5-1M"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  autoFocus
                />
              </div>

              {/* 商品名 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  商品名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  placeholder="例: マンジャロ 2.5mg 1ヶ月分"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>

              {/* 薬品名 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  薬品名
                </label>
                <input
                  type="text"
                  value={form.drug_name}
                  onChange={(e) => handleFormChange("drug_name", e.target.value)}
                  placeholder="マンジャロ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>

              {/* 用量 & 期間 - 横並び */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    用量
                  </label>
                  <input
                    type="text"
                    value={form.dosage}
                    onChange={(e) => handleFormChange("dosage", e.target.value)}
                    placeholder="例: 2.5mg"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    期間（月）
                  </label>
                  <input
                    type="number"
                    value={form.duration_months}
                    onChange={(e) =>
                      handleFormChange("duration_months", e.target.value)
                    }
                    placeholder="例: 1"
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
              </div>

              {/* 本数 & 価格 - 横並び */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    本数
                  </label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) =>
                      handleFormChange("quantity", e.target.value)
                    }
                    placeholder="例: 4"
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    価格 (JPY) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => handleFormChange("price", e.target.value)}
                    placeholder="例: 19800"
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
              </div>

              {/* カテゴリ & 表示順 - 横並び */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      handleFormChange("category", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                  >
                    <option value="injection">注射</option>
                    <option value="oral">内服</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    表示順
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      handleFormChange("sort_order", e.target.value)
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
              </div>

              {/* 区切り線 */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">拡張設定</h3>
              </div>

              {/* 商品画像URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  画像URL
                </label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => handleFormChange("image_url", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
                {form.image_url && (
                  <div className="mt-2">
                    <img
                      src={form.image_url}
                      alt="プレビュー"
                      className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
              </div>

              {/* 在庫数 & 親商品 - 横並び */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    在庫数
                  </label>
                  <input
                    type="number"
                    value={form.stock_quantity}
                    onChange={(e) => handleFormChange("stock_quantity", e.target.value)}
                    placeholder="空欄=無制限"
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                  <p className="text-xs text-slate-400 mt-1">空欄の場合は在庫無制限</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    親商品
                  </label>
                  <select
                    value={form.parent_id}
                    onChange={(e) => handleFormChange("parent_id", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                  >
                    <option value="">なし（単体商品）</option>
                    {products
                      .filter(p => !p.parent_id && p.id !== editingProduct?.id)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              {/* 割引価格 & 割引期限 - 横並び */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    割引価格 (JPY)
                  </label>
                  <input
                    type="number"
                    value={form.discount_price}
                    onChange={(e) => handleFormChange("discount_price", e.target.value)}
                    placeholder="空欄=割引なし"
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    割引期限
                  </label>
                  <input
                    type="date"
                    value={form.discount_until}
                    onChange={(e) => handleFormChange("discount_until", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                  <p className="text-xs text-slate-400 mt-1">空欄の場合は無期限</p>
                </div>
              </div>

              {/* 商品説明 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  商品説明
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  placeholder="商品の詳細説明（任意）"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                />
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    保存中...
                  </span>
                ) : editingProduct ? (
                  "更新"
                ) : (
                  "追加"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

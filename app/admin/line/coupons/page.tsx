"use client";

import { useState, useEffect, useCallback } from "react";

interface Coupon {
  id: number;
  name: string;
  code: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  max_uses_per_patient: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  description: string;
  issued_count: number;
  used_count: number;
  created_at: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [showDistribute, setShowDistribute] = useState<Coupon | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/line/coupons", { credentials: "include" });
    const data = await res.json();
    if (data.coupons) setCoupons(data.coupons);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm("このクーポンを削除しますか？")) return;
    await fetch(`/api/admin/line/coupons?id=${id}`, { method: "DELETE", credentials: "include" });
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  const handleToggle = async (coupon: Coupon) => {
    await fetch("/api/admin/line/coupons", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...coupon, is_active: !coupon.is_active }),
    });
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
  };

  const totalIssued = coupons.reduce((sum, c) => sum + c.issued_count, 0);
  const totalUsed = coupons.reduce((sum, c) => sum + c.used_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-400">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                クーポン管理
              </h1>
              <p className="text-sm text-gray-400 mt-1">LINE限定クーポンの作成・配布・利用状況を管理します</p>
            </div>
            <button
              onClick={() => { setEditCoupon(null); setShowEditor(true); }}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-medium hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              クーポン作成
            </button>
          </div>

          {/* サマリーカード */}
          {coupons.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100/50">
                <div className="text-2xl font-bold text-amber-700">{coupons.length}</div>
                <div className="text-xs text-amber-500 mt-0.5">クーポン数</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 border border-blue-100/50">
                <div className="text-2xl font-bold text-blue-700">{totalIssued}</div>
                <div className="text-xs text-blue-500 mt-0.5">総配布数</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100/50">
                <div className="text-2xl font-bold text-green-700">{totalUsed}</div>
                <div className="text-xs text-green-500 mt-0.5">総利用数</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* クーポン一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
      {coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">クーポンがありません</p>
          <p className="text-gray-300 text-xs mt-1">LINE友だちに配布するクーポンを作成しましょう</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {coupons.map(coupon => (
            <div
              key={coupon.id}
              className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all duration-200 group ${
                coupon.is_active ? "border-gray-100 hover:border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              {/* 上段: 名前 + 割引 */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{coupon.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-orange-600">
                      {coupon.discount_type === "percent" ? `${coupon.discount_value}%OFF` : `¥${coupon.discount_value.toLocaleString()}OFF`}
                    </span>
                    <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {coupon.code}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(coupon)}
                  className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${
                    coupon.is_active ? "bg-[#06C755]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                    style={{ left: 2, transform: coupon.is_active ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>

              {/* 進捗バー */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                  <span>配布 {coupon.issued_count}人 / 利用 {coupon.used_count}人</span>
                  <span className="font-medium text-orange-600">
                    {coupon.issued_count > 0
                      ? `${Math.round((coupon.used_count / coupon.issued_count) * 100)}%利用`
                      : "未配布"}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                    style={{ width: `${coupon.issued_count > 0 ? Math.round((coupon.used_count / coupon.issued_count) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* 詳細情報 */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 mb-3">
                {coupon.min_purchase > 0 && <span>最低金額: ¥{coupon.min_purchase.toLocaleString()}</span>}
                {coupon.max_uses && <span>上限: {coupon.max_uses}回</span>}
                <span>1人{coupon.max_uses_per_patient}回まで</span>
                {coupon.valid_until && (
                  <span>期限: {new Date(coupon.valid_until).toLocaleDateString("ja-JP")}</span>
                )}
              </div>

              {/* 操作ボタン */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                <button
                  onClick={() => setShowDistribute(coupon)}
                  className="px-3 py-1.5 text-[11px] font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  配布
                </button>
                <button
                  onClick={() => { setEditCoupon(coupon); setShowEditor(true); }}
                  className="px-3 py-1.5 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(coupon.id)}
                  className="px-3 py-1.5 text-[11px] font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 作成/編集モーダル */}
      {showEditor && (
        <CouponEditor
          coupon={editCoupon}
          onSave={async (data) => {
            if (editCoupon) {
              await fetch("/api/admin/line/coupons", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ ...data, id: editCoupon.id }),
              });
            } else {
              await fetch("/api/admin/line/coupons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
              });
            }
            setShowEditor(false);
            setEditCoupon(null);
            load();
          }}
          onClose={() => { setShowEditor(false); setEditCoupon(null); }}
        />
      )}

      {/* 配布モーダル */}
      {showDistribute && (
        <DistributeModal
          coupon={showDistribute}
          onClose={() => setShowDistribute(null)}
          onDone={() => { setShowDistribute(null); load(); }}
        />
      )}
      </div>
    </div>
  );
}

/* ==================== クーポン作成/編集モーダル ==================== */
function CouponEditor({
  coupon,
  onSave,
  onClose,
}: {
  coupon: Coupon | null;
  onSave: (data: Partial<Coupon>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(coupon?.name || "");
  const [code, setCode] = useState(coupon?.code || "");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">(coupon?.discount_type || "fixed");
  const [discountValue, setDiscountValue] = useState(coupon?.discount_value || 0);
  const [minPurchase, setMinPurchase] = useState(coupon?.min_purchase || 0);
  const [maxUses, setMaxUses] = useState<string>(coupon?.max_uses?.toString() || "");
  const [maxUsesPerPatient, setMaxUsesPerPatient] = useState(coupon?.max_uses_per_patient || 1);
  const [validUntil, setValidUntil] = useState(coupon?.valid_until ? coupon.valid_until.slice(0, 10) : "");
  const [description, setDescription] = useState(coupon?.description || "");

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
    setCode(result);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              {coupon ? "クーポン編集" : "クーポン作成"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* クーポン名 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">クーポン名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: 初回限定1000円OFF"
              className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300"
            />
          </div>

          {/* クーポンコード */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">クーポンコード</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="例: WELCOME2026"
                className="flex-1 px-3 py-2 text-sm font-mono border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300"
              />
              <button
                onClick={generateCode}
                className="px-3 py-2 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors whitespace-nowrap"
              >
                自動生成
              </button>
            </div>
          </div>

          {/* 割引タイプ + 金額 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">割引タイプ</label>
              <select
                value={discountType}
                onChange={e => setDiscountType(e.target.value as "fixed" | "percent")}
                className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300"
              >
                <option value="fixed">固定額 (円)</option>
                <option value="percent">割引率 (%)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                {discountType === "fixed" ? "割引額 (円)" : "割引率 (%)"}
              </label>
              <input
                type="number"
                value={discountValue || ""}
                onChange={e => setDiscountValue(Number(e.target.value))}
                placeholder={discountType === "fixed" ? "1000" : "10"}
                className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300"
              />
            </div>
          </div>

          {/* 最低利用金額 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">最低利用金額 (円)（0 = 制限なし）</label>
            <input
              type="number"
              value={minPurchase || ""}
              onChange={e => setMinPurchase(Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300"
            />
          </div>

          {/* 利用上限 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">全体の利用上限（空欄=無制限）</label>
              <input
                type="number"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                placeholder="無制限"
                className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">1人あたりの利用上限</label>
              <input
                type="number"
                value={maxUsesPerPatient}
                onChange={e => setMaxUsesPerPatient(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300"
              />
            </div>
          </div>

          {/* 有効期限 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">有効期限（空欄=無期限）</label>
            <input
              type="date"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300"
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">説明メモ（管理用）</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="管理用のメモ"
              className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300 resize-none"
            />
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            キャンセル
          </button>
          <button
            onClick={() => onSave({
              name, code,
              discount_type: discountType,
              discount_value: discountValue,
              min_purchase: minPurchase,
              max_uses: maxUses ? parseInt(maxUses) : null,
              max_uses_per_patient: maxUsesPerPatient,
              valid_until: validUntil ? new Date(validUntil + "T23:59:59+09:00").toISOString() : null,
              description,
            })}
            disabled={!name.trim() || !code.trim() || !discountValue}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-300 rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-200"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== 配布モーダル ==================== */
function DistributeModal({
  coupon,
  onClose,
  onDone,
}: {
  coupon: Coupon;
  onClose: () => void;
  onDone: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ distributed: number; sent: number } | null>(null);
  const [message, setMessage] = useState("");

  const discountText = coupon.discount_type === "percent"
    ? `${coupon.discount_value}%OFF`
    : `¥${coupon.discount_value.toLocaleString()}OFF`;

  const defaultMsg = `クーポンをお届けします\n\n【${coupon.name}】\n${discountText}\nコード: ${coupon.code}${coupon.valid_until ? `\n有効期限: ${new Date(coupon.valid_until).toLocaleDateString("ja-JP")}` : ""}`;

  const handleDistribute = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/admin/line/coupons/${coupon.id}/distribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filter_rules: {},
          message: message || undefined,
        }),
      });
      const data = await res.json();
      setResult({ distributed: data.distributed || 0, sent: data.sent || 0 });
    } catch {
      alert("配布中にエラーが発生しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              クーポン配布
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-8">「{coupon.name}」を全対象者に配布</p>
        </div>

        <div className="p-5 space-y-4">
          {!result ? (
            <>
              {/* 配布メッセージ */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  LINE通知メッセージ（空欄でデフォルト）
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  placeholder={defaultMsg}
                  className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300 resize-none"
                />
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100/50">
                <p className="text-xs text-amber-700">
                  LINE連携済みの全ユーザーに配布されます。既に配布済みのユーザーにはスキップされます。
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-900">配布完了</p>
              <p className="text-xs text-gray-500 mt-2">
                {result.distributed}人に配布 / {result.sent}人にLINE通知送信
              </p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
          {result ? (
            <button onClick={onDone} className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-200">
              閉じる
            </button>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleDistribute}
                disabled={sending}
                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-300 rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-200 flex items-center gap-1.5"
              >
                {sending ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
                配布する
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

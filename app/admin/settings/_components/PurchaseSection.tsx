// 購入画面設定セクション（テキスト・グループ管理 + iPhoneプレビュー）
"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useConfirmModal } from "@/hooks/useConfirmModal";

// --- 型定義 ---
interface PurchaseGroup {
  id: string;
  badgeLabel: string;
  displayName: string;
  description: string;
  colorTheme: string;
  sortOrder: number;
  productCodes: string[];
}

interface ReorderConfirmConfig {
  title: string;
  description: string;
  submitButtonLabel: string;
  submittingLabel: string;
  backButtonLabel: string;
  successMessage: string;
  footerNote: string;
  priceLabel: string;
  priceSuffix: string;
}

interface PurchaseConfig {
  pageTitle: string;
  reorderTitle: string;
  description: string;
  reorderDescription: string;
  footerNote: string;
  checkoutButtonLabel: string;
  reorderButtonLabel: string;
  groups: PurchaseGroup[];
  reorderConfirm: ReorderConfirmConfig;
}

interface Product {
  code: string;
  title: string;
  price: number;
  is_active: boolean;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

interface ApiResponse {
  config?: PurchaseConfig;
  products?: Product[];
  categories?: Category[];
}

const COLOR_THEMES = ["emerald", "blue", "purple", "pink", "amber", "rose", "teal", "indigo", "orange"];

const COLOR_THEME_LABELS: Record<string, string> = {
  emerald: "エメラルド",
  blue: "ブルー",
  purple: "パープル",
  pink: "ピンク",
  amber: "アンバー",
  rose: "ローズ",
  teal: "ティール",
  indigo: "インディゴ",
  orange: "オレンジ",
};

// テーマごとのTailwindカラー（プレビュー用）
const THEME_COLORS: Record<string, { bg: string; text: string; badge: string; border: string; button: string }> = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", button: "bg-emerald-600" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100 text-blue-700", border: "border-blue-200", button: "bg-blue-600" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", badge: "bg-purple-100 text-purple-700", border: "border-purple-200", button: "bg-purple-600" },
  pink: { bg: "bg-pink-50", text: "text-pink-700", badge: "bg-pink-100 text-pink-700", border: "border-pink-200", button: "bg-pink-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-100 text-amber-700", border: "border-amber-200", button: "bg-amber-600" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", badge: "bg-rose-100 text-rose-700", border: "border-rose-200", button: "bg-rose-600" },
  teal: { bg: "bg-teal-50", text: "text-teal-700", badge: "bg-teal-100 text-teal-700", border: "border-teal-200", button: "bg-teal-600" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", badge: "bg-indigo-100 text-indigo-700", border: "border-indigo-200", button: "bg-indigo-600" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-100 text-orange-700", border: "border-orange-200", button: "bg-orange-600" },
};

const DEFAULT_REORDER_CONFIRM: ReorderConfirmConfig = {
  title: "再処方の申請内容確認",
  description: "下記の内容で再処方の申請を行います。\nDrが処方内容を確認し、処方が可能と判断された後に決済フォームをお送りさせていただきます。",
  submitButtonLabel: "この内容で再処方を申請する",
  submittingLabel: "申請を送信しています...",
  backButtonLabel: "マイページに戻る",
  successMessage: "再処方の申請を受け付けました。\n\nDrが処方内容を確認し、処方が可能と判断された後に決済フォームをお送りさせていただきます。",
  footerNote: "※ 再処方の可否は、体調や前回処方後の経過を踏まえてDrが判断いたします。\n※ 再処方が難しい場合には、LINEよりご連絡させていただきます。",
  priceLabel: "想定ご請求額",
  priceSuffix: "税込／送料込み（再処方時に決済）",
};

const DEFAULT_CONFIG: PurchaseConfig = {
  pageTitle: "お薬の購入",
  reorderTitle: "再処方のお申し込み",
  description: "ご希望のお薬をお選びください。",
  reorderDescription: "前回と同じお薬を再処方いたします。",
  footerNote: "",
  checkoutButtonLabel: "購入手続きへ",
  reorderButtonLabel: "再処方を申請する",
  groups: [],
  reorderConfirm: DEFAULT_REORDER_CONFIRM,
};

// --- テキスト設定フィールド定義 ---
const TEXT_FIELDS: { key: keyof Omit<PurchaseConfig, "groups" | "reorderConfirm">; label: string; type: "text" | "textarea" }[] = [
  { key: "pageTitle", label: "ページタイトル（初回購入）", type: "text" },
  { key: "reorderTitle", label: "ページタイトル（再処方）", type: "text" },
  { key: "description", label: "説明文（初回購入）", type: "textarea" },
  { key: "reorderDescription", label: "説明文（再処方）", type: "textarea" },
  { key: "footerNote", label: "フッター注記", type: "textarea" },
  { key: "checkoutButtonLabel", label: "購入ボタンラベル", type: "text" },
  { key: "reorderButtonLabel", label: "再処方ボタンラベル", type: "text" },
];

interface Props {
  onToast: (msg: string, type: "success" | "error") => void;
}

export default function PurchaseSection({ onToast }: Props) {
  const { confirm: confirmModal, ConfirmDialog } = useConfirmModal();
  const SWR_KEY = "/api/admin/purchase-settings";
  const { data: swrData, isLoading: loading } = useSWR<ApiResponse>(SWR_KEY);
  const [config, setConfig] = useState<PurchaseConfig>(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  // SWRデータをローカルstateに反映（編集用）
  if (swrData?.config && !configLoaded) {
    setConfig(swrData.config);
    setConfigLoaded(true);
  }

  const products = swrData?.products ?? [];
  const categories = swrData?.categories ?? [];

  // テキストフィールド更新
  const updateText = (key: keyof Omit<PurchaseConfig, "groups" | "reorderConfirm">, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // 再処方確認画面のフィールド更新
  const updateReorderConfirm = (key: keyof ReorderConfirmConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      reorderConfirm: { ...(prev.reorderConfirm ?? DEFAULT_REORDER_CONFIRM), [key]: value },
    }));
  };

  // グループ更新
  const updateGroup = (groupId: string, field: keyof Omit<PurchaseGroup, "id" | "sortOrder" | "productCodes">, value: string) => {
    setConfig(prev => ({
      ...prev,
      groups: prev.groups.map(g => g.id === groupId ? { ...g, [field]: value } : g),
    }));
  };

  // グループの商品コード切り替え
  const toggleProductCode = (groupId: string, code: string) => {
    setConfig(prev => ({
      ...prev,
      groups: prev.groups.map(g => {
        if (g.id !== groupId) return g;
        const codes = g.productCodes.includes(code)
          ? g.productCodes.filter(c => c !== code)
          : [...g.productCodes, code];
        return { ...g, productCodes: codes };
      }),
    }));
  };

  // グループ追加
  const addGroup = () => {
    const newGroup: PurchaseGroup = {
      id: crypto.randomUUID(),
      badgeLabel: "",
      displayName: "",
      description: "",
      colorTheme: "emerald",
      sortOrder: config.groups.length,
      productCodes: [],
    };
    setConfig(prev => ({ ...prev, groups: [...prev.groups, newGroup] }));
  };

  // グループ複製
  const duplicateGroup = (groupId: string) => {
    const source = config.groups.find(g => g.id === groupId);
    if (!source) return;
    const newGroup: PurchaseGroup = {
      ...source,
      id: crypto.randomUUID(),
      displayName: `${source.displayName}（コピー）`,
      sortOrder: config.groups.length,
    };
    setConfig(prev => ({ ...prev, groups: [...prev.groups, newGroup] }));
  };

  // グループ削除
  const removeGroup = async (groupId: string) => {
    const ok = await confirmModal({ title: "グループ削除", message: "このグループを削除しますか？", variant: "danger", confirmLabel: "削除する" });
    if (!ok) return;
    setConfig(prev => ({
      ...prev,
      groups: prev.groups
        .filter(g => g.id !== groupId)
        .map((g, i) => ({ ...g, sortOrder: i })),
    }));
  };

  // グループ並び替え
  const moveGroup = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.groups.length) return;
    setConfig(prev => {
      const groups = [...prev.groups];
      [groups[index], groups[newIndex]] = [groups[newIndex], groups[index]];
      return { ...prev, groups: groups.map((g, i) => ({ ...g, sortOrder: i })) };
    });
  };

  // 保存
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/purchase-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ config }),
    });
    if (res.ok) {
      setSaved(true);
      setEditing(false);
      onToast("購入画面設定を保存しました", "success");
      mutate(SWR_KEY);
      setTimeout(() => setSaved(false), 3000);
    } else {
      onToast("保存に失敗しました", "error");
    }
    setSaving(false);
  };

  // リセット
  const handleReset = () => {
    if (confirm("デフォルト設定に戻しますか？")) setConfig(DEFAULT_CONFIG);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">購入画面設定</h2>
          <p className="text-xs text-gray-500 mt-0.5">患者向け購入画面の表示をカスタマイズ</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-emerald-600 font-medium">保存しました</span>}
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                キャンセル
              </button>
              <button onClick={handleReset} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                リセット
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? "保存中..." : "保存する"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              編集する
            </button>
          )}
        </div>
      </div>

      {/* 2カラム: 設定 + プレビュー */}
      <div className={`grid grid-cols-1 lg:grid-cols-5 gap-6 ${!editing ? "pointer-events-none opacity-60" : ""}`}>
        {/* 左カラム: 設定パネル */}
        <div className="lg:col-span-3 space-y-6">
          {/* テキスト設定 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">テキスト設定</h3>
              <p className="text-xs text-gray-500 mt-0.5">購入画面のタイトルや説明文をカスタマイズ</p>
            </div>
            <div className="p-5 space-y-4">
              {TEXT_FIELDS.map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  {type === "textarea" ? (
                    <textarea
                      value={config[key]}
                      onChange={(e) => updateText(key, e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={config[key]}
                      onChange={(e) => updateText(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* グループ管理 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800">グループ管理</h3>
                <p className="text-xs text-gray-500 mt-0.5">商品グループの追加・並び替え・設定</p>
              </div>
              <button
                onClick={addGroup}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                + グループ追加
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {config.groups.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  グループがありません。「グループ追加」ボタンで作成してください。
                </div>
              )}
              {config.groups.map((group, index) => (
                <div key={group.id} className="p-5 space-y-4">
                  {/* グループヘッダー: 並び替え + 削除 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      グループ {index + 1}
                      {group.displayName && ` — ${group.displayName}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveGroup(index, "up")}
                        disabled={index === 0}
                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="上へ移動"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveGroup(index, "down")}
                        disabled={index === config.groups.length - 1}
                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="下へ移動"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => duplicateGroup(group.id)}
                        className="p-1.5 text-blue-400 hover:text-blue-600"
                        title="グループを複製"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeGroup(group.id)}
                        className="p-1.5 text-red-400 hover:text-red-600"
                        title="グループを削除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* バッジラベル */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">バッジラベル</label>
                    <input
                      type="text"
                      value={group.badgeLabel}
                      onChange={(e) => updateGroup(group.id, "badgeLabel", e.target.value)}
                      placeholder="例: 人気"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  {/* 表示名 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">表示名</label>
                    <input
                      type="text"
                      value={group.displayName}
                      onChange={(e) => updateGroup(group.id, "displayName", e.target.value)}
                      placeholder="例: ダイエットセット"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  {/* 説明 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                    <textarea
                      value={group.description}
                      onChange={(e) => updateGroup(group.id, "description", e.target.value)}
                      rows={2}
                      placeholder="グループの説明文"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                    />
                  </div>

                  {/* カラーテーマ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">カラーテーマ</label>
                    <select
                      value={group.colorTheme}
                      onChange={(e) => updateGroup(group.id, "colorTheme", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                    >
                      {COLOR_THEMES.map(theme => (
                        <option key={theme} value={theme}>{COLOR_THEME_LABELS[theme]}</option>
                      ))}
                    </select>
                  </div>

                  {/* 商品選択（フォルダ構造） */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">商品選択</label>
                    {products.length === 0 ? (
                      <p className="text-xs text-gray-400">商品マスタに商品がありません</p>
                    ) : (
                      <ProductFolderPicker
                        products={products}
                        categories={categories}
                        selectedCodes={group.productCodes}
                        onToggle={(code) => toggleProductCode(group.id, code)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 再処方確認画面の設定 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">再処方確認画面</h3>
              <p className="text-xs text-gray-500 mt-0.5">再処方申請の確認画面に表示されるテキストをカスタマイズ</p>
            </div>
            <div className="p-5 space-y-4">
              {([
                { key: "title" as const, label: "ページタイトル", type: "text" as const },
                { key: "description" as const, label: "説明文", type: "textarea" as const },
                { key: "submitButtonLabel" as const, label: "申請ボタンラベル", type: "text" as const },
                { key: "submittingLabel" as const, label: "申請中ラベル", type: "text" as const },
                { key: "backButtonLabel" as const, label: "戻るボタンラベル", type: "text" as const },
                { key: "successMessage" as const, label: "申請成功メッセージ", type: "textarea" as const },
                { key: "priceLabel" as const, label: "価格ラベル", type: "text" as const },
                { key: "priceSuffix" as const, label: "価格補足テキスト", type: "text" as const },
                { key: "footerNote" as const, label: "フッター注記", type: "textarea" as const },
              ]).map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  {type === "textarea" ? (
                    <textarea
                      value={(config.reorderConfirm ?? DEFAULT_REORDER_CONFIRM)[key]}
                      onChange={(e) => updateReorderConfirm(key, e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={(config.reorderConfirm ?? DEFAULT_REORDER_CONFIRM)[key]}
                      onChange={(e) => updateReorderConfirm(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右カラム: プレビュー */}
        <div className="lg:col-span-2">
          <PurchasePreview config={config} products={products} />
        </div>
      </div>
      <ConfirmDialog />
    </div>
  );
}

/* ---------- スマホ風プレビュー ---------- */
function PurchasePreview({ config, products }: { config: PurchaseConfig; products: Product[] }) {
  // 商品コードから商品名を引く
  const productMap = new Map(products.map(p => [p.code, p]));

  return (
    <div className="sticky top-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">プレビュー</h3>
      <div className="mx-auto w-[320px] border-[10px] border-gray-800 rounded-[36px] overflow-hidden shadow-2xl">
        {/* ノッチ */}
        <div className="bg-gray-800 h-6 flex items-center justify-center">
          <div className="w-16 h-1 bg-gray-600 rounded-full" />
        </div>
        <div className="h-[560px] overflow-y-auto bg-gray-50">
          {/* ヘッダー */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-3">
            <h1 className="text-xs font-bold text-gray-800">{config.pageTitle || "お薬の購入"}</h1>
          </div>

          <div className="px-3 py-3 space-y-3">
            {/* 説明文 */}
            {config.description && (
              <p className="text-[10px] text-gray-600 leading-relaxed px-1">{config.description}</p>
            )}

            {/* グループ一覧 */}
            {config.groups.map((group) => {
              const colors = THEME_COLORS[group.colorTheme] || THEME_COLORS.emerald;
              const groupProducts = group.productCodes
                .map(code => productMap.get(code))
                .filter(Boolean) as Product[];

              return (
                <div key={group.id} className={`rounded-xl border ${colors.border} overflow-hidden`}>
                  {/* グループヘッダー */}
                  <div className={`${colors.bg} px-3 py-2.5`}>
                    <div className="flex items-center gap-2">
                      {group.badgeLabel && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                          {group.badgeLabel}
                        </span>
                      )}
                      <span className={`text-[11px] font-bold ${colors.text}`}>
                        {group.displayName || "グループ名未設定"}
                      </span>
                    </div>
                    {group.description && (
                      <p className="text-[9px] text-gray-500 mt-1">{group.description}</p>
                    )}
                  </div>

                  {/* 商品リスト */}
                  <div className="bg-white divide-y divide-gray-50">
                    {groupProducts.length === 0 ? (
                      <div className="px-3 py-2 text-[9px] text-gray-400">商品未選択</div>
                    ) : (
                      groupProducts.map(product => (
                        <div key={product.code} className="px-3 py-2 flex items-center justify-between">
                          <span className="text-[10px] text-gray-700">{product.title}</span>
                          <span className="text-[10px] font-medium text-gray-800">{product.price.toLocaleString()}円</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {config.groups.length === 0 && (
              <div className="text-center py-6 text-[10px] text-gray-400">グループ未設定</div>
            )}

            {/* 購入ボタン */}
            <button className="w-full rounded-xl bg-pink-500 text-white text-center py-2.5 text-[11px] font-semibold shadow-sm">
              {config.checkoutButtonLabel || "購入手続きへ"}
            </button>

            {/* フッター注記 */}
            {config.footerNote && (
              <p className="text-[8px] text-gray-400 text-center leading-relaxed px-2">{config.footerNote}</p>
            )}

            <div className="h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- フォルダ構造の商品選択 ---------- */
function ProductFolderPicker({
  products,
  categories,
  selectedCodes,
  onToggle,
}: {
  products: Product[];
  categories: Category[];
  selectedCodes: string[];
  onToggle: (code: string) => void;
}) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (id: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ルートカテゴリ（parent_id === null）
  const rootCategories = categories.filter(c => !c.parent_id);
  // カテゴリに属さない商品
  const uncategorized = products.filter(p => !p.category_id);

  const renderCategory = (cat: Category, depth: number) => {
    const isOpen = openFolders.has(cat.id);
    const childCategories = categories.filter(c => c.parent_id === cat.id);
    const catProducts = products.filter(p => p.category_id === cat.id);
    const selectedCount = catProducts.filter(p => selectedCodes.includes(p.code)).length;

    return (
      <div key={cat.id}>
        <button
          type="button"
          onClick={() => toggleFolder(cat.id)}
          className="w-full flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded text-left"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="text-sm text-gray-700 flex-1">{cat.name}</span>
          {selectedCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
              {selectedCount}件選択
            </span>
          )}
        </button>
        {isOpen && (
          <div>
            {childCategories.map(child => renderCategory(child, depth + 1))}
            {catProducts.map(product => (
              <label
                key={product.code}
                className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-gray-50 rounded px-2"
                style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
              >
                <input
                  type="checkbox"
                  checked={selectedCodes.includes(product.code)}
                  onChange={() => onToggle(product.code)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-800">{product.title}</span>
                  {!product.is_active && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">非アクティブ</span>
                  )}
                </div>
                <span className="text-xs text-gray-600 shrink-0">¥{product.price.toLocaleString()}</span>
              </label>
            ))}
            {catProducts.length === 0 && childCategories.length === 0 && (
              <div className="text-xs text-gray-400 py-2" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
                商品なし
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border border-gray-100 rounded-lg p-2 max-h-64 overflow-y-auto">
      {rootCategories.map(cat => renderCategory(cat, 0))}
      {uncategorized.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-500 px-2 py-1.5 mt-1 border-t border-gray-100">
            未分類
          </div>
          {uncategorized.map(product => (
            <label
              key={product.code}
              className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-gray-50 rounded px-2 pl-4"
            >
              <input
                type="checkbox"
                checked={selectedCodes.includes(product.code)}
                onChange={() => onToggle(product.code)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-800">{product.title}</span>
                {!product.is_active && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">非アクティブ</span>
                )}
              </div>
              <span className="text-xs text-gray-600 shrink-0">¥{product.price.toLocaleString()}</span>
            </label>
          ))}
        </div>
      )}
      {rootCategories.length === 0 && uncategorized.length === 0 && (
        <div className="text-center py-4 text-xs text-gray-400">商品がありません</div>
      )}
    </div>
  );
}

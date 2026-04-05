// app/mypage/purchase/page.tsx — 購入画面（DB設定連動）
"use client";

import React, { useMemo, useCallback, Suspense } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import type { PurchaseConfig, PurchaseGroup } from "@/lib/purchase/types";
import { DEFAULT_PURCHASE_CONFIG } from "@/lib/purchase/types";
import { type CartItem, getCart, addToCart, removeFromCart, clearCart, getCartSubtotal, getCartItemCount } from "@/lib/purchase/cart";
import { calculateShippingFee } from "@/lib/purchase/shipping-fee";

// SWRProviderのスコープ外なのでfetcher明示指定
const swrFetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("API error");
    return r.json();
  });

// カラーテーマ → Tailwindクラスのマッピング（purge対策で静的に列挙）
const THEME_CLASSES: Record<string, { section: string; badge: string }> = {
  emerald: { section: "border-emerald-400 bg-emerald-50", badge: "bg-emerald-500" },
  blue: { section: "border-blue-400 bg-blue-50", badge: "bg-blue-500" },
  purple: { section: "border-purple-400 bg-purple-50", badge: "bg-purple-500" },
  pink: { section: "border-pink-400 bg-pink-50", badge: "bg-pink-500" },
  amber: { section: "border-amber-400 bg-amber-50", badge: "bg-amber-500" },
  rose: { section: "border-rose-400 bg-rose-50", badge: "bg-rose-500" },
  teal: { section: "border-teal-400 bg-teal-50", badge: "bg-teal-500" },
  indigo: { section: "border-indigo-400 bg-indigo-50", badge: "bg-indigo-500" },
  orange: { section: "border-orange-400 bg-orange-50", badge: "bg-orange-500" },
};

interface DbProduct {
  code: string;
  title: string;
  dosage: string | null;
  duration_months: number | null;
  quantity: number | null;
  price: number;
  discount_price: number | null;
  discount_until: string | null;
  cool_type?: "normal" | "chilled" | "frozen" | null;
  category?: string;
  shipping_delay_days?: number;
}

interface FieldsResponse {
  multiFieldEnabled: boolean;
  fields: { id: string; slug: string; name: string; color_theme: string }[];
  defaultFieldId: string | null;
}

function PurchasePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // マルチ分野モード判定
  const { data: fieldsData } = useSWR<FieldsResponse>(
    "/api/mypage/medical-fields",
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const multiFieldEnabled = fieldsData?.multiFieldEnabled ?? false;
  const fieldOptions = fieldsData?.fields ?? [];

  // URL から fieldId を取得、なければデフォルト
  const urlFieldId = searchParams.get("fieldId");
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (urlFieldId) {
      setSelectedFieldId(urlFieldId);
    } else if (fieldsData?.defaultFieldId) {
      setSelectedFieldId(fieldsData.defaultFieldId);
    }
  }, [urlFieldId, fieldsData?.defaultFieldId]);

  // 設定と商品データをAPI経由で取得
  const { data: settingsData } = useSWR<{ config: PurchaseConfig }>(
    "/api/mypage/purchase-settings",
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const { data: productsData } = useSWR<{ products: (DbProduct & { field_id?: string | null })[] }>(
    "/api/mypage/products",
    swrFetcher,
    { revalidateOnFocus: false }
  );

  // 設定（デフォルトフォールバック）
  const config = useMemo<PurchaseConfig>(
    () => settingsData?.config ?? DEFAULT_PURCHASE_CONFIG,
    [settingsData]
  );

  // 実効価格（割引対応）
  const getEffectivePrice = useCallback((p: DbProduct) => {
    if (p.discount_price != null && p.discount_until) {
      const until = new Date(p.discount_until);
      if (until > new Date()) return p.discount_price;
    }
    return p.price;
  }, []);

  // カートモード判定
  const cartMode = config.cartMode ?? false;
  const multiSelectEnabled = config.multiSelectEnabled ?? false;

  // カートState
  const [cart, setCart] = React.useState<CartItem[]>([]);
  React.useEffect(() => { if (cartMode) setCart(getCart()); }, [cartMode]);

  const handleAddToCart = useCallback((p: DbProduct) => {
    if (!multiSelectEnabled) {
      // 単一選択モード: カートをクリアして1商品のみ
      clearCart();
      const newCart = addToCart({
        code: p.code,
        title: p.title,
        price: getEffectivePrice(p),
        coolType: p.cool_type ?? null,
      });
      setCart(newCart);
    } else {
      const newCart = addToCart({
        code: p.code,
        title: p.title,
        price: getEffectivePrice(p),
        coolType: p.cool_type ?? null,
      });
      setCart(newCart);
    }
  }, [multiSelectEnabled]);

  const handleRemoveFromCart = useCallback((code: string) => {
    const newCart = removeFromCart(code);
    setCart(newCart);
  }, []);

  const handleClearCart = useCallback(() => {
    clearCart();
    setCart([]);
  }, []);

  const handleCartCheckout = useCallback(() => {
    if (cart.length === 0) return;
    router.push("/mypage/purchase/confirm?cart=1");
  }, [cart, router]);

  const cartSubtotal = useMemo(() => getCartSubtotal(cart), [cart]);
  const cartShippingFee = useMemo(() => calculateShippingFee(cart), [cart]);
  const cartTotal = cartSubtotal + cartShippingFee;
  const cartItemCount = useMemo(() => getCartItemCount(cart), [cart]);
  const isInCart = useCallback((code: string) => cart.some(c => c.code === code), [cart]);

  const allProducts = useMemo<(DbProduct & { field_id?: string | null })[]>(
    () => productsData?.products ?? [],
    [productsData]
  );

  // マルチ分野モード: 選択分野の商品のみフィルタ
  const filteredProducts = useMemo(() => {
    if (!multiFieldEnabled || !selectedFieldId) return allProducts;
    return allProducts.filter((p) => p.field_id === selectedFieldId);
  }, [multiFieldEnabled, selectedFieldId, allProducts]);

  // グループごとに商品を紐付け（マルチ分野モード: fieldIdでもフィルタ）
  const groupedSections = useMemo(() => {
    const groups = multiFieldEnabled && selectedFieldId
      ? config.groups.filter((g) => !g.fieldId || g.fieldId === selectedFieldId)
      : config.groups;

    return [...groups]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((group) => ({
        group,
        products: group.productCodes
          .map((code) => filteredProducts.find((p) => p.code === code))
          .filter((p): p is DbProduct => p != null),
      }))
      .filter((s) => s.products.length > 0);
  }, [config.groups, filteredProducts, multiFieldEnabled, selectedFieldId]);

  // flow === "reorder" なら再処方モード
  const flow = searchParams.get("flow");
  const isReorderFlow = flow === "reorder";

  const pageTitle = isReorderFlow ? config.reorderTitle : config.pageTitle;
  const description = isReorderFlow ? config.reorderDescription : config.description;

  // 初回決済用：内容確認ページへ
  const handleCheckout = (product: DbProduct) => {
    router.push(`/mypage/purchase/confirm?code=${product.code}&mode=current`);
  };

  // 再処方用：再処方申請確認ページへ
  const handleReorder = (product: DbProduct) => {
    router.push(`/mypage/purchase/reorder?code=${product.code}`);
  };

  // ローディング
  if (!settingsData || !productsData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-pink-500 border-t-transparent" />
          <p className="mt-2 text-sm text-slate-500">商品一覧を読み込んでいます…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="text-xs text-slate-400">マイページ</div>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-lg font-semibold text-slate-900">
              {pageTitle}
            </h1>
            <span className="rounded-full bg-pink-50 px-3 py-1 text-[11px] font-medium text-pink-600">
              診察後専用
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* 分野セレクタ（マルチ分野モード時のみ表示） */}
      {multiFieldEnabled && fieldOptions.length > 1 && (
        <div className="mx-auto max-w-md px-4 pt-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {fieldOptions.map((f) => {
              const isActive = selectedFieldId === f.id;
              const themeKey = f.color_theme || "blue";
              const activeClass = isActive
                ? `${THEME_CLASSES[themeKey]?.badge ?? "bg-blue-500"} text-white`
                : "bg-white text-slate-600 border border-slate-200";
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFieldId(f.id)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${activeClass}`}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* コンテンツ */}
      <div className="mx-auto max-w-md px-4 pb-6 pt-3 space-y-6">
        {groupedSections.map(({ group, products }) => {
          const theme = THEME_CLASSES[group.colorTheme] ?? THEME_CLASSES.blue;

          return (
            <section key={group.id} className="space-y-3">
              <div className={`rounded-xl border-l-4 px-3 py-2.5 ${theme.section}`}>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${theme.badge}`}>
                    {group.badgeLabel}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    {group.displayName}
                  </h2>
                </div>
                <p className="mt-1 text-[11px] text-slate-600 ml-0.5">
                  {group.description}／{products.length}プラン
                </p>
              </div>

              <div className="space-y-3">
                {products.map((p) => {
                  const effectivePrice = getEffectivePrice(p);
                  const hasDiscount = effectivePrice < p.price;

                  return (
                    <div
                      key={p.code}
                      className="w-full rounded-2xl border border-slate-100 px-4 py-3.5 bg-white shadow-sm transition active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-900">
                              {p.title}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {p.duration_months
                              ? `${p.duration_months}ヶ月分`
                              : ""}
                            {p.quantity
                              ? `（全${p.quantity}本）`
                              : ""}
                            {p.duration_months || p.quantity ? "／週1回" : ""}
                          </p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <div className="text-[11px] text-slate-400">料金</div>
                          {hasDiscount && (
                            <div className="text-[10px] text-slate-400 line-through">
                              ¥{p.price.toLocaleString()}
                            </div>
                          )}
                          <div className={`text-base font-semibold ${hasDiscount ? "text-pink-600" : "text-slate-900"}`}>
                            ¥{effectivePrice.toLocaleString()}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            {cartMode ? "税込（配送料別）" : "税込／送料込み"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        {isReorderFlow ? (
                          <button
                            type="button"
                            onClick={() => handleReorder(p)}
                            className="w-full rounded-full bg-pink-500 text-white py-1.5 text-[11px] font-semibold disabled:opacity-60"
                          >
                            {config.reorderButtonLabel}
                          </button>
                        ) : cartMode ? (
                          isInCart(p.code) ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(p.code)}
                              className="w-full rounded-full bg-slate-200 text-slate-600 py-1.5 text-[11px] font-semibold"
                            >
                              カートから削除
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(p)}
                              className="w-full rounded-full bg-blue-500 text-white py-1.5 text-[11px] font-semibold"
                            >
                              カートに追加
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCheckout(p)}
                            className="w-full rounded-full bg-pink-500 text-white py-1.5 text-[11px] font-semibold disabled:opacity-60"
                          >
                            {config.checkoutButtonLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {config.footerNote && (
          <p className="mt-4 text-[10px] text-slate-400 leading-relaxed whitespace-pre-line">
            {config.footerNote}
          </p>
        )}

        {/* カートモード時: 下部の余白（フローティングバー分） */}
        {cartMode && cart.length > 0 && <div className="h-28" />}
      </div>

      {/* カートモード: フローティングカートバー */}
      {cartMode && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 shadow-lg">
          <div className="mx-auto max-w-md px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-slate-700">
                <span className="font-semibold">{cartItemCount}点</span>の商品
              </div>
              <button
                type="button"
                onClick={handleClearCart}
                className="text-[11px] text-slate-400 underline"
              >
                カートを空にする
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              {cart.map((item) => (
                <span key={item.code} className="bg-slate-100 rounded px-1.5 py-0.5 truncate max-w-[150px]">
                  {item.title}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-500">
                  商品: ¥{cartSubtotal.toLocaleString()} + 配送料: ¥{cartShippingFee.toLocaleString()}
                </div>
                <div className="text-lg font-bold text-slate-900">
                  合計 ¥{cartTotal.toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCartCheckout}
                className="rounded-full bg-blue-600 text-white px-6 py-2.5 text-sm font-semibold shadow-md"
              >
                決済に進む
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Suspense ラッパー（useSearchParams 用）
export default function PurchasePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-sm text-slate-500">商品一覧を読み込んでいます…</p>
        </div>
      }
    >
      <PurchasePageInner />
    </Suspense>
  );
}

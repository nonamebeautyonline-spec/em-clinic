// app/mypage/purchase/page.tsx — 購入画面（DB設定連動）
"use client";

import React, { useMemo, useCallback, useState, Suspense } from "react";
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
  drug_name?: string;
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

  // flow === "reorder" なら再処方モード（handleCartCheckoutより前に定義）
  const flow = searchParams.get("flow");
  const isReorderFlow = flow === "reorder";

  const handleClearCart = useCallback(() => {
    clearCart();
    setCart([]);
  }, []);

  const handleCartCheckout = useCallback(() => {
    if (cart.length === 0) return;
    if (isReorderFlow) {
      router.push("/mypage/purchase/reorder?cart=1");
    } else {
      router.push("/mypage/purchase/confirm?cart=1");
    }
  }, [cart, router, isReorderFlow]);

  const cartSubtotal = useMemo(() => getCartSubtotal(cart), [cart]);
  const cartShippingFee = useMemo(() => calculateShippingFee(cart), [cart]);
  const cartTotal = cartSubtotal + cartShippingFee;
  const cartItemCount = useMemo(() => getCartItemCount(cart), [cart]);
  const isInCart = useCallback((code: string) => cart.some(c => c.code === code), [cart]);

  const allProducts = useMemo<(DbProduct & { field_id?: string | null })[]>(
    () => productsData?.products ?? [],
    [productsData]
  );

  // マルチ分野モード: 選択分野の商品のみフィルタ（field_id未設定の商品は全分野で表示）
  const filteredProducts = useMemo(() => {
    if (!multiFieldEnabled || !selectedFieldId) return allProducts;
    return allProducts.filter((p) => !p.field_id || p.field_id === selectedFieldId);
  }, [multiFieldEnabled, selectedFieldId, allProducts]);

  // グループごとに商品を紐付け（マルチ分野モード: fieldIdでもフィルタ）
  const groupedSections = useMemo(() => {
    const groups = multiFieldEnabled && selectedFieldId
      ? config.groups.filter((g) => !g.fieldId || g.fieldId === selectedFieldId)
      : config.groups;

    const sections = [...groups]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((group) => ({
        group,
        products: group.productCodes
          .map((code) => filteredProducts.find((p) => p.code === code))
          .filter((p): p is DbProduct => p != null),
      }))
      .filter((s) => s.products.length > 0);

    // フォールバック: グループ設定にマッチする商品がない場合、DB商品を薬剤名+用量で自動グループ化
    if (sections.length === 0 && filteredProducts.length > 0) {
      const CATEGORY_THEMES: Record<string, string> = {
        injection: "blue", oral: "emerald", pill: "pink",
        supplement: "amber", fee: "slate",
      };
      // 薬剤名+用量でグループ化（例: マンジャロ 2.5mg, マンジャロ 5mg）
      const groupKey = (p: DbProduct) => {
        const drug = p.drug_name || p.title.split(/\s/)[0] || "その他";
        return p.dosage ? `${drug} ${p.dosage}` : drug;
      };
      const drugMap = new Map<string, DbProduct[]>();
      for (const p of filteredProducts) {
        if (p.category === "fee") continue;
        const key = groupKey(p);
        if (!drugMap.has(key)) drugMap.set(key, []);
        drugMap.get(key)!.push(p);
      }
      let sortIdx = 0;
      for (const [label, prods] of drugMap) {
        const cat = prods[0]?.category || "oral";
        // 期間でソート → 同一期間内は通常便(delay=0)→予約便の順
        const sorted = prods.slice().sort((a, b) => {
          const dm = (a.duration_months ?? 0) - (b.duration_months ?? 0);
          if (dm !== 0) return dm;
          return (a.shipping_delay_days ?? 0) - (b.shipping_delay_days ?? 0);
        });
        sections.push({
          group: {
            id: `auto-${label}`,
            badgeLabel: prods[0]?.dosage || label,
            displayName: label,
            description: `${sorted.length}プラン`,
            colorTheme: CATEGORY_THEMES[cat] || "blue",
            sortOrder: sortIdx++,
            productCodes: sorted.map(p => p.code),
          },
          products: sorted,
        });
      }
    }

    return sections;
  }, [config.groups, filteredProducts, multiFieldEnabled, selectedFieldId]);

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
        {groupedSections.map(({ group, products }) => (
          <ProductGroupSection
            key={group.id}
            group={group}
            products={products}
            cartMode={cartMode}
            isReorderFlow={isReorderFlow}
            isInCart={isInCart}
            getEffectivePrice={getEffectivePrice}
            onAddToCart={handleAddToCart}
            onRemoveFromCart={handleRemoveFromCart}
            onCheckout={handleCheckout}
            onReorder={handleReorder}
            checkoutLabel={config.checkoutButtonLabel}
            reorderLabel={config.reorderButtonLabel}
          />
        ))}

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
        <CartFloatingBar
          cart={cart}
          cartItemCount={cartItemCount}
          cartSubtotal={cartSubtotal}
          cartShippingFee={cartShippingFee}
          cartTotal={cartTotal}
          onRemove={handleRemoveFromCart}
          onClear={handleClearCart}
          onCheckout={handleCartCheckout}
        />
      )}
    </div>
  );
}

// カートフローティングバー（展開可能なカート詳細表示）
function CartFloatingBar({
  cart, cartItemCount, cartSubtotal, cartShippingFee, cartTotal,
  onRemove, onClear, onCheckout,
}: {
  cart: CartItem[];
  cartItemCount: number;
  cartSubtotal: number;
  cartShippingFee: number;
  cartTotal: number;
  onRemove: (code: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 shadow-lg">
      <div className="mx-auto max-w-md px-4 py-3">
        {/* ヘッダー: タップで展開/折りたたみ */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mb-2"
        >
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">{cartItemCount}点</span>の商品
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </div>
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="text-[11px] text-slate-400 underline"
          >
            カートを空にする
          </span>
        </button>

        {/* 展開時: カート内容詳細 */}
        {expanded && (
          <div className="border-t border-slate-100 pt-2 pb-2 mb-2 max-h-[40vh] overflow-y-auto space-y-2">
            {cart.map((item) => (
              <div key={item.code} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1 mr-2">
                  <div className="text-xs font-medium text-slate-800 truncate">{item.title}</div>
                  <div className="text-[11px] text-slate-500">
                    ¥{item.price.toLocaleString()} {item.qty > 1 ? `× ${item.qty}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-slate-900">
                    ¥{(item.price * item.qty).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(item.code)}
                    className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs hover:bg-rose-100 hover:text-rose-600 transition"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 合計・決済ボタン */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500">
              商品 ¥{cartSubtotal.toLocaleString()} + 送料 ¥{cartShippingFee.toLocaleString()}
            </div>
            <div className="text-lg font-bold text-slate-900">
              合計 ¥{cartTotal.toLocaleString()}
            </div>
          </div>
          <button
            type="button"
            onClick={onCheckout}
            className="rounded-full bg-blue-600 text-white px-6 py-2.5 text-sm font-semibold shadow-md"
          >
            決済に進む
          </button>
        </div>
      </div>
    </div>
  );
}

// 商品グループセクション（期間別・配送タイプ別の整理表示対応）
function ProductGroupSection({
  group, products, cartMode, isReorderFlow, isInCart, getEffectivePrice,
  onAddToCart, onRemoveFromCart, onCheckout, onReorder, checkoutLabel, reorderLabel,
}: {
  group: PurchaseGroup;
  products: DbProduct[];
  cartMode: boolean;
  isReorderFlow: boolean;
  isInCart: (code: string) => boolean;
  getEffectivePrice: (p: DbProduct) => number;
  onAddToCart: (p: DbProduct) => void;
  onRemoveFromCart: (code: string) => void;
  onCheckout: (p: DbProduct) => void;
  onReorder: (p: DbProduct) => void;
  checkoutLabel: string;
  reorderLabel: string;
}) {
  const theme = THEME_CLASSES[group.colorTheme] ?? THEME_CLASSES.blue;
  const [showMore, setShowMore] = useState(false);

  // 自動グループ（フォールバック）かつ期間・配送タイプがある商品の場合、期間別表示
  const isAutoGroup = group.id.startsWith("auto-");
  const hasDuration = products.some(p => p.duration_months != null && p.duration_months > 0);
  const hasShippingVariants = products.some(p => (p.shipping_delay_days ?? 0) > 0);
  const useDurationView = isAutoGroup && hasDuration;

  // 期間別にグループ化
  const durationGroups = useMemo(() => {
    if (!useDurationView) return null;
    const map = new Map<number, DbProduct[]>();
    const noDuration: DbProduct[] = [];
    for (const p of products) {
      if (p.duration_months != null && p.duration_months > 0) {
        if (!map.has(p.duration_months)) map.set(p.duration_months, []);
        map.get(p.duration_months)!.push(p);
      } else {
        noDuration.push(p);
      }
    }
    const sorted = [...map.entries()].sort((a, b) => a[0] - b[0]);
    return { byDuration: sorted, noDuration };
  }, [products, useDurationView]);

  // 3ヶ月以下 / 4ヶ月以上に分割
  const DEFAULT_VISIBLE_MONTHS = 3;
  const visibleDurations = durationGroups?.byDuration.filter(([m]) => m <= DEFAULT_VISIBLE_MONTHS) ?? [];
  const moreDurations = durationGroups?.byDuration.filter(([m]) => m > DEFAULT_VISIBLE_MONTHS) ?? [];
  const hasMoreDurations = moreDurations.length > 0;

  // 商品カードレンダラー
  const renderProductCard = (p: DbProduct, compact = false) => {
    const effectivePrice = getEffectivePrice(p);
    const hasDiscount = effectivePrice < p.price;
    const isStd = (p.shipping_delay_days ?? 0) === 0;
    const shippingLabel = hasShippingVariants ? (isStd ? "通常便" : "予約便") : null;

    return (
      <div
        key={p.code}
        className={`w-full rounded-2xl border border-slate-100 bg-white shadow-sm transition active:scale-[0.99] ${compact ? "px-3 py-2.5" : "px-4 py-3.5"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {shippingLabel && (
              <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isStd ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
              }`}>
                {shippingLabel}
              </span>
            )}
            <span className="text-xs font-semibold text-slate-900 truncate">{p.title}</span>
          </div>
          <div className="text-right whitespace-nowrap shrink-0">
            {hasDiscount && (
              <span className="text-[10px] text-slate-400 line-through mr-1">¥{p.price.toLocaleString()}</span>
            )}
            <span className={`text-sm font-bold ${hasDiscount ? "text-pink-600" : "text-slate-900"}`}>
              ¥{effectivePrice.toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-400 ml-0.5">{cartMode ? "税別送料別" : ""}</span>
          </div>
        </div>
        <div className="mt-2">
          {isReorderFlow && !cartMode ? (
            <button type="button" onClick={() => onReorder(p)}
              className="w-full rounded-full bg-pink-500 text-white py-1.5 text-[11px] font-semibold">
              {reorderLabel}
            </button>
          ) : cartMode ? (
            isInCart(p.code) ? (
              <button type="button" onClick={() => onRemoveFromCart(p.code)}
                className="w-full rounded-full bg-slate-200 text-slate-600 py-1.5 text-[11px] font-semibold">
                カートから削除
              </button>
            ) : (
              <button type="button" onClick={() => onAddToCart(p)}
                className="w-full rounded-full bg-blue-500 text-white py-1.5 text-[11px] font-semibold">
                カートに追加
              </button>
            )
          ) : (
            <button type="button" onClick={() => onCheckout(p)}
              className="w-full rounded-full bg-pink-500 text-white py-1.5 text-[11px] font-semibold">
              {checkoutLabel}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-3">
      <div className={`rounded-xl border-l-4 px-3 py-2.5 ${theme.section}`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${theme.badge}`}>
            {group.badgeLabel}
          </span>
          <h2 className="text-base font-bold text-slate-900">{group.displayName}</h2>
        </div>
        <p className="mt-1 text-[11px] text-slate-600 ml-0.5">
          {group.description}
        </p>
      </div>

      {useDurationView ? (
        <div className="space-y-4">
          {/* 期間なし商品 */}
          {durationGroups?.noDuration.map(p => renderProductCard(p))}

          {/* 1-3ヶ月（デフォルト表示） */}
          {visibleDurations.map(([months, prods]) => (
            <div key={months}>
              <div className="text-[11px] font-semibold text-slate-500 mb-1.5 pl-1">{months}ヶ月</div>
              <div className="space-y-2">
                {prods.map(p => renderProductCard(p, true))}
              </div>
            </div>
          ))}

          {/* 4ヶ月以上（折りたたみ） */}
          {hasMoreDurations && !showMore && (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition"
            >
              {DEFAULT_VISIBLE_MONTHS + 1}ヶ月以上を表示（{moreDurations.reduce((s, [, p]) => s + p.length, 0)}プラン）
            </button>
          )}
          {showMore && moreDurations.map(([months, prods]) => (
            <div key={months}>
              <div className="text-[11px] font-semibold text-slate-500 mb-1.5 pl-1">{months}ヶ月</div>
              <div className="space-y-2">
                {prods.map(p => renderProductCard(p, true))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(p => renderProductCard(p))}
        </div>
      )}
    </section>
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

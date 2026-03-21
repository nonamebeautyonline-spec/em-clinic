// app/mypage/purchase/page.tsx — 購入画面（DB設定連動）
"use client";

import React, { useMemo, Suspense } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import type { PurchaseConfig, PurchaseGroup } from "@/lib/purchase/types";
import { DEFAULT_PURCHASE_CONFIG } from "@/lib/purchase/types";

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
}

function PurchasePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 設定と商品データをAPI経由で取得
  const { data: settingsData } = useSWR<{ config: PurchaseConfig }>(
    "/api/mypage/purchase-settings",
    swrFetcher,
    { revalidateOnFocus: false }
  );
  const { data: productsData } = useSWR<{ products: DbProduct[] }>(
    "/api/mypage/products",
    swrFetcher,
    { revalidateOnFocus: false }
  );

  // 設定（デフォルトフォールバック）
  const config = useMemo<PurchaseConfig>(
    () => settingsData?.config ?? DEFAULT_PURCHASE_CONFIG,
    [settingsData]
  );

  const allProducts = useMemo<DbProduct[]>(
    () => productsData?.products ?? [],
    [productsData]
  );

  // グループごとに商品を紐付け
  const groupedSections = useMemo(() => {
    return [...config.groups]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((group) => ({
        group,
        products: group.productCodes
          .map((code) => allProducts.find((p) => p.code === code))
          .filter((p): p is DbProduct => p != null),
      }))
      .filter((s) => s.products.length > 0);
  }, [config.groups, allProducts]);

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

  // 実効価格（割引対応）
  const getEffectivePrice = (p: DbProduct) => {
    if (p.discount_price != null && p.discount_until) {
      const until = new Date(p.discount_until);
      if (until > new Date()) return p.discount_price;
    }
    return p.price;
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
                            税込／送料込み
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
      </div>
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

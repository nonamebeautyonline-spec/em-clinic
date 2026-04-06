// app/mypage/purchase/reorder/page.tsx — 再処方申請確認画面（DB設定連動）
"use client";

import React, { useMemo, useState, Suspense } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import type { PurchaseConfig } from "@/lib/purchase/types";
import { DEFAULT_PURCHASE_CONFIG } from "@/lib/purchase/types";

// SWRProviderのスコープ外なのでfetcher明示指定
const swrFetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("API error");
    return r.json();
  });

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

function ReorderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code");
  const isCartMode = searchParams.get("cart") === "1";

  // カートモード: localStorageからカート情報取得
  const [cartItemsState, setCartItemsState] = useState<{ code: string; title: string; price: number; qty: number }[]>([]);
  React.useEffect(() => {
    if (isCartMode) {
      try {
        const raw = localStorage.getItem("lope_cart");
        if (raw) setCartItemsState(JSON.parse(raw));
      } catch { /* ignore */ }
    }
  }, [isCartMode]);

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

  const config = useMemo(
    () => settingsData?.config ?? DEFAULT_PURCHASE_CONFIG,
    [settingsData]
  );
  const rc = config.reorderConfirm;

  const allProducts = useMemo<DbProduct[]>(
    () => productsData?.products ?? [],
    [productsData]
  );

  const product = useMemo(
    () => (codeParam ? allProducts.find((p) => p.code === codeParam) ?? null : null),
    [codeParam, allProducts]
  );

  // 実効価格（割引対応）
  const effectivePrice = useMemo(() => {
    if (!product) return 0;
    if (product.discount_price != null && product.discount_until) {
      const until = new Date(product.discount_until);
      if (until > new Date()) return product.discount_price;
    }
    return product.price;
  }, [product]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    router.push("/mypage");
  };

  // 単一商品の再処方申請
  const submitSingle = async (code: string) => {
    const res = await fetch("/api/reorder/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productCode: code }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      if (json.error === "reservation_required") {
        throw new Error("再処方には事前の予約・診察が必要です。先に予約を取得してください。");
      }
      throw new Error(json.message || json.error || "再処方申請の送信に失敗しました。");
    }
  };

  const handleSubmit = async () => {
    if (isCartMode) {
      if (cartItemsState.length === 0) return;
    } else {
      if (!product) return;
    }
    setSubmitting(true);
    setError(null);

    try {
      if (isCartMode) {
        // カートモード: 各商品を順次申請
        for (const item of cartItemsState) {
          await submitSingle(item.code);
        }
        // カートクリア
        try { localStorage.removeItem("lope_cart"); } catch { /* ignore */ }
      } else {
        await submitSingle(product!.code);
      }
      alert(rc.successMessage);
      router.push("/mypage");
    } catch (e) {
      console.error(e);
      setError(
        (e as Error)?.message ||
          "再処方申請の送信中にエラーが発生しました。時間をおいて再度お試しください。"
      );
      setSubmitting(false);
    }
  };

  // ローディング中
  if (!settingsData || !productsData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-pink-500 border-t-transparent" />
          <p className="mt-2 text-sm text-slate-500">再処方申請画面を読み込んでいます…</p>
        </div>
      </div>
    );
  }

  // カートモード: カートが空ならエラー
  if (isCartMode && cartItemsState.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-md px-4 py-6">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">カートが空です</h1>
          <p className="text-sm text-slate-600">商品を選択してからお進みください。</p>
          <button type="button" onClick={handleBack}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-medium text-white">
            {rc.backButtonLabel}
          </button>
        </div>
      </div>
    );
  }

  if (!isCartMode && (!codeParam || !product)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-md px-4 py-6">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            再処方申請エラー
          </h1>
          <p className="text-sm text-slate-600">
            プラン情報を正しく取得できませんでした。
            お手数ですが、マイページから再度お試しください。
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-medium text-white"
          >
            {rc.backButtonLabel}
          </button>
        </div>
      </div>
    );
  }

  const hasDiscount = !isCartMode && effectivePrice < (product?.price ?? 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="text-xs text-slate-400">マイページ</div>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-lg font-semibold text-slate-900">
              {rc.title}
            </h1>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">
            {rc.description}
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="mx-auto max-w-md px-4 pb-6 pt-4 space-y-4">
        {/* カートモード: 複数商品リスト */}
        {isCartMode ? (
          <div className="rounded-2xl border border-pink-200 bg-white shadow-sm px-4 py-3.5">
            <div className="text-xs font-semibold text-slate-700 mb-2">申請内容</div>
            <div className="space-y-2">
              {cartItemsState.map((item) => (
                <div key={item.code} className="flex items-center justify-between text-sm">
                  <span className="text-slate-800">{item.title}</span>
                  <span className="font-medium text-slate-900">¥{(item.price * item.qty).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 mt-3 pt-2">
              <div className="flex justify-between text-sm font-bold text-slate-900">
                <span>{rc.priceLabel}</span>
                <span>¥{cartItemsState.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-slate-400 text-right mt-0.5">{rc.priceSuffix}</div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-pink-200 bg-white shadow-sm px-4 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-900">
                    {product!.title}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  {product!.dosage ? `${product!.dosage}` : ""}
                  {product!.duration_months ? `／${product!.duration_months}ヶ月分` : ""}
                  {product!.quantity ? `（全${product!.quantity}本）` : ""}
                  {product!.duration_months || product!.quantity ? "／週1回" : ""}
                </p>
              </div>
              <div className="text-right whitespace-nowrap">
                <div className="text-[11px] text-slate-400">{rc.priceLabel}</div>
                {hasDiscount && (
                  <div className="text-[10px] text-slate-400 line-through">
                    ¥{product!.price.toLocaleString()}
                  </div>
                )}
                <div className={`text-lg font-semibold ${hasDiscount ? "text-pink-600" : "text-slate-900"}`}>
                  ¥{effectivePrice.toLocaleString()}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">
                  {rc.priceSuffix}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[11px] text-red-700 whitespace-pre-line">
              {error}
            </p>
          </div>
        )}

        {/* ボタン群 */}
        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full rounded-full bg-pink-500 text-white py-2 text-[12px] font-semibold disabled:opacity-60"
          >
            {submitting ? rc.submittingLabel : rc.submitButtonLabel}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleBack}
            className="w-full rounded-full border border-slate-200 bg-white text-slate-700 py-2 text-[11px] font-medium"
          >
            {rc.backButtonLabel}
          </button>
        </div>

        {rc.footerNote && (
          <p className="mt-3 text-[10px] text-slate-400 leading-relaxed whitespace-pre-line">
            {rc.footerNote}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ReorderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-sm text-slate-500">再処方申請画面を読み込んでいます…</p>
        </div>
      }
    >
      <ReorderContent />
    </Suspense>
  );
}

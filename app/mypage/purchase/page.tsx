// app/mypage/purchase/page.tsx
"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ProductCode =
  | "MJL_2.5mg_1m"
  | "MJL_2.5mg_2m"
  | "MJL_2.5mg_3m"
  | "MJL_5mg_1m"
  | "MJL_5mg_2m"
  | "MJL_5mg_3m"
  | "MJL_7.5mg_1m"
  | "MJL_7.5mg_2m"
  | "MJL_7.5mg_3m";

type Product = {
  code: ProductCode;
  title: string;
  mg: "2.5mg" | "5mg" | "7.5mg";
  months: 1 | 2 | 3;
  shots: number; // 本数
  price: number; // 円（税込）
};

const PRODUCTS: Product[] = [
  // 2.5mg
  {
    code: "MJL_2.5mg_1m",
    title: "マンジャロ 2.5mg 1ヶ月",
    mg: "2.5mg",
    months: 1,
    shots: 4,
    price: 13000,
  },
  {
    code: "MJL_2.5mg_2m",
    title: "マンジャロ 2.5mg 2ヶ月",
    mg: "2.5mg",
    months: 2,
    shots: 8,
    price: 25500,
  },
  {
    code: "MJL_2.5mg_3m",
    title: "マンジャロ 2.5mg 3ヶ月",
    mg: "2.5mg",
    months: 3,
    shots: 12,
    price: 35000,
  },
  // 5mg
  {
    code: "MJL_5mg_1m",
    title: "マンジャロ 5mg 1ヶ月",
    mg: "5mg",
    months: 1,
    shots: 4,
    price: 22850,
  },
  {
    code: "MJL_5mg_2m",
    title: "マンジャロ 5mg 2ヶ月",
    mg: "5mg",
    months: 2,
    shots: 8,
    price: 45500,
  },
  {
    code: "MJL_5mg_3m",
    title: "マンジャロ 5mg 3ヶ月",
    mg: "5mg",
    months: 3,
    shots: 12,
    price: 63000,
  },
  // 7.5mg
  {
    code: "MJL_7.5mg_1m",
    title: "マンジャロ 7.5mg 1ヶ月",
    mg: "7.5mg",
    months: 1,
    shots: 4,
    price: 34000,
  },
  {
    code: "MJL_7.5mg_2m",
    title: "マンジャロ 7.5mg 2ヶ月",
    mg: "7.5mg",
    months: 2,
    shots: 8,
    price: 65000,
  },
  {
    code: "MJL_7.5mg_3m",
    title: "マンジャロ 7.5mg 3ヶ月",
    mg: "7.5mg",
    months: 3,
    shots: 12,
    price: 96000,
  },
];

const MG_SECTIONS: { mg: Product["mg"]; label: string }[] = [
  { mg: "2.5mg", label: "マンジャロ 2.5mg" },
  { mg: "5mg", label: "マンジャロ 5mg" },
  { mg: "7.5mg", label: "マンジャロ 7.5mg" },
];

function PurchasePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // flow === "reorder" なら再処方モード
  const flow = searchParams.get("flow");
  const isReorderFlow = flow === "reorder";

  const pageTitle = isReorderFlow
    ? "マンジャロ再処方の申請"
    : "マンジャロ購入（今回の診察分）";

  const description = isReorderFlow
    ? "再処方を希望される内容を選択してください。診察内容と前回の経過を踏まえて、Drが再処方可否を判断いたします。"
    : "本ページは診察後に決定した「今回の処方分」の決済専用です。必ず診察時に医師と決定した用量のみをご選択ください。";

  // 初回決済用：内容確認ページへ
  const handleCheckoutForCurrentVisit = (product: Product) => {
    router.push(`/mypage/purchase/confirm?code=${product.code}&mode=current`);
  };

  // 再処方用：再処方申請確認ページへ
  const handleReorderRequest = (product: Product) => {
    router.push(`/mypage/purchase/reorder?code=${product.code}`);
  };

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
        {MG_SECTIONS.map((section) => {
          const items = PRODUCTS.filter((p) => p.mg === section.mg).sort(
            (a, b) => a.months - b.months
          );

          const sectionColor =
            section.mg === "2.5mg"
              ? "border-emerald-400 bg-emerald-50"
              : section.mg === "5mg"
              ? "border-blue-400 bg-blue-50"
              : "border-purple-400 bg-purple-50";
          const badgeColor =
            section.mg === "2.5mg"
              ? "bg-emerald-500"
              : section.mg === "5mg"
              ? "bg-blue-500"
              : "bg-purple-500";

          return (
            <section key={section.mg} className="space-y-3">
              <div className={`rounded-xl border-l-4 px-3 py-2.5 ${sectionColor}`}>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${badgeColor}`}>
                    {section.mg}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    {section.label}
                  </h2>
                </div>
                <p className="mt-1 text-[11px] text-slate-600 ml-0.5">
                  週1回注射／{items.length}プラン
                </p>
              </div>

              <div className="space-y-3">
                {items.map((p) => (
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
                          {p.months}ヶ月分（全{p.shots}本）／週1回
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div className="text-[11px] text-slate-400">料金</div>
                        <div className="text-base font-semibold text-slate-900">
                          ¥{p.price.toLocaleString()}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          税込／送料込み
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      {isReorderFlow ? (
                        // ★ 再処方モード：申請に進む
                        <button
                          type="button"
                          onClick={() => handleReorderRequest(p)}
                          className="w-full rounded-full bg-pink-500 text-white py-1.5 text-[11px] font-semibold disabled:opacity-60"
                        >
                          この内容で再処方を申請する
                        </button>
                      ) : (
                        // 初回決済モード：決済確認へ
                        <button
                          type="button"
                          onClick={() => handleCheckoutForCurrentVisit(p)}
                          className="w-full rounded-full bg-pink-500 text-white py-1.5 text-[11px] font-semibold disabled:opacity-60"
                        >
                          この内容で今回の決済に進む
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <p className="mt-4 text-[10px] text-slate-400 leading-relaxed">
          ※ 用量は必ず診察時に医師と確認の上でご選択ください。
          <br />
          ※ 再処方を希望される場合は、再処方モードで申請してください。
        </p>
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

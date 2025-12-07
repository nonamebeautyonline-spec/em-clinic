// app/mypage/purchase/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";

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
  recommended?: boolean;
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
  // 5mg（人気）
  {
    code: "MJL_5mg_1m",
    title: "マンジャロ 5mg 1ヶ月",
    mg: "5mg",
    months: 1,
    shots: 4,
    price: 23000, // 必要ならここは後で調整
    recommended: true,
  },
  {
    code: "MJL_5mg_2m",
    title: "マンジャロ 5mg 2ヶ月",
    mg: "5mg",
    months: 2,
    shots: 8,
    price: 45500,
    recommended: true,
  },
  {
    code: "MJL_5mg_3m",
    title: "マンジャロ 5mg 3ヶ月",
    mg: "5mg",
    months: 3,
    shots: 12,
    price: 63000,
    recommended: true,
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
  { mg: "5mg", label: "マンジャロ 5mg（人気）" },
  { mg: "7.5mg", label: "マンジャロ 7.5mg" },
];

export default function PurchasePage() {
  const router = useRouter();

  // 診察後の「今回の処方分」を決済するとき
  const handleCheckoutForCurrentVisit = (product: Product) => {
    // TODO: ここから /api/checkout を叩く or 確認ページ経由で Square 決済へ
    router.push(`/mypage/purchase/confirm?code=${product.code}&mode=current`);
  };

  // 再処方申請としてドクター承認待ちにする時
  const handleReorderRequest = (product: Product) => {
    // TODO: ここから /api/reorder/apply を叩く or 再処方確認ページへ
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
              マンジャロ購入・再処方
            </h1>
            <span className="rounded-full bg-pink-50 px-3 py-1 text-[11px] font-medium text-pink-600">
              診察後専用
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
            本ページは
            <strong>診察後の決済・再処方申請専用</strong>
            です。
            <br />
            <strong>必ず診察時に医師と決定した用量・期間のみを選択してください。</strong>
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="mx-auto max-w-md px-4 pb-6 pt-3 space-y-6">
        {MG_SECTIONS.map((section) => {
          const items = PRODUCTS.filter((p) => p.mg === section.mg).sort(
            (a, b) => a.months - b.months
          );

          return (
            <section key={section.mg} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {section.label}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    週1回注射／{items.length}プラン
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {items.map((p) => (
                  <div
                    key={p.code}
                    className={[
                      "w-full rounded-2xl border px-4 py-3.5 bg-white shadow-sm",
                      "transition active:scale-[0.99]",
                      p.recommended
                        ? "border-pink-200 shadow-pink-100/70"
                        : "border-slate-100",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-900">
                            {p.title}
                          </span>
                          {p.recommended && (
                            <span className="rounded-full bg-pink-100 px-2 py-[2px] text-[10px] font-semibold text-pink-700">
                              人気
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {p.months}ヶ月分（全{p.shots}本）／週1回
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Product Name:{" "}
                          <span className="font-mono text-[10px] text-slate-500">
                            {p.code}
                          </span>
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

                    {/* ボタン群：今回診察分の決済 & 再処方申請 */}
                    <div className="mt-3 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCheckoutForCurrentVisit(p)}
                        className="w-full rounded-full bg-pink-500 text-white py-1.5 text-[11px] font-semibold disabled:opacity-60"
                      >
                        この内容で{" "}
                        <span className="underline decoration-white/40 underline-offset-2">
                          今回の診察分として決済に進む
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorderRequest(p)}
                        className="w-full rounded-full border border-pink-200 bg-pink-50 text-pink-700 py-1.5 text-[11px] font-medium"
                      >
                        この内容で <span className="font-semibold">再処方を申請する</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <p className="mt-4 text-[10px] text-slate-400 leading-relaxed">
          ※ 用量・期間は必ず診察時に医師と確認の上でご選択ください。<br />
          ※ 再処方申請後は、医師の確認・承認を経てから決済が可能になります。
        </p>
      </div>
    </div>
  );
}

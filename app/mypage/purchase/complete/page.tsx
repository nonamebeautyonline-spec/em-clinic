// app/mypage/purchase/complete/page.tsx
"use client";

import React, { useMemo, Suspense } from "react";
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
  shots: number;
  price: number;
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

// 内側：ここで useSearchParams / useRouter を使う
function PurchaseCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code") as ProductCode | null;

  const product = useMemo(
    () => (codeParam ? PRODUCTS.find((p) => p.code === codeParam) ?? null : null),
    [codeParam]
  );

  const handleGoMypageTop = () => {
    router.push("/mypage");
  };

  const handleGoPurchaseList = () => {
    router.push("/mypage/purchase");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="text-xs text-slate-400">マイページ</div>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-lg font-semibold text-slate-900">
              決済が完了しました
            </h1>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
            決済ありがとうございます。
            <br />
            <strong>
              診察時に医師と決定した用量・期間のみが決済されています。
            </strong>
            <br />
            お支払い内容の概要は下記をご確認ください。
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="mx-auto max-w-md px-4 pb-6 pt-4 space-y-4">
        {/* プラン情報カード or エラー */}
        {product ? (
          <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm px-4 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-900">
                    {product.title}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  {product.mg}／{product.months}ヶ月分（全{product.shots}本）／週1回
                </p>
              </div>
              <div className="text-right whitespace-nowrap">
                <div className="text-[11px] text-slate-400">お支払い金額</div>
                <div className="text-lg font-semibold text-slate-900">
                  ¥{product.price.toLocaleString()}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">
                  税込／送料込み
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[11px] text-amber-900 leading-relaxed">
              決済内容の詳細を取得できませんでした。
              <br />
              マイページの「注文履歴」または「発送状況」から、反映状況をご確認ください。
            </p>
          </div>
        )}

        {/* 注意・案内 */}
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] text-slate-700 leading-relaxed">
            ・決済内容は、数分以内にマイページの「注文履歴」「発送状況」に反映されます。
            <br />
            ・体調の変化や副作用がある場合は、次回投与前に必ずクリニックまでご連絡ください。
            <br />
            ・決済に心当たりがない場合や内容に誤りがある場合は、
            速やかにクリニックまでお問い合わせください。
          </p>
        </div>

        {/* ボタン */}
        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleGoMypageTop}
            className="w-full rounded-full bg-pink-500 text-white py-2 text-[12px] font-semibold"
          >
            マイページTOPに戻る
          </button>
          <button
            type="button"
            onClick={handleGoPurchaseList}
            className="w-full rounded-full border border-slate-200 bg-white text-slate-700 py-2 text-[11px] font-medium"
          >
            マンジャロ購入ページをもう一度見る
          </button>
        </div>

        <p className="mt-3 text-[10px] text-slate-400 leading-relaxed">
          ※ 決済情報の正式な記録・発送処理は、クリニック側システム（Square／発送リスト）に基づいて行われます。
          画面表示とタイムラグが生じる場合があります。
        </p>
      </div>
    </div>
  );
}

// 外側：Suspenseでラップ
export default function PurchaseCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          <div className="mx-auto max-w-md px-4 py-6 text-sm text-slate-600">
            決済完了画面を読み込んでいます…
          </div>
        </div>
      }
    >
      <PurchaseCompleteContent />
    </Suspense>
  );
}

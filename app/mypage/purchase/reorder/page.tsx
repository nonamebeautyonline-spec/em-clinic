// app/mypage/purchase/reorder/page.tsx
"use client";

import React, { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";


// ProductCode は purchase ページと同じ
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

// purchase/page.tsx と同じ PRODUCTS をコピー（または共通化してもOK）
const PRODUCTS: Product[] = [
  { code: "MJL_2.5mg_1m", title: "マンジャロ 2.5mg 1ヶ月", mg: "2.5mg", months: 1, shots: 4, price: 13000 },
  { code: "MJL_2.5mg_2m", title: "マンジャロ 2.5mg 2ヶ月", mg: "2.5mg", months: 2, shots: 8, price: 25500 },
  { code: "MJL_2.5mg_3m", title: "マンジャロ 2.5mg 3ヶ月", mg: "2.5mg", months: 3, shots: 12, price: 35000 },
  { code: "MJL_5mg_1m",   title: "マンジャロ 5mg 1ヶ月",   mg: "5mg",   months: 1, shots: 4, price: 23000 },
  { code: "MJL_5mg_2m",   title: "マンジャロ 5mg 2ヶ月",   mg: "5mg",   months: 2, shots: 8, price: 45500 },
  { code: "MJL_5mg_3m",   title: "マンジャロ 5mg 3ヶ月",   mg: "5mg",   months: 3, shots: 12, price: 63000 },
  { code: "MJL_7.5mg_1m", title: "マンジャロ 7.5mg 1ヶ月", mg: "7.5mg", months: 1, shots: 4, price: 34000 },
  { code: "MJL_7.5mg_2m", title: "マンジャロ 7.5mg 2ヶ月", mg: "7.5mg", months: 2, shots: 8, price: 65000 },
  { code: "MJL_7.5mg_3m", title: "マンジャロ 7.5mg 3ヶ月", mg: "7.5mg", months: 3, shots: 12, price: 96000 },
];

function ReorderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code") as ProductCode | null;

  const product = useMemo(
    () => (codeParam ? PRODUCTS.find((p) => p.code === codeParam) ?? null : null),
    [codeParam]
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    router.push("/mypage");
  };

  const handleSubmit = async () => {
    if (!product) return;
    setSubmitting(true);
    setError(null);

    // ★ ここではまだバックエンド連携はせず、UIだけ
    // 将来 /api/reorder/apply に飛ばす想定
    try {
      // TODO: /api/reorder/apply を作ったらここで POST
      // await fetch("/api/reorder/apply", { ... });

      alert(
        "再処方の申請を受け付けました。\n\nDrが処方内容を確認し、処方が可能と判断された後に決済フォームをお送りさせていただきます。"
      );
      router.push("/mypage");
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          "再処方申請の送信に失敗しました。時間をおいて再度お試しください。"
      );
      setSubmitting(false);
    }
  };

  if (!codeParam || !product) {
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
            マイページに戻る
          </button>
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
              再処方の申請内容確認
            </h1>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
            下記の内容で{" "}
            <strong>再処方の申請</strong>
            を行います。
            <br />
            <strong>
              Drが処方内容を確認し、処方が可能と判断された後に決済フォームをお送りさせていただきます。
            </strong>
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="mx-auto max-w-md px-4 pb-6 pt-4 space-y-4">
        {/* プラン情報カード */}
        <div className="rounded-2xl border border-pink-200 bg-white shadow-sm px-4 py-3.5">
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
              <div className="text-[11px] text-slate-400">想定ご請求額</div>
              <div className="text-lg font-semibold text-slate-900">
                ¥{product.price.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-400">
                税込／送料込み（再処方時に決済）
              </div>
            </div>
          </div>
        </div>

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
            {submitting ? "申請を送信しています..." : "この内容で再処方を申請する"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleBack}
            className="w-full rounded-full border border-slate-200 bg-white text-slate-700 py-2 text-[11px] font-medium"
          >
            マイページに戻る
          </button>
        </div>

        <p className="mt-3 text-[10px] text-slate-400 leading-relaxed">
          ※ 再処方の可否は、体調や前回処方後の経過を踏まえてDrが判断いたします。
          <br />
          ※ 再処方が難しい場合には、LINEよりご連絡させていただきます。
        </p>
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

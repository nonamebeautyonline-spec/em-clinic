// app/mypage/purchase/bank-transfer/page.tsx
"use client";

import React, { useMemo, useState, useEffect, Suspense } from "react";
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

function BankTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patientId, setPatientId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // patientId取得
  useEffect(() => {
    const fetchIdentity = async () => {
      try {
        const res = await fetch("/api/mypage/identity", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || json?.ok === false) {
          setError("本人確認（連携）が完了していません。マイページTOPから再度お試しください。");
          return;
        }

        if (json?.patientId) {
          setPatientId(String(json.patientId));
          return;
        }

        setError("本人確認情報の取得に失敗しました。");
      } catch {
        setError("本人確認情報の取得に失敗しました。通信環境をご確認ください。");
      }
    };

    fetchIdentity();
  }, []);

  const codeParam = searchParams.get("code") as ProductCode | null;
  const modeParam = searchParams.get("mode"); // ★ 追加
  const reorderIdParam = searchParams.get("reorder_id"); // ★ 追加

  const product = useMemo(
    () => (codeParam ? PRODUCTS.find((p) => p.code === codeParam) ?? null : null),
    [codeParam]
  );

  const handleBack = () => {
    if (modeParam === "reorder") {
      router.push("/mypage");
    } else {
      router.push("/mypage/purchase");
    }
  };

  const handleTransferCompleted = () => {
    if (!product || !patientId) return;

    // ★ 配送先情報入力画面へ遷移（mode, reorder_idも渡す）
    const params = new URLSearchParams({
      code: product.code,
      patientId
    });
    if (modeParam) params.append("mode", modeParam);
    if (reorderIdParam) params.append("reorder_id", reorderIdParam);

    router.push(`/mypage/purchase/bank-transfer/shipping?${params.toString()}`);
  };

  if (!codeParam || !product) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-md px-4 py-6">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            内容確認エラー
          </h1>
          <p className="text-sm text-slate-600">
            プラン情報を正しく取得できませんでした。
            お手数ですが、もう一度プラン選択画面からやり直してください。
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-medium text-white"
          >
            プラン選択画面に戻る
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
              銀行振込での決済
            </h1>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
            下記の口座へお振込みください。
            <br />
            <strong className="text-pink-600">
              振込完了後、必ず「振込完了しました」ボタンを押してください。
            </strong>
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="mx-auto max-w-md px-4 pb-6 pt-4 space-y-4">
        {/* 決済情報 */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">決済情報</h2>
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
        </div>

        {/* 口座情報 */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">口座情報</h2>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3.5">
            <div className="space-y-2 text-[11px] text-blue-900">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold min-w-[60px]">銀行名</span>
                <span>住信SBIネット銀行</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold min-w-[60px]">支店</span>
                <span>法人第一支店（106）</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold min-w-[60px]">口座種別</span>
                <span>普通</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold min-w-[60px]">口座番号</span>
                <span className="font-mono text-sm">2931048</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold min-w-[60px]">口座名義</span>
                <span>カ）コブシ</span>
              </div>
            </div>
          </div>
        </div>

        {/* 注意書き */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] text-amber-900 leading-relaxed">
            <strong>・振込完了後は必ず下記の「振込完了しました」ボタンを押してください。</strong>
            <br />
            <strong>・ボタンを押した後、配送先住所の入力が必要です。</strong>
            <br />
            ・振込手数料はお客様のご負担となります。
            <br />
            ・土日祝やお使いの銀行によって、振込反映が翌営業日になる場合がございます。当方で振込確認後の発送となります。
          </p>
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
            disabled={submitting || !patientId}
            onClick={handleTransferCompleted}
            className="w-full rounded-full bg-pink-500 text-white py-2 text-[12px] font-semibold disabled:opacity-60"
          >
            振込完了しました（必ず押してください）
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleBack}
            className="w-full rounded-full border border-slate-200 bg-white text-slate-700 py-2 text-[11px] font-medium"
          >
            プラン選択画面に戻る
          </button>
        </div>

        <p className="mt-3 text-[10px] text-slate-400 leading-relaxed">
          ※ この後配送先住所の入力が必要です。
          <br />
          ※ 振込確認後に商品を発送いたします。
        </p>
      </div>
    </div>
  );
}

// Suspenseラッパー
export default function BankTransferPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          <div className="mx-auto max-w-md px-4 py-6 text-sm text-slate-600">
            振込情報を読み込んでいます…
          </div>
        </div>
      }
    >
      <BankTransferContent />
    </Suspense>
  );
}

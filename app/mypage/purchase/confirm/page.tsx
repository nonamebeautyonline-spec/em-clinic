// app/mypage/purchase/confirm/page.tsx
"use client";

import React, { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SquareCardForm from "@/components/SquareCardForm";


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

type Mode = "current" | "first" | "reorder";

type Product = {
  code: ProductCode;
  title: string;
  mg: "2.5mg" | "5mg" | "7.5mg";
  months: 1 | 2 | 3;
  shots: number;
  price: number;
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

type SdkConfig = {
  enabled: boolean;
  applicationId?: string;
  locationId?: string;
  environment?: "sandbox" | "production";
};

type SavedCard = {
  hasCard: boolean;
  cardId?: string;
  brand?: string;
  last4?: string;
};

type ShippingData = {
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
};

// 内側：ここで useSearchParams / useRouter を使う
function PurchaseConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reorderIdParam = searchParams.get("reorder_id");

  // patientId は /api/mypage/identity から取得
  const [patientId, setPatientId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // inline決済用 state
  const [sdkConfig, setSdkConfig] = useState<SdkConfig | null>(null);
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [paymentMode, setPaymentMode] = useState<"saved_card" | "new_card">("new_card");
  const [shipping, setShipping] = useState<ShippingData>({
    name: "",
    postalCode: "",
    address: "",
    phone: "",
    email: "",
  });

  const isInline = sdkConfig?.enabled === true;
  const shippingValid =
    shipping.name.trim() !== "" &&
    shipping.postalCode.trim() !== "" &&
    shipping.address.trim() !== "" &&
    shipping.phone.trim() !== "" &&
    shipping.email.trim() !== "";

  // identity から patientId を取得
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

  // SDK設定 + 保存済みカード情報を取得
  useEffect(() => {
    Promise.all([
      fetch("/api/square/sdk-config", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/square/saved-card", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([config, card]: [SdkConfig, SavedCard]) => {
        setSdkConfig(config);
        setSavedCard(card);
        if (card?.hasCard) setPaymentMode("saved_card");
      })
      .catch(() => {
        setSdkConfig({ enabled: false });
        setSavedCard({ hasCard: false });
      });
  }, []);

  const codeParam = searchParams.get("code") as ProductCode | null;
  const modeParam = searchParams.get("mode") as Mode | null;

  const product = useMemo(
    () => (codeParam ? PRODUCTS.find((p) => p.code === codeParam) ?? null : null),
    [codeParam],
  );

  const isValidMode =
    modeParam === "current" || modeParam === "first" || modeParam === "reorder";

  const pageTitle =
    modeParam === "current"
      ? "今回の診察分の内容確認"
      : modeParam === "first"
        ? "初回診察用プラン確認"
        : modeParam === "reorder"
          ? "再処方分の内容確認"
          : "内容確認";

  const handleBack = () => {
    if (modeParam === "reorder") {
      router.push("/mypage");
    } else {
      router.push("/mypage/purchase");
    }
  };

  // hosted モードの既存フロー
  const handleSubmit = async () => {
    if (!product || !modeParam) return;
    if (!patientId) {
      setError("本人確認情報を取得中です。数秒後にもう一度お試しください。");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: product.code,
          mode: modeParam,
          patientId,
          reorderId: reorderIdParam ?? null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "決済の準備に失敗しました。");
      }

      const data: { checkoutUrl?: string } = await res.json();
      if (!data.checkoutUrl) {
        throw new Error("決済画面のURLを取得できませんでした。");
      }
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setError(
        e?.message || "決済の準備中にエラーが発生しました。時間をおいて再度お試しください。",
      );
      setSubmitting(false);
    }
  };

  // inline決済: /api/square/pay を呼ぶ共通処理
  const submitInlinePayment = useCallback(
    async (sourceId: string) => {
      if (!product || !patientId || !shippingValid) return;
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch("/api/square/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            sourceId,
            productCode: product.code,
            mode: modeParam,
            patientId,
            reorderId: reorderIdParam ?? null,
            saveCard: true,
            shipping,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "決済に失敗しました");
        router.push(`/mypage/purchase/complete?code=${product.code}`);
      } catch (e: any) {
        setError(e?.message || "決済処理中にエラーが発生しました");
        setSubmitting(false);
      }
    },
    [product, patientId, modeParam, reorderIdParam, shipping, shippingValid, router],
  );

  // 新規カードの nonce 受取
  const handleNonceReady = useCallback(
    (nonce: string) => submitInlinePayment(nonce),
    [submitInlinePayment],
  );

  // 保存済みカードで決済
  const handleSavedCardPay = useCallback(() => {
    if (savedCard?.cardId) submitInlinePayment(savedCard.cardId);
  }, [savedCard, submitInlinePayment]);

  const handleCardFormError = useCallback((msg: string) => setError(msg), []);

  if (!codeParam || !product || !modeParam || !isValidMode) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-md px-4 py-6">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">内容確認エラー</h1>
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
            <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
            <strong>必ず診察時に医師と決定した用量のみを選択してください。</strong>
            <br />
            下記の内容で問題なければ、「この内容で決済に進む」を押してください。
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
                <span className="text-xs font-semibold text-slate-900">{product.title}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600">
                {product.mg}/{product.months}ヶ月分（全{product.shots}本）/週1回
              </p>
            </div>
            <div className="text-right whitespace-nowrap">
              <div className="text-[11px] text-slate-400">お支払い金額</div>
              <div className="text-lg font-semibold text-slate-900">
                ¥{product.price.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-400">税込/送料込み</div>
            </div>
          </div>
        </div>

        {/* 注意書き */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] text-amber-900 leading-relaxed">
            ・本決済は、診察時に医師と確認した内容に基づくものです。医師の指示と異なる
            <strong>用量</strong>
            を選択しないでください。
            <br />
            ・体調の変化や副作用がある場合は、決済の前に必ずクリニックまでご相談ください。
          </p>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[11px] text-red-700 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* 発送タイミングの案内 */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-[11px] text-blue-900 leading-relaxed">
            <strong>当日発送について</strong>
            <br />
            12時までに決済が完了した場合、当日発送いたします。
          </p>
        </div>

        {/* 決済方法選択 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">決済方法を選択</h3>

          {/* ===== inline モード（アプリ内決済） ===== */}
          {isInline ? (
            <div className="space-y-4">
              {/* 配送先住所フォーム */}
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 space-y-3">
                <p className="text-[11px] font-medium text-slate-700">配送先情報</p>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">配送先氏名</label>
                    <input
                      type="text"
                      value={shipping.name}
                      onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))}
                      disabled={submitting}
                      placeholder="山田 太郎"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-300 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">郵便番号</label>
                    <input
                      type="text"
                      value={shipping.postalCode}
                      onChange={(e) => setShipping((s) => ({ ...s, postalCode: e.target.value }))}
                      disabled={submitting}
                      placeholder="123-4567"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-300 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">住所</label>
                    <input
                      type="text"
                      value={shipping.address}
                      onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))}
                      disabled={submitting}
                      placeholder="東京都渋谷区..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-300 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">電話番号</label>
                    <input
                      type="tel"
                      value={shipping.phone}
                      onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
                      disabled={submitting}
                      placeholder="090-1234-5678"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-300 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">メールアドレス</label>
                    <input
                      type="email"
                      value={shipping.email}
                      onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))}
                      disabled={submitting}
                      placeholder="example@mail.com"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-300 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              {/* 配送先未入力の案内 */}
              {!shippingValid && (
                <p className="text-[10px] text-amber-600 px-2">
                  配送先情報を全て入力すると決済ボタンが有効になります
                </p>
              )}

              {/* 保存済みカードがある場合: カード選択UI */}
              {savedCard?.hasCard && (
                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      paymentMode === "saved_card"
                        ? "border-pink-400 bg-pink-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pay_method"
                      value="saved_card"
                      checked={paymentMode === "saved_card"}
                      onChange={() => setPaymentMode("saved_card")}
                      className="w-4 h-4 mt-0.5 text-pink-500"
                    />
                    <div>
                      <span className="text-[12px] font-medium text-slate-900">
                        前回のカード（{savedCard.brand} ****{savedCard.last4}）
                      </span>
                      <p className="text-[10px] text-slate-500">保存済みカードで即時決済</p>
                    </div>
                  </label>
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      paymentMode === "new_card"
                        ? "border-pink-400 bg-pink-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pay_method"
                      value="new_card"
                      checked={paymentMode === "new_card"}
                      onChange={() => setPaymentMode("new_card")}
                      className="w-4 h-4 mt-0.5 text-pink-500"
                    />
                    <div>
                      <span className="text-[12px] font-medium text-slate-900">
                        新しいカードで決済
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* 保存済みカードで即決済 */}
              {paymentMode === "saved_card" && savedCard?.hasCard && (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={submitting || !patientId || !shippingValid}
                    onClick={handleSavedCardPay}
                    className="w-full rounded-full bg-pink-500 text-white py-2.5 text-[12px] font-semibold disabled:opacity-60"
                  >
                    {submitting
                      ? "決済処理中..."
                      : `${savedCard.brand} ****${savedCard.last4} で決済する`}
                  </button>
                  <p className="text-[10px] text-slate-400 leading-relaxed px-1">
                    Square決済を使用しており、カード情報はのなめビューティー上では保存されません。
                    カード情報は全てSquare社のセキュリティ基準（PCI DSS）に基づき安全に処理されます。
                  </p>
                </div>
              )}

              {/* 新規カード入力（Web Payments SDK） */}
              {paymentMode === "new_card" && sdkConfig?.applicationId && sdkConfig?.locationId && (
                <SquareCardForm
                  applicationId={sdkConfig.applicationId}
                  locationId={sdkConfig.locationId}
                  environment={sdkConfig.environment || "production"}
                  onTokenize={handleNonceReady}
                  onError={handleCardFormError}
                  disabled={submitting || !patientId || !shippingValid}
                />
              )}
            </div>
          ) : (
            /* ===== hosted モード（既存のまま） ===== */
            <div className="space-y-2">
              <button
                type="button"
                disabled={submitting || !patientId}
                onClick={handleSubmit}
                className="w-full rounded-full bg-pink-500 text-white py-2.5 text-[12px] font-semibold disabled:opacity-60"
              >
                {submitting ? "決済画面を準備しています..." : "クレジットカードで決済"}
              </button>
              <p className="text-[10px] text-slate-500 px-2">
                即時決済完了で発送手続きがスムーズ｜Squareの安全な決済システム
              </p>
            </div>
          )}

          {/* 銀行振込 */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={!patientId || !product}
              onClick={() => {
                const params = new URLSearchParams({ code: product?.code || "" });
                if (modeParam) params.append("mode", modeParam);
                if (reorderIdParam) params.append("reorder_id", reorderIdParam);
                router.push(`/mypage/purchase/bank-transfer?${params.toString()}`);
              }}
              className="w-full rounded-full bg-blue-500 text-white py-2.5 text-[12px] font-semibold disabled:opacity-60"
            >
              銀行振込で決済
            </button>
            <p className="text-[10px] text-slate-500 px-2">
              金曜15時〜月曜9時のお振込みはご利用の銀行次第で反映が翌営業日となる場合があります。振込確認後の発送となります。
            </p>
          </div>

          {/* 戻るボタン */}
          <button
            type="button"
            disabled={submitting}
            onClick={handleBack}
            className="w-full rounded-full border border-slate-200 bg-white text-slate-700 py-2 text-[11px] font-medium mt-2"
          >
            プラン選択画面に戻る
          </button>
        </div>

        <p className="mt-3 text-[10px] text-slate-400 leading-relaxed">
          ※ 決済完了後のキャンセル・変更についてはクリニックの規約に従います。
        </p>
      </div>
    </div>
  );
}


// 外側ラッパー：Suspense で内側を包む
export default function PurchaseConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          <div className="mx-auto max-w-md px-4 py-6 text-sm text-slate-600">
            内容確認画面を読み込んでいます…
          </div>
        </div>
      }
    >
      <PurchaseConfirmContent />
    </Suspense>
  );
}

// app/mypage/purchase/bank-transfer/shipping/page.tsx
"use client";

import React, { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

const swrFetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("API error");
    return r.json();
  });

function ShippingFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const codeParam = searchParams.get("code");
  const patientIdParam = searchParams.get("patientId");
  const modeParam = searchParams.get("mode"); // ★ 追加
  const reorderIdParam = searchParams.get("reorder_id"); // ★ 追加

  const [accountName, setAccountName] = useState("");
  const [shippingName, setShippingName] = useState(""); // ★ 追加: 配送先氏名（漢字）
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [autoAddress, setAutoAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usePrevShipping, setUsePrevShipping] = useState(false);
  const [postalError, setPostalError] = useState<string | null>(null);
  const [postalSearching, setPostalSearching] = useState(false);

  // 郵便番号からzipcloud検索（リトライ付き）— 成功時はautoAddress文字列を返す
  const searchZipcloud = useCallback(async (digits: string): Promise<string | null> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`);
        const data = await res.json();
        if (data.results?.[0]) {
          const r = data.results[0];
          const addr = `${r.address1}${r.address2}${r.address3}`;
          setAutoAddress(addr);
          setPostalError(null);
          return addr;
        }
        setPostalError("該当する住所が見つかりません。郵便番号をご確認ください。");
        return null;
      } catch {
        if (attempt < 2) await new Promise(r => setTimeout(r, 500));
      }
    }
    setPostalError("住所の検索に失敗しました。「再検索」をお試しください。");
    return null;
  }, []);

  // 郵便番号入力ハンドラ
  const handlePostalCodeChange = useCallback(async (value: string) => {
    setPostalCode(value);
    setPostalError(null);
    const digits = value.replace(/[^0-9]/g, "");
    if (digits.length === 7) {
      setAutoAddress("");
      setPostalSearching(true);
      await searchZipcloud(digits);
      setPostalSearching(false);
    } else {
      setAutoAddress("");
    }
  }, [searchZipcloud]);

  // 再検索ボタン用
  const handleRetryPostalSearch = useCallback(async () => {
    const digits = postalCode.replace(/[^0-9]/g, "");
    if (digits.length === 7) {
      setPostalSearching(true);
      await searchZipcloud(digits);
      setPostalSearching(false);
    }
  }, [postalCode, searchZipcloud]);

  // 前回の配送先情報を取得
  const { data: lastShippingData } = useSWR("/api/mypage/last-shipping", swrFetcher, {
    revalidateOnFocus: false,
  });
  const lastShipping = lastShippingData?.hasData ? lastShippingData.shipping : null;

  // 「前回の情報を使用」チェックON→自動入力、OFF→空欄に戻す
  useEffect(() => {
    if (usePrevShipping && lastShipping) {
      setAccountName(lastShipping.accountName || "");
      setShippingName(lastShipping.name || "");
      setPhoneNumber(lastShipping.phone || "");
      setEmail(lastShipping.email || "");
      const addr = lastShipping.address || "";
      // 郵便番号でzipcloud検索し、自動入力分を差し引いてaddressDetailに設定
      if (lastShipping.postalCode) {
        const digits = lastShipping.postalCode.replace(/[^0-9]/g, "");
        if (digits.length === 7) {
          setPostalCode(lastShipping.postalCode);
          setAutoAddress("");
          setAddressDetail(addr);
          setPostalSearching(true);
          searchZipcloud(digits).then((autoAddr) => {
            setPostalSearching(false);
            if (autoAddr && addr.startsWith(autoAddr)) {
              setAddressDetail(addr.slice(autoAddr.length));
            } else {
              setAddressDetail(addr);
            }
          });
        } else {
          setPostalCode(lastShipping.postalCode);
          setAutoAddress("");
          setAddressDetail(addr);
        }
      } else {
        setAutoAddress("");
        setAddressDetail(addr);
      }
    } else if (!usePrevShipping) {
      setAccountName("");
      setShippingName("");
      setPhoneNumber("");
      setEmail("");
      setPostalCode("");
      setAutoAddress("");
      setAddressDetail("");
      setPostalError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usePrevShipping, lastShipping]);

  const fullAddress = `${autoAddress}${addressDetail}`.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountName.trim() || !shippingName.trim() || !phoneNumber.trim() || !email.trim() || !postalCode.trim() || !fullAddress) {
      setError("すべての項目を入力してください。");
      return;
    }

    if (!autoAddress) {
      setError("郵便番号から住所が自動入力されていません。正しい郵便番号を入力してください。");
      return;
    }

    if (!/^[ァ-ヶー\s　]+$/.test(accountName.trim())) {
      setError("口座名義はカタカナのみで入力してください。");
      return;
    }

    if (!codeParam || !patientIdParam) {
      setError("必要な情報が不足しています。もう一度最初からやり直してください。");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // ★ 配送先情報を保存するAPIを呼び出す（mode, reorder_idも送る）
      const res = await fetch("/api/bank-transfer/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patientIdParam,
          productCode: codeParam,
          mode: modeParam || undefined, // ★ 追加
          reorderId: reorderIdParam || undefined, // ★ 追加
          accountName,
          shippingName, // ★ 追加: 配送先氏名
          phoneNumber,
          email,
          postalCode,
          address: fullAddress,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "配送先情報の保存に失敗しました。");
      }

      // 成功したらマイページに戻る
      router.push("/mypage");
    } catch (e) {
      console.error(e);
      setError(
        (e as Error)?.message ||
          "配送先情報の保存中にエラーが発生しました。時間をおいて再度お試しください。"
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="text-xs text-slate-400">マイページ</div>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-lg font-semibold text-slate-900">
              配送先情報の入力
            </h1>
          </div>
          <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
            商品の配送に必要な情報を入力してください。
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="mx-auto max-w-md px-4 pb-6 pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 前回の情報を使用 */}
          {lastShipping && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePrevShipping}
                  onChange={(e) => setUsePrevShipping(e.target.checked)}
                  className="rounded border-slate-300 text-pink-500 focus:ring-pink-500"
                  disabled={submitting}
                />
                <span className="text-[12px] font-medium text-slate-700">前回の情報を使用</span>
              </label>
              {usePrevShipping && (
                <p className="mt-1 ml-6 text-[10px] text-amber-600">＊変更や不足がないかご確認ください。</p>
              )}
            </div>
          )}

          {/* 口座名義 */}
          <div>
            <label
              htmlFor="accountName"
              className="block text-sm font-semibold text-slate-900 mb-2"
            >
              口座名義（カタカナ）
            </label>
            <input
              type="text"
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="例: ヤマダタロウ"
              className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${accountName && !/^[ァ-ヶー\s　]*$/.test(accountName) ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-pink-500"}`}
              disabled={submitting}
            />
            {accountName && !/^[ァ-ヶー\s　]*$/.test(accountName) ? (
              <p className="mt-1 text-[10px] text-red-500 font-semibold">
                ※ カタカナのみで入力してください（漢字・ひらがな不可）
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-slate-500">
                ※ 振込時の名義をカタカナで入力してください
              </p>
            )}
          </div>

          {/* 電話番号 */}
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-semibold text-slate-900 mb-2"
            >
              電話番号
            </label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="例: 09012345678"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              disabled={submitting}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              ※ ハイフンなしで入力してください
            </p>
          </div>

          {/* メールアドレス */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-slate-900 mb-2"
            >
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="例: example@mail.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              disabled={submitting}
            />
          </div>

          {/* 郵便番号 */}
          <div>
            <label
              htmlFor="postalCode"
              className="block text-sm font-semibold text-slate-900 mb-2"
            >
              郵便番号
            </label>
            <input
              type="text"
              id="postalCode"
              value={postalCode}
              onChange={(e) => handlePostalCodeChange(e.target.value)}
              placeholder="例: 123-4567"
              inputMode="numeric"
              className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${postalError ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-pink-500"}`}
              disabled={submitting}
            />
            {postalSearching && (
              <p className="mt-1 text-[10px] text-slate-500">住所を検索中...</p>
            )}
            {postalError && (
              <div className="mt-1 flex items-center gap-2">
                <p className="text-[10px] text-red-500 font-semibold">{postalError}</p>
                <button
                  type="button"
                  onClick={handleRetryPostalSearch}
                  disabled={postalSearching}
                  className="text-[10px] text-pink-500 underline font-semibold disabled:opacity-50"
                >
                  再検索
                </button>
              </div>
            )}
          </div>

          {/* 住所 */}
          <div>
            <label
              htmlFor="addressDetail"
              className="block text-sm font-semibold text-slate-900 mb-2"
            >
              住所
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={autoAddress}
                readOnly
                tabIndex={-1}
                placeholder="都道府県市区町村"
                className="w-1/2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400"
              />
              <input
                type="text"
                id="addressDetail"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="丁目以降を入力"
                className="w-1/2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                disabled={submitting}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              ※ 郵便番号を入力すると都道府県・市区町村が自動入力されます
            </p>
          </div>

          {/* 配送先氏名 */}
          <div>
            <label
              htmlFor="shippingName"
              className="block text-sm font-semibold text-slate-900 mb-2"
            >
              配送先氏名
            </label>
            <input
              type="text"
              id="shippingName"
              value={shippingName}
              onChange={(e) => setShippingName(e.target.value)}
              placeholder="例: 山田太郎"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              disabled={submitting}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              ※ 漢字で配送先のお名前を入力してください
            </p>
          </div>

          {/* 発送タイミングの案内 */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-[11px] text-blue-900 leading-relaxed">
              <strong>発送について</strong>
              <br />
              ・12時までに住所入力が完了し、振込確認ができた場合は当日発送いたします
              <br />
              ・金曜15時〜月曜9時の間にお振込みの場合、ご利用の金融機関によって振込反映が翌営業日となることがあります。当方で振込確認後の発送となりますので、ご了承ください
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

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-pink-500 text-white py-2 text-[12px] font-semibold disabled:opacity-60"
          >
            {submitting ? "送信中..." : "入力しました"}
          </button>
        </form>

        <p className="mt-3 text-[10px] text-slate-400 leading-relaxed text-center">
          ※ 入力完了後、マイページに戻ります
        </p>
      </div>
    </div>
  );
}

// Suspenseラッパー
export default function ShippingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          <div className="mx-auto max-w-md px-4 py-6 text-sm text-slate-600">
            フォームを読み込んでいます…
          </div>
        </div>
      }
    >
      <ShippingFormContent />
    </Suspense>
  );
}

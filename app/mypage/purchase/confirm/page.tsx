// app/mypage/purchase/confirm/page.tsx
"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef, Suspense } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import SquareCardForm from "@/components/SquareCardForm";
import GmoCardForm from "@/components/GmoCardForm";
import { hasAddressDuplication, addressDetailStartsWithPrefecture } from "@/lib/address-utils";

// SWRProviderのスコープ外（患者向けページ）なのでfetcherを明示指定
const swrFetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("API error");
    return r.json();
  });


type Mode = "current" | "first" | "reorder";

// 商品マスタから取得する商品型（productsテーブル準拠）
type Product = {
  code: string;
  title: string;
  dosage: string | null;
  duration_months: number | null;
  quantity: number | null;
  price: number;
  discount_price: number | null;
  discount_until: string | null;
  campaign_price: number | null;
  campaign_name: string | null;
  campaign_remaining: number | null;
  category?: string;
  cool_type?: "normal" | "chilled" | "frozen" | null;
};

type SdkConfig = {
  enabled: boolean;
  provider?: "square" | "gmo";
  // Square用
  applicationId?: string;
  locationId?: string;
  threeDsEnabled?: boolean;
  // GMO用
  shopId?: string;
  // 共通
  environment?: "sandbox" | "production";
  showCoupon?: boolean;
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

  // patientId は /api/mypage/identity から取得（useMemoで同期的に導出）
  const [submitting, setSubmitting] = useState(false);
  const submittingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"saved_card" | "new_card">("new_card");
  const [cardFormKey, setCardFormKey] = useState(0); // エラー時にカードフォーム再マウント用
  const [couponCode, setCouponCode] = useState("");
  const [couponValidation, setCouponValidation] = useState<{
    valid: boolean;
    coupon?: { name: string; discount_type: string; discount_value: number };
    error?: string;
  } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  // 発送オプション
  const [customSenderName, setCustomSenderName] = useState("");
  const [useCustomSender, setUseCustomSender] = useState(false);
  const [itemNameCosmetics, setItemNameCosmetics] = useState(false);
  const [useHexidin, setUseHexidin] = useState(false);
  const [postOfficeHold, setPostOfficeHold] = useState(false);
  const [postOfficeName, setPostOfficeName] = useState("");

  const [shipping, setShipping] = useState<ShippingData>({
    name: "",
    postalCode: "",
    address: "",
    phone: "",
    email: "",
  });
  const [autoAddress, setAutoAddress] = useState(""); // 郵便番号から自動入力された住所
  const [addressDetail, setAddressDetail] = useState(""); // 番地・建物名等の手動入力
  const [usePrevShipping, setUsePrevShipping] = useState(false);
  const [postalError, setPostalError] = useState<string | null>(null);
  const [postalSearching, setPostalSearching] = useState(false);
  const [prevPostalCode, setPrevPostalCode] = useState<string | null>(null);

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
    setShipping((s) => ({ ...s, postalCode: value }));
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
    const digits = shipping.postalCode.replace(/[^0-9]/g, "");
    if (digits.length === 7) {
      setPostalSearching(true);
      await searchZipcloud(digits);
      setPostalSearching(false);
    }
  }, [shipping.postalCode, searchZipcloud]);

  // テナント設定（クリニック名）
  const { data: mpSettings } = useSWR<{
    config?: { content?: { clinicName?: string } };
    shippingOptions?: { allowCustomSender?: boolean; allowCosmeticsName?: boolean; allowHexidin?: boolean; allowPostOfficeHold?: boolean };
  }>("/api/mypage/settings", swrFetcher, { revalidateOnFocus: false });
  const clinicName = mpSettings?.config?.content?.clinicName || "";
  const shipOpts = mpSettings?.shippingOptions;

  // 前回の配送先情報を取得
  const { data: lastShippingData } = useSWR("/api/mypage/last-shipping", swrFetcher, {
    revalidateOnFocus: false,
  });
  const lastShipping = lastShippingData?.hasData ? lastShippingData.shipping : null;

  // 「前回の情報を使用」チェックON→自動入力、OFF→空欄に戻す
  useEffect(() => {
    if (usePrevShipping && lastShipping) {
      setShipping({
        name: lastShipping.name || "",
        postalCode: lastShipping.postalCode || "",
        address: "",
        phone: lastShipping.phone || "",
        email: lastShipping.email || "",
      });
      const savedDetail = lastShipping.addressDetail || "";
      const addr = lastShipping.address || "";
      if (lastShipping.postalCode) {
        const digits = lastShipping.postalCode.replace(/[^0-9]/g, "");
        if (digits.length === 7) {
          setPrevPostalCode(lastShipping.postalCode);
          setPostalSearching(true);
          // address_detailがDBにある場合はそのまま使う（zipcloud再分割不要）
          if (savedDetail) {
            setAddressDetail(savedDetail);
            searchZipcloud(digits).then(() => setPostalSearching(false));
          } else {
            // address_detail未保存（旧データ）: 従来のzipcloud差し引きロジック
            setAutoAddress("");
            setAddressDetail(addr);
            searchZipcloud(digits).then((autoAddr) => {
              setPostalSearching(false);
              if (autoAddr && addr.startsWith(autoAddr)) {
                setAddressDetail(addr.slice(autoAddr.length));
              } else {
                setAddressDetail(addr);
              }
            });
          }
          setShipping((s) => ({ ...s, postalCode: lastShipping.postalCode }));
        } else {
          setAutoAddress("");
          setAddressDetail(savedDetail || addr);
        }
      } else {
        setAutoAddress("");
        setAddressDetail(savedDetail || addr);
      }
    } else if (!usePrevShipping) {
      setShipping({ name: "", postalCode: "", address: "", phone: "", email: "" });
      setAutoAddress("");
      setAddressDetail("");
      setPostalError(null);
      setPrevPostalCode(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usePrevShipping, lastShipping]);

  // autoAddress + addressDetail を統合して shipping.address に反映
  const fullAddress = `${autoAddress}${addressDetail}`.trim();

  // 住所の都道府県重複チェック（autoAddressに気づかずフル入力 or 前回住所再利用の表記差異）
  const addressDuplicated = hasAddressDuplication(fullAddress);
  const detailStartsWithPref = addressDetailStartsWithPrefecture(addressDetail);

  // 前回情報使用中に郵便番号が変更された場合、丁目以降の変更を促す
  const postalChanged = usePrevShipping && prevPostalCode !== null
    && shipping.postalCode.replace(/[^0-9]/g, "") !== prevPostalCode.replace(/[^0-9]/g, "")
    && shipping.postalCode.replace(/[^0-9]/g, "").length === 7;

  // 決済リクエストのAbortController（タイムアウト時にfetch自体をキャンセル）
  const abortRef = useRef<AbortController | null>(null);

  // submitting を true にしつつ90秒タイムアウトで自動リセット
  const startSubmitting = useCallback(() => {
    if (submittingTimer.current) clearTimeout(submittingTimer.current);
    // 前回のリクエストがまだ残っていればキャンセル
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setSubmitting(true);
    submittingTimer.current = setTimeout(() => {
      if (abortRef.current) abortRef.current.abort();
      setSubmitting(false);
      setError("決済処理がタイムアウトしました。決済が完了している可能性があります。マイページで注文状況をご確認ください。");
    }, 90_000);
  }, []);

  const stopSubmitting = useCallback(() => {
    if (submittingTimer.current) {
      clearTimeout(submittingTimer.current);
      submittingTimer.current = null;
    }
    setSubmitting(false);
  }, []);

  // ページ復帰時: 決済中なら注意メッセージを表示（リセットはしない）
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && submitting) {
        // 決済処理中のまま維持し、再試行を促さない
        // タイムアウトまたはレスポンス受信で自然に解決される
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (submittingTimer.current) clearTimeout(submittingTimer.current);
    };
  }, [submitting, stopSubmitting]);

  // identity から patientId をSWRで取得 → useMemoで同期的に導出（キャッシュヒット時も即座に反映）
  const { data: identityData, error: identityError } = useSWR("/api/mypage/identity", swrFetcher, {
    revalidateOnFocus: false,
  });

  const patientId = useMemo(() => {
    if (!identityData) return null;
    if (identityData.ok === false) return null;
    if (identityData.patientId) return String(identityData.patientId);
    return null;
  }, [identityData]);

  // identityのエラーメッセージはuseEffectで設定（副作用）
  useEffect(() => {
    if (identityError) {
      setError("本人確認情報の取得に失敗しました。通信環境をご確認ください。");
    } else if (identityData?.ok === false) {
      setError("本人確認（連携）が完了していません。マイページTOPから再度お試しください。");
    } else if (identityData && !identityData.patientId) {
      setError("本人確認情報の取得に失敗しました。");
    }
  }, [identityData, identityError]);

  // SDK設定をSWRで取得 → useMemoで同期的に導出
  const { data: sdkData, error: sdkError } = useSWR("/api/payment/sdk-config", swrFetcher, {
    revalidateOnFocus: false,
  });

  const sdkConfig = useMemo<SdkConfig | null>(() => {
    if (sdkError) return { enabled: false };
    return sdkData ? (sdkData as SdkConfig) : null;
  }, [sdkData, sdkError]);

  const isInline = sdkConfig?.enabled === true;
  const shippingValid =
    shipping.name.trim() !== "" &&
    shipping.postalCode.trim() !== "" &&
    autoAddress !== "" &&
    fullAddress !== "" &&
    shipping.phone.trim() !== "" &&
    shipping.email.trim() !== "" &&
    !addressDuplicated;

  // 保存済みカード情報はカードフォーム表示時に遅延取得（初期表示をブロックしない）
  const savedCardUrl = sdkConfig?.provider === "gmo" ? "/api/gmo/saved-card" : "/api/square/saved-card";
  const savedCardKey = showCardForm && savedCard === null ? savedCardUrl : null;
  const { data: savedCardData, error: savedCardError } = useSWR(savedCardKey, swrFetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (savedCardError) {
      setSavedCard({ hasCard: false });
      return;
    }
    if (!savedCardData) return;
    const card = savedCardData as SavedCard;
    setSavedCard(card);
    if (card.hasCard) setPaymentMode("saved_card");
  }, [savedCardData, savedCardError]);

  // 商品マスタをAPIから取得
  const { data: productsData, error: productsError } = useSWR("/api/mypage/products", swrFetcher, {
    revalidateOnFocus: false,
  });

  const products = useMemo<Product[]>(() => {
    if (!productsData?.products) return [];
    return productsData.products as Product[];
  }, [productsData]);

  // 商品マスタ取得エラー時のメッセージ
  useEffect(() => {
    if (productsError) {
      setError("商品情報の取得に失敗しました。通信環境をご確認ください。");
    }
  }, [productsError]);

  const codeParam = searchParams.get("code");
  const modeParam = searchParams.get("mode") as Mode | null;

  const product = useMemo(
    () => (codeParam ? products.find((p) => p.code === codeParam) ?? null : null),
    [codeParam, products],
  );

  // 商品が注射（冷蔵）かどうかの判定
  const isInjection = product?.category === "injection" || product?.cool_type === "chilled" || product?.cool_type === "frozen";
  // 都道府県判定
  const prefecture = autoAddress ? autoAddress.match(/^(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/)?.[0] || "" : "";
  const isKyushu = ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県"].includes(prefecture);
  const isOkinawa = prefecture === "沖縄県";
  const cosmeticsDisabled = isOkinawa && isInjection;

  // 割引価格が有効期間内であれば適用した実効価格を算出（キャンペーン価格含む）
  const effectivePrice = useMemo(() => {
    if (!product) return 0;
    // 商品固有の割引価格を優先
    if (product.discount_price != null && product.discount_until) {
      const until = new Date(product.discount_until);
      if (until > new Date()) return product.discount_price;
    }
    // キャンペーン価格（残数がある場合のみ）
    if (product.campaign_price != null && (product.campaign_remaining === null || product.campaign_remaining > 0)) {
      return product.campaign_price;
    }
    return product.price;
  }, [product]);

  // キャンペーン終了判定
  const campaignEnded = product?.campaign_price != null && product.campaign_remaining === 0;

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
    startSubmitting();

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: product.code,
          mode: modeParam,
          reorderId: reorderIdParam ?? null,
          couponCode: couponValidation?.valid ? couponCode.trim() : undefined,
          shippingOptions: {
            customSenderName: useCustomSender ? customSenderName : null,
            itemNameCosmetics,
            useHexidin,
            postOfficeHold,
            postOfficeName: postOfficeHold ? postOfficeName : null,
          },
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
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "決済の準備中にエラーが発生しました。時間をおいて再度お試しください。",
      );
      stopSubmitting();
    }
  };

  // inline決済: /api/square/pay を呼ぶ共通処理
  const submitInlinePayment = useCallback(
    async (sourceId: string) => {
      if (!product || !patientId || !shippingValid) return;
      startSubmitting();
      setError(null);

      try {
        const isGmo = sdkConfig?.provider === "gmo";
        const payUrl = isGmo ? "/api/gmo/pay" : "/api/square/pay";
        const isSavedCard = isGmo && sourceId === "__saved_card__";
        const payBody = isGmo
          ? {
              ...(isSavedCard ? { useSavedCard: true } : { token: sourceId }),
              productCode: product.code,
              mode: modeParam,
              patientId,
              reorderId: reorderIdParam ?? null,
              saveCard: true,
              shipping: { ...shipping, address: fullAddress, addressDetail },
              shippingOptions: {
                customSenderName: useCustomSender ? customSenderName : null,
                itemNameCosmetics,
                useHexidin,
                postOfficeHold,
                postOfficeName: postOfficeHold ? postOfficeName : null,
              },
            }
          : {
              sourceId,
              productCode: product.code,
              mode: modeParam,
              patientId,
              reorderId: reorderIdParam ?? null,
              saveCard: true,
              shipping: { ...shipping, address: fullAddress, addressDetail },
              shippingOptions: {
                customSenderName: useCustomSender ? customSenderName : null,
                itemNameCosmetics,
                useHexidin,
                postOfficeHold,
                postOfficeName: postOfficeHold ? postOfficeName : null,
              },
            };
        const res = await fetch(payUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: abortRef.current?.signal,
          body: JSON.stringify(payBody),
        });

        const data = await res.json();

        // GMO 3Dセキュア認証が必要な場合 → 認証画面にリダイレクト
        if (data.needs3ds && data.acsUrl) {
          stopSubmitting();
          window.location.href = data.acsUrl;
          return;
        }

        if (!res.ok) throw new Error((data.message || data.error) || "決済に失敗しました");
        router.push(`/mypage/purchase/complete?code=${product.code}`);
      } catch (e) {
        // AbortErrorの場合はタイムアウトハンドラで処理済み
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "決済処理中にエラーが発生しました");
        stopSubmitting();
        // カードフォームを再マウントして新しいnonceを取得可能にする
        setCardFormKey((k) => k + 1);
      }
    },
    [product, patientId, modeParam, reorderIdParam, shipping, fullAddress, shippingValid, router, startSubmitting, stopSubmitting],
  );

  // 新規カードの nonce 受取
  const handleNonceReady = useCallback(
    (nonce: string) => submitInlinePayment(nonce),
    [submitInlinePayment],
  );

  // 保存済みカードで決済
  const handleSavedCardPay = useCallback(() => {
    if (sdkConfig?.provider === "gmo") {
      // GMO: useSavedCard フラグで識別
      submitInlinePayment("__saved_card__");
    } else if (savedCard?.cardId) {
      submitInlinePayment(savedCard.cardId);
    }
  }, [savedCard, sdkConfig, submitInlinePayment]);

  const handleCardFormError = useCallback((msg: string) => setError(msg), []);

  // 商品データ読み込み中はスケルトン表示
  if (!productsData && !productsError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-md px-4 py-6 space-y-4">
          <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 space-y-3">
            <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
            <div className="h-6 w-24 bg-slate-200 rounded animate-pulse ml-auto" />
          </div>
          <div className="h-10 w-full bg-slate-200 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

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
                {product.dosage && `${product.dosage}/`}{product.duration_months && `${product.duration_months}ヶ月分`}{product.quantity && `（全${product.quantity}本）`}/週1回
              </p>
              {product.campaign_name && !campaignEnded && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 rounded">
                    {product.campaign_name}
                  </span>
                  {product.campaign_remaining != null && (
                    <span className="text-[10px] text-orange-600">残り{product.campaign_remaining}個</span>
                  )}
                </div>
              )}
              {campaignEnded && (
                <div className="mt-1">
                  <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded">
                    キャンペーン終了
                  </span>
                </div>
              )}
            </div>
            <div className="text-right whitespace-nowrap">
              <div className="text-[11px] text-slate-400">お支払い金額</div>
              <div className="text-lg font-semibold text-slate-900">
                ¥{effectivePrice.toLocaleString()}
              </div>
              {product.campaign_price != null && product.campaign_price < product.price && !campaignEnded && (
                <div className="text-[10px] text-slate-400 line-through">¥{product.price.toLocaleString()}</div>
              )}
              <div className="mt-0.5 text-[10px] text-slate-400">税込/送料込み</div>
            </div>
          </div>
        </div>

        {/* クーポンコード入力 */}
        {sdkConfig?.showCoupon && <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-3">
          <div className="text-[11px] font-medium text-slate-700 mb-2">クーポンコード</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponValidation(null);
              }}
              placeholder="クーポンコードを入力"
              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-mono"
              disabled={submitting}
            />
            <button
              onClick={async () => {
                if (!couponCode.trim() || !patientId) return;
                setCouponChecking(true);
                try {
                  const res = await fetch("/api/coupon/validate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ code: couponCode.trim(), patient_id: patientId }),
                  });
                  const data = await res.json();
                  setCouponValidation(data);
                } catch {
                  setCouponValidation({ valid: false, error: "検証に失敗しました" });
                } finally {
                  setCouponChecking(false);
                }
              }}
              disabled={!couponCode.trim() || couponChecking || submitting}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                !couponCode.trim() || couponChecking
                  ? "bg-slate-200 text-slate-400"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {couponChecking ? "確認中..." : "適用"}
            </button>
          </div>
          {couponValidation && (
            <div className={`mt-2 text-[11px] ${couponValidation.valid ? "text-green-600" : "text-red-600"}`}>
              {couponValidation.valid
                ? `${couponValidation.coupon?.name} — ${
                    couponValidation.coupon?.discount_type === "percent"
                      ? `${couponValidation.coupon?.discount_value}%OFF`
                      : `${couponValidation.coupon?.discount_value?.toLocaleString()}円引き`
                  } が適用されます`
                : couponValidation.error}
            </div>
          )}
        </div>}

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

          {!showCardForm ? (
            /* ===== 決済方法選択ボタン（初期画面） ===== */
            <>
              {sdkConfig === null ? (
                /* SDK設定読み込み中 */
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-full bg-pink-500 text-white py-2.5 text-[12px] font-semibold disabled:opacity-60"
                  >
                    クレジットカードで決済
                  </button>
                  <p className="text-[10px] text-slate-500 px-2">
                    即時決済完了で発送手続きがスムーズ｜安全な決済システム
                  </p>
                </div>
              ) : isInline ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={!patientId}
                    onClick={() => setShowCardForm(true)}
                    className="w-full rounded-full bg-pink-500 text-white py-2.5 text-[12px] font-semibold disabled:opacity-60"
                  >
                    クレジットカードで決済
                  </button>
                  <p className="text-[10px] text-slate-500 px-2">
                    即時決済完了で発送手続きがスムーズ｜安全な決済システム
                  </p>
                </div>
              ) : (
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
                    即時決済完了で発送手続きがスムーズ｜安全な決済システム
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
            </>
          ) : (
            /* ===== カード入力フォーム（クレカ選択後） ===== */
            <div className="space-y-4">
              {/* 戻るリンク */}
              <button
                type="button"
                onClick={() => setShowCardForm(false)}
                className="text-[11px] text-slate-500 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                決済方法を選び直す
              </button>

              {/* 配送先住所フォーム */}
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 space-y-3">
                <p className="text-[11px] font-medium text-slate-700">配送先情報</p>
                {lastShipping && (
                  <div>
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
                      onChange={(e) => handlePostalCodeChange(e.target.value)}
                      disabled={submitting}
                      placeholder="123-4567"
                      inputMode="numeric"
                      className={`w-full rounded-lg border px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-300 disabled:opacity-60 ${postalError ? "border-red-400" : "border-slate-200"}`}
                    />
                    {postalSearching && (
                      <p className="mt-0.5 text-[10px] text-slate-500">住所を検索中...</p>
                    )}
                    {postalError && (
                      <div className="mt-0.5 flex items-center gap-2">
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
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">住所</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={autoAddress}
                        readOnly
                        tabIndex={-1}
                        placeholder="都道府県市区町村"
                        className="w-1/2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] text-slate-700 placeholder:text-slate-300"
                      />
                      <input
                        type="text"
                        value={addressDetail}
                        onChange={(e) => setAddressDetail(e.target.value)}
                        disabled={submitting}
                        placeholder="丁目以降を入力"
                        className={`w-1/2 rounded-lg border px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-300 disabled:opacity-60 ${postalChanged || detailStartsWithPref ? "border-red-400" : "border-slate-200"}`}
                      />
                    </div>
                    {detailStartsWithPref && (
                      <p className="mt-0.5 text-[10px] text-red-500 font-semibold">
                        ※ 都道府県から入力されています。左側に自動入力済みのため、丁目・番地から入力してください。
                      </p>
                    )}
                    {postalChanged && !detailStartsWithPref && (
                      <p className="mt-0.5 text-[10px] text-red-500 font-semibold">
                        ※ 郵便番号が変更されました。丁目以降の住所も確認・修正してください。
                      </p>
                    )}
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

              {/* ===== 発送オプション ===== */}
              {(shipOpts?.allowCustomSender || shipOpts?.allowCosmeticsName || shipOpts?.allowHexidin || shipOpts?.allowPostOfficeHold) && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <p className="text-[11px] font-medium text-slate-700">発送オプション</p>

                {/* 差出人名変更 */}
                {shipOpts?.allowCustomSender && (
                <>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomSender}
                    onChange={(e) => {
                      setUseCustomSender(e.target.checked);
                      if (!e.target.checked) setCustomSenderName("");
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-slate-600"
                  />
                  <span className="text-[11px] text-slate-700">差出人名を変更する</span>
                </label>
                {useCustomSender && (
                  <input
                    type="text"
                    value={customSenderName}
                    onChange={(e) => setCustomSenderName(e.target.value)}
                    placeholder="差出人名を入力"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-300"
                  />
                )}
                </>
                )}

                {/* 品名を化粧品に変更 */}
                {shipOpts?.allowCosmeticsName && (
                <label className={`flex items-start gap-2 ${cosmeticsDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={itemNameCosmetics}
                    disabled={cosmeticsDisabled}
                    onChange={(e) => setItemNameCosmetics(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-slate-600"
                  />
                  <div>
                    <span className="text-[11px] text-slate-700">品名を「化粧品」に変更する</span>
                    {cosmeticsDisabled && (
                      <p className="text-[10px] text-red-500 mt-0.5">沖縄県への冷蔵注射は化粧品名での発送ができません</p>
                    )}
                    {itemNameCosmetics && isKyushu && !cosmeticsDisabled && (
                      <p className="text-[10px] text-amber-600 mt-0.5">九州宛は陸送になるため、お届けが1〜2日遅れる場合があります</p>
                    )}
                  </div>
                </label>
                )}

                {/* 同梱物変更（注射商品のみ） */}
                {shipOpts?.allowHexidin && isInjection && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useHexidin}
                      onChange={(e) => setUseHexidin(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-slate-600"
                    />
                    <div>
                      <span className="text-[11px] text-slate-700">同梱の消毒綿をヘキシジンに変更する</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">アルコールアレルギーのある方はこちらを選択してください</p>
                    </div>
                  </label>
                )}

                {/* 郵便局留め */}
                {shipOpts?.allowPostOfficeHold && (
                <>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postOfficeHold}
                    onChange={(e) => {
                      setPostOfficeHold(e.target.checked);
                      if (!e.target.checked) setPostOfficeName("");
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-slate-600"
                  />
                  <span className="text-[11px] text-slate-700">郵便局留めを希望する</span>
                </label>
                {postOfficeHold && (
                  <div>
                    <input
                      type="text"
                      value={postOfficeName}
                      onChange={(e) => setPostOfficeName(e.target.value)}
                      placeholder="受取郵便局名を入力（例: 渋谷郵便局）"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-300"
                    />
                    {isInjection && (
                      <p className="text-[10px] text-amber-600 mt-1">冷蔵便の場合はチルド対応の郵便局をご確認ください</p>
                    )}
                  </div>
                )}
                </>
                )}
              </div>
              )}

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
                    {sdkConfig?.provider === "gmo"
                      ? "カード情報はGMOペイメントゲートウェイ社の安全な環境で処理され、当サイト上では保存されません。PCI DSS準拠のセキュリティ基準で保護されています。"
                      : `Square決済を使用しており、カード情報は${clinicName || "当サービス"}上では保存されません。カード情報は全てSquare社のセキュリティ基準（PCI DSS）に基づき安全に処理されます。`}
                  </p>
                </div>
              )}

              {/* 新規カード入力 */}
              {paymentMode === "new_card" && sdkConfig?.enabled && (
                sdkConfig.provider === "gmo" && sdkConfig.shopId ? (
                  <GmoCardForm
                    key={cardFormKey}
                    shopId={sdkConfig.shopId}
                    environment={sdkConfig.environment || "production"}
                    onTokenize={handleNonceReady}
                    onError={handleCardFormError}
                    disabled={submitting || !patientId || !shippingValid}
                    submitting={submitting}
                  />
                ) : sdkConfig.applicationId && sdkConfig.locationId ? (
                  <SquareCardForm
                    key={cardFormKey}
                    applicationId={sdkConfig.applicationId}
                    locationId={sdkConfig.locationId}
                    environment={sdkConfig.environment || "production"}
                    onTokenize={handleNonceReady}
                    onError={handleCardFormError}
                    disabled={submitting || !patientId || !shippingValid}
                    submitting={submitting}
                    threeDsEnabled={sdkConfig.threeDsEnabled}
                    verificationDetails={product ? {
                      amount: String(effectivePrice),
                      currencyCode: "JPY",
                      intent: "CHARGE",
                      billingContact: {
                        givenName: shipping.name || undefined,
                        phone: shipping.phone || undefined,
                        email: shipping.email || undefined,
                        addressLines: fullAddress ? [fullAddress] : undefined,
                        postalCode: shipping.postalCode?.replace("-", "") || undefined,
                        countryCode: "JP",
                      },
                    } : undefined}
                    clinicName={clinicName}
                  />
                ) : null
              )}
            </div>
          )}

          {/* 決済処理中の注意表示 */}
          {submitting && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin flex-shrink-0" />
                <p className="text-[12px] font-semibold text-amber-800">決済処理中です</p>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                完了するまでこの画面を閉じたり、戻るボタンを押さないでください。通常30秒ほどで完了します。
              </p>
            </div>
          )}

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

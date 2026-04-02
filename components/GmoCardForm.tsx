// components/GmoCardForm.tsx — GMO PG トークン型カード入力フォーム
// SquareCardForm.tsx と同じ見た目
"use client";

import { useRef, useState, useCallback } from "react";

// GMO Multipayment SDK の型定義
declare global {
  interface Window {
    Multipayment?: {
      init: (shopId: string) => void;
      getToken: (
        cardObj: {
          cardno: string;
          expire: string;
          securitycode: string;
          holdername?: string;
        },
        callback: (response: {
          resultCode: string;
          tokenObject: { token: string; toBeExpiredAt: string; maskedCardNo: string; isSecurityCodeSet: boolean };
        }) => void,
      ) => void;
    };
  }
}

interface Props {
  shopId: string;
  environment: "sandbox" | "production";
  onTokenize: (token: string) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
  submitting?: boolean;
}

export default function GmoCardForm({
  shopId,
  environment,
  onTokenize,
  onError,
  disabled,
  submitting,
}: Props) {
  const initDone = useRef(false);
  const [loading, setLoading] = useState(true);
  const [cardNo, setCardNo] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [holderName, setHolderName] = useState("");
  const [tokenizing, setTokenizing] = useState(false);

  // SDKロード＋初期化
  const containerCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || initDone.current) return;
      initDone.current = true;

      const scriptId = "gmo-multipayment-sdk";
      const sdkUrl =
        environment === "sandbox"
          ? "https://stg.static.mul-pay.jp/ext/js/token.js"
          : "https://static.mul-pay.jp/ext/js/token.js";

      const initSdk = () => {
        try {
          if (!window.Multipayment) {
            onError("GMO SDK の読み込みに失敗しました");
            return;
          }
          window.Multipayment.init(shopId);
          setLoading(false);
        } catch (e) {
          onError((e as Error)?.message || "カードフォーム初期化に失敗しました");
        }
      };

      if (window.Multipayment) {
        initSdk();
        return;
      }

      if (document.getElementById(scriptId)) {
        const check = setInterval(() => {
          if (window.Multipayment) {
            clearInterval(check);
            initSdk();
          }
        }, 50);
        return;
      }

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = sdkUrl;
      script.onload = () => initSdk();
      script.onerror = () => onError("GMO SDK の読み込みに失敗しました");
      document.head.appendChild(script);
    },
    [shopId, environment, onError],
  );

  // トークン取得
  const handleTokenize = useCallback(() => {
    if (!window.Multipayment) {
      onError("カードフォームが初期化されていません");
      return;
    }

    // バリデーション
    const cardDigits = cardNo.replace(/\s/g, "");
    if (cardDigits.length < 13 || cardDigits.length > 16) {
      onError("カード番号を正しく入力してください");
      return;
    }
    if (!expMonth || !expYear) {
      onError("有効期限を入力してください");
      return;
    }
    if (cvc.length < 3) {
      onError("セキュリティコードを入力してください");
      return;
    }

    setTokenizing(true);

    // GMO形式: YYMM
    const expire = expYear.slice(-2) + expMonth.padStart(2, "0");

    window.Multipayment.getToken(
      {
        cardno: cardDigits,
        expire,
        securitycode: cvc,
        holdername: holderName || undefined,
      },
      (response) => {
        setTokenizing(false);
        if (!response) {
          onError("カード情報の処理に失敗しました。再度お試しください。");
          return;
        }
        if (response.resultCode === "000") {
          onTokenize(response.tokenObject.token);
        } else {
          const errorMessages: Record<string, string> = {
            "100": "カード番号が正しくありません",
            "101": "有効期限が正しくありません",
            "102": "セキュリティコードが正しくありません",
            "110": "カード番号が正しくありません",
            "111": "有効期限が正しくありません",
            "112": "セキュリティコードが正しくありません",
            "113": "カード名義人が正しくありません",
            "121": "カード番号の桁数が正しくありません",
            "122": "有効期限の形式が正しくありません",
            "131": "トークンの有効期限が切れました。再度入力してください",
            "132": "トークンが無効です。再度入力してください",
            "141": "ショップIDが不正です",
            "142": "ショップIDの設定に失敗しました",
            "150": "カード情報の処理に失敗しました",
          };
          onError(errorMessages[response.resultCode] || "カード情報の確認に失敗しました。再度お試しください。");
        }
      },
    );
  }, [cardNo, expMonth, expYear, cvc, holderName, onTokenize, onError]);

  // カード番号の自動フォーマット（4桁区切り）
  const handleCardNoChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNo(formatted);
  }, []);

  const isProcessing = submitting || tokenizing;

  return (
    <div className="space-y-3" ref={containerCallback}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-slate-700">カード情報を入力</p>
        <div className="flex items-center gap-1 text-slate-400">
          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-[10px] font-semibold text-slate-500">PCI DSS準拠</span>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[180px] rounded-xl border border-slate-200 bg-slate-100 p-3 animate-pulse" />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
          {/* カード番号 */}
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">カード番号</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              value={cardNo}
              onChange={(e) => handleCardNoChange(e.target.value)}
              disabled={isProcessing}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 disabled:opacity-60"
            />
          </div>

          {/* 有効期限 + セキュリティコード */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">有効期限</label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp-month"
                  placeholder="MM"
                  maxLength={2}
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  disabled={isProcessing}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 placeholder-slate-300 text-center focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 disabled:opacity-60"
                />
                <span className="text-slate-400 text-[11px]">/</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp-year"
                  placeholder="YY"
                  maxLength={2}
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  disabled={isProcessing}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 placeholder-slate-300 text-center focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 disabled:opacity-60"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">セキュリティコード</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                maxLength={4}
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                disabled={isProcessing}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 disabled:opacity-60"
              />
            </div>
          </div>

          {/* カード名義（任意） */}
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">
              カード名義 <span className="text-slate-300">（任意）</span>
            </label>
            <input
              type="text"
              autoComplete="cc-name"
              placeholder="TARO YAMADA"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value.toUpperCase())}
              disabled={isProcessing}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 disabled:opacity-60"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleTokenize}
        disabled={disabled || loading || isProcessing}
        className="w-full rounded-full bg-pink-500 text-white py-2.5 text-[12px] font-semibold disabled:opacity-60"
      >
        {isProcessing ? "決済処理中..." : "このカードで決済する"}
      </button>

      {/* セキュリティ表示 */}
      <div className="flex items-start gap-2 px-1">
        <svg className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          カード情報はGMOペイメントゲートウェイ社の安全な環境でトークン化され、当サイト上では保存されません。
          PCI DSS準拠のセキュリティ基準で保護されています。
        </p>
      </div>
    </div>
  );
}

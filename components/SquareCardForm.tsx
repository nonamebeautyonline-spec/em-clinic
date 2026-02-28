// components/SquareCardForm.tsx — Square Web Payments SDK カード入力フォーム
"use client";

import { useRef, useState, useCallback } from "react";

// Square Web Payments SDK の型定義
declare global {
  interface Window {
    Square?: {
      payments: (
        applicationId: string,
        locationId: string,
      ) => Promise<{
        card: () => Promise<{
          attach: (container: HTMLElement) => Promise<void>;
          tokenize: () => Promise<{ status: string; token: string }>;
          destroy: () => void;
        }>;
      }>;
    };
  }
}

interface Props {
  applicationId: string;
  locationId: string;
  environment: "sandbox" | "production";
  onTokenize: (nonce: string) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
}

export default function SquareCardForm({
  applicationId,
  locationId,
  environment,
  onTokenize,
  onError,
  disabled,
}: Props) {
  const cardRef = useRef<any>(null);
  const initStarted = useRef(false);
  const [loading, setLoading] = useState(true);

  // コンテナDOMが確定した瞬間に1回だけSDKロード→初期化
  // useEffectの2段階ではなく、テストページ同様にDOMノード直接操作
  const containerCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || initStarted.current) return;
      initStarted.current = true;

      const scriptId = "square-web-payments-sdk";
      const sdkUrl =
        environment === "sandbox"
          ? "https://sandbox.web.squarecdn.com/v1/square.js"
          : "https://web.squarecdn.com/v1/square.js";

      const initSdk = async () => {
        try {
          if (!window.Square) {
            onError("Square SDK の読み込みに失敗しました");
            return;
          }
          const payments = await window.Square.payments(applicationId, locationId);
          const card = await payments.card();
          await card.attach(node);
          cardRef.current = card;
          setLoading(false);
        } catch (e: any) {
          onError(e?.message || "カードフォーム初期化に失敗しました");
        }
      };

      // SDK スクリプトが既にロード済み
      if (window.Square) {
        initSdk();
        return;
      }

      // スクリプトタグが既にあるが読み込み待ち
      if (document.getElementById(scriptId)) {
        const check = setInterval(() => {
          if (window.Square) {
            clearInterval(check);
            initSdk();
          }
        }, 50);
        return;
      }

      // スクリプト新規ロード
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = sdkUrl;
      script.onload = () => initSdk();
      script.onerror = () => onError("Square SDK の読み込みに失敗しました");
      document.head.appendChild(script);
    },
    [applicationId, locationId, environment, onError],
  );

  // tokenize
  const handleTokenize = useCallback(async () => {
    if (!cardRef.current) {
      onError("カードフォームが初期化されていません");
      return;
    }
    try {
      const result = await cardRef.current.tokenize();
      if (result.status === "OK") {
        onTokenize(result.token);
      } else {
        onError(`カード検証失敗: status=${result.status}`);
      }
    } catch (e: any) {
      onError(e?.message || "カード情報の処理中にエラーが発生しました");
    }
  }, [onTokenize, onError]);

  return (
    <div className="space-y-3">
      {/* ヘッダー: ラベル + Squareロゴ */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-slate-700">カード情報を入力</p>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-[9px]">powered by</span>
          <svg className="h-[14px] w-auto" viewBox="0 0 56 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill="#006AFF" stroke="#006AFF"/>
            <rect x="4" y="4" width="8" height="8" rx="1.5" fill="white"/>
            <path d="M22.5 4.5h2.8c1.7 0 2.7.8 2.7 2.2 0 1-.5 1.7-1.4 2l1.6 3.3h-1.8l-1.3-3h-1v3h-1.6V4.5zm2.6 3.2c.8 0 1.3-.4 1.3-1 0-.7-.5-1-1.3-1h-1v2h1z" fill="#0E1B2A"/>
            <path d="M20.2 8.7c0-.6-.4-.9-1.2-1.1l-.9-.2c-.4-.1-.6-.2-.6-.5 0-.3.3-.5.7-.5.5 0 .8.2.9.5h1.5c-.1-1.1-.9-1.8-2.3-1.8-1.3 0-2.3.7-2.3 1.8 0 1 .7 1.5 1.7 1.7l.7.2c.5.1.6.3.6.5 0 .3-.3.5-.8.5-.6 0-.9-.3-1-.6h-1.5c.1 1.1 1 1.9 2.5 1.9 1.4 0 2.3-.8 2.3-1.8l-.3-.6z" fill="#0E1B2A"/>
            <path d="M35.1 12h-1.6V8.7c0-.7-.3-1.1-.9-1.1-.6 0-1 .5-1 1.1V12h-1.6V5.2h1.5v.6c.4-.5 1-.7 1.6-.7 1.2 0 2 .9 2 2.3V12z" fill="#0E1B2A"/>
            <path d="M41.3 5.2V12h-1.5v-.6c-.4.5-1 .7-1.6.7-1.4 0-2.5-1.2-2.5-2.8 0-1.6 1.1-2.8 2.5-2.8.6 0 1.1.2 1.5.6v-.5l1.6.4zm-1.6 4.1c0-.9-.6-1.5-1.3-1.5-.8 0-1.3.6-1.3 1.5s.5 1.5 1.3 1.5c.7 0 1.3-.6 1.3-1.5z" fill="#0E1B2A"/>
            <path d="M42.4 9.3c0-1.6 1.2-2.8 2.8-2.8.9 0 1.6.4 2 .9V5.2H48v6.9c0 1.8-1.2 2.9-2.9 2.9-1.5 0-2.6-.9-2.7-2.1h1.5c.1.5.5.8 1.2.8.7 0 1.3-.5 1.3-1.4v-.5c-.4.5-1 .8-1.7.8-1.5 0-2.7-1.2-2.7-2.8l.4-.5zm1.7 0c0 .8.6 1.4 1.3 1.4.7 0 1.3-.6 1.3-1.4 0-.9-.6-1.5-1.3-1.5-.7 0-1.3.6-1.3 1.5z" fill="#0E1B2A"/>
            <path d="M53.8 5.2V12h-1.5v-.6c-.4.5-.9.7-1.5.7-1.2 0-2-.9-2-2.3V5.2h1.6v4.3c0 .6.3 1 .9 1 .6 0 1-.5 1-1.1V5.2h1.5z" fill="#0E1B2A"/>
          </svg>
        </div>
      </div>

      <div
        ref={containerCallback}
        className={`min-h-[56px] rounded-xl border border-slate-200 bg-white p-3 ${
          loading ? "animate-pulse bg-slate-100" : ""
        }`}
      />
      {loading && (
        <p className="text-[10px] text-slate-400">カード入力フォームを準備中...</p>
      )}

      <button
        type="button"
        onClick={handleTokenize}
        disabled={disabled || loading}
        className="w-full rounded-full bg-pink-500 text-white py-2.5 text-[12px] font-semibold disabled:opacity-60"
      >
        {disabled ? "決済処理中..." : "このカードで決済する"}
      </button>

      {/* セキュリティ表示 */}
      <div className="flex items-start gap-2 px-1">
        <svg className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          カード情報はSquare社の安全な環境で処理され、のなめビューティー上では保存されません。
          PCI DSS準拠のセキュリティ基準で保護されています。
        </p>
      </div>
    </div>
  );
}

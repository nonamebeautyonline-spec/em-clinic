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
        <div className="flex items-center gap-1 text-slate-400">
          <span className="text-[9px]">powered by</span>
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
            <rect width="16" height="16" rx="4" fill="#006AFF"/>
            <rect x="4" y="4" width="8" height="8" rx="1.5" fill="white"/>
          </svg>
          <span className="text-[10px] font-semibold text-slate-500">Square</span>
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

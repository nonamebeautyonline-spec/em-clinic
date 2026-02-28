// components/SquareCardForm.tsx — Square Web Payments SDK カード入力フォーム
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // SDK スクリプト動的ロード
  useEffect(() => {
    const scriptId = "square-web-payments-sdk";
    if (document.getElementById(scriptId)) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src =
      environment === "sandbox"
        ? "https://sandbox.web.squarecdn.com/v1/square.js"
        : "https://web.squarecdn.com/v1/square.js";
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => onError("Square SDK の読み込みに失敗しました");
    document.head.appendChild(script);
  }, [environment, onError]);

  // SDK 初期化 + Card iframe アタッチ
  useEffect(() => {
    if (!sdkLoaded || !containerRef.current || !window.Square) return;

    let cancelled = false;

    (async () => {
      try {
        const payments = await window.Square!.payments(applicationId, locationId);
        const card = await payments.card();
        if (cancelled) return;
        await card.attach(containerRef.current!);
        cardRef.current = card;
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          onError(e?.message || "カードフォームの初期化に失敗しました");
        }
      }
    })();

    return () => {
      cancelled = true;
      cardRef.current?.destroy?.();
    };
  }, [sdkLoaded, applicationId, locationId, onError]);

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
        onError("カード情報の検証に失敗しました。入力内容をご確認ください。");
      }
    } catch (e: any) {
      onError(e?.message || "カード情報の処理中にエラーが発生しました");
    }
  }, [onTokenize, onError]);

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium text-slate-700">カード情報を入力</p>

      <div
        ref={containerRef}
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

      {/* 注意書き */}
      <p className="text-[10px] text-slate-400 leading-relaxed px-1">
        Square決済を使用しており、カード情報はのなめビューティー上では保存されません。
        カード情報は全てSquare社のセキュリティ基準（PCI DSS）に基づき安全に処理されます。
      </p>
    </div>
  );
}

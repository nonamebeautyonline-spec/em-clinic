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
  const [debugInfo, setDebugInfo] = useState<string>("SDK読み込み中...");

  // SDK スクリプト動的ロード
  useEffect(() => {
    const scriptId = "square-web-payments-sdk";
    if (document.getElementById(scriptId)) {
      setSdkLoaded(true);
      setDebugInfo("SDK既にロード済み");
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src =
      environment === "sandbox"
        ? "https://sandbox.web.squarecdn.com/v1/square.js"
        : "https://web.squarecdn.com/v1/square.js";
    script.onload = () => {
      setSdkLoaded(true);
      setDebugInfo("SDKロード完了。初期化中...");
    };
    script.onerror = () => {
      setDebugInfo("SDKスクリプト読み込み失敗");
      onError("Square SDK の読み込みに失敗しました");
    };
    document.head.appendChild(script);
  }, [environment, onError]);

  // SDK 初期化 + Card iframe アタッチ
  useEffect(() => {
    if (!sdkLoaded || !containerRef.current || !window.Square) return;

    let cancelled = false;

    // リダイレクト検知（SDK が勝手にページ遷移する場合をキャッチ）
    const origAssign = window.location.assign.bind(window.location);
    const origReplace = window.location.replace.bind(window.location);
    window.location.assign = (url: string) => {
      alert(`[DEBUG] SDK redirect detected (assign): ${url}`);
      origAssign(url);
    };
    window.location.replace = (url: string) => {
      alert(`[DEBUG] SDK redirect detected (replace): ${url}`);
      origReplace(url);
    };

    (async () => {
      try {
        const step1 = `payments() appId=${applicationId}, locId=${locationId}`;
        setDebugInfo(step1);
        alert(`[DEBUG] Step 1: ${step1}`);

        const payments = await window.Square!.payments(applicationId, locationId);
        setDebugInfo("payments() 成功。card() 呼び出し中...");
        alert("[DEBUG] Step 2: payments() 成功");

        const card = await payments.card();
        if (cancelled) return;
        setDebugInfo("card() 成功。attach() 呼び出し中...");
        alert("[DEBUG] Step 3: card() 成功");

        await card.attach(containerRef.current!);
        cardRef.current = card;
        setLoading(false);
        setDebugInfo("初期化完了 ✓");
        alert("[DEBUG] Step 4: attach() 成功 — 初期化完了");
      } catch (e: any) {
        if (!cancelled) {
          const errMsg = e?.message || "不明なエラー";
          const errType = e?.constructor?.name || "Error";
          const errStr = JSON.stringify({ type: errType, message: errMsg, keys: Object.keys(e || {}) });
          setDebugInfo(`初期化失敗: ${errStr}`);
          alert(`[DEBUG] 初期化エラー: ${errStr}`);
          onError(`カードフォーム初期化エラー: ${errMsg}`);
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
        onError(`カード検証失敗: status=${result.status}`);
      }
    } catch (e: any) {
      onError(e?.message || "カード情報の処理中にエラーが発生しました");
    }
  }, [onTokenize, onError]);

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium text-slate-700">カード情報を入力</p>

      {/* デバッグ情報（問題特定後に削除） */}
      <p className="text-[9px] text-blue-500 bg-blue-50 rounded px-2 py-1 font-mono">
        [DEBUG] {debugInfo}
      </p>

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
